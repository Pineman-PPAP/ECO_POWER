
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
from pathlib import Path

# Config
PLANTS = [
    {"id": "kpcl_shivanasamudra", "type": "solar", "cap": 15.0, "lat": 12.30, "lon": 77.17},
    {"id": "kpcl_yalesandra", "type": "solar", "cap": 3.0, "lat": 12.89, "lon": 78.16},
    {"id": "kpcl_itnal", "type": "solar", "cap": 3.0, "lat": 16.43, "lon": 74.67},
    {"id": "kpcl_yapaldinni", "type": "solar", "cap": 3.0, "lat": 16.24, "lon": 77.44},
    {"id": "kspdcl_pavagada", "type": "solar", "cap": 2050.0, "lat": 14.25, "lon": 77.45},
    {"id": "wind_tuppadahalli", "type": "wind", "cap": 56.1, "lat": 14.20, "lon": 76.43},
    {"id": "wind_bannur", "type": "wind", "cap": 78.0, "lat": 16.83, "lon": 75.72},
    {"id": "wind_jogmatti", "type": "wind", "cap": 14.0, "lat": 14.10, "lon": 76.39},
    {"id": "wind_bijapur", "type": "wind", "cap": 50.0, "lat": 16.75, "lon": 75.90},
    {"id": "wind_gadag", "type": "wind", "cap": 302.4, "lat": 15.42, "lon": 75.62},
    {"id": "wind_mangoli", "type": "wind", "cap": 46.0, "lat": 16.55, "lon": 76.20},
    {"id": "wind_tata_power", "type": "wind", "cap": 50.4, "lat": 15.35, "lon": 75.58},
    {"id": "wind_clp", "type": "wind", "cap": 50.0, "lat": 16.14, "lon": 74.83}
]

START_DATE = datetime(2026, 5, 7)
END_DATE = datetime(2026, 5, 25)
FILE_NAME = "../hackathon_master_data.csv"

def generate_data():
    timestamps = pd.date_range(start=START_DATE, end=END_DATE, freq='15min')
    data = []

    print(f"Generating data for {len(timestamps)} intervals across {len(PLANTS)} plants...")

    for plant in PLANTS:
        p_id = plant['id']
        p_type = plant['type']
        cap = plant['cap']
        
        # Base generation profile
        if p_type == 'solar':
            # Solar: Sinusoidal with noon peak - Much Smoother
            hours = timestamps.hour + timestamps.minute / 60.0
            solar_curve = np.maximum(0, np.sin((hours - 6) * np.pi / 12))
            # 2% noise instead of 10%
            actuals = solar_curve * cap * (0.95 + 0.02 * np.random.randn(len(timestamps)))
            actuals = np.clip(actuals, 0, cap)
        else:
            # Wind: Smooth Random Walk
            current = cap * 0.4
            actuals = []
            for _ in range(len(timestamps)):
                current += cap * 0.01 * np.random.randn() # Smaller steps
                current = np.clip(current, cap * 0.1, cap * 0.9)
                actuals.append(current)
            actuals = np.array(actuals)

        # Predictions: Dramatic AI "Chasing" Logic (10-15% Error)
        # Making the error highly visible for the demo
        preds = []
        curr_pred = actuals[0]
        # Aggressive bias for high visibility
        p_bias = random.uniform(0.85, 1.15) 
        
        for a in actuals:
            # Model lags and adjusts with high jitter
            jitter = cap * 0.03 * np.random.randn()
            curr_pred = (0.8 * curr_pred + 0.2 * (a * p_bias)) + jitter
            preds.append(np.clip(curr_pred, 0, cap))
        
        final_preds = np.array(preds)

        # Build rows
        for i, ts in enumerate(timestamps):
            reason = "Optimal weather conditions"
            
            # Inject Events/Errors
            h = ts.hour
            # Solar Anomaly: 11 AM - 1 PM occasional cloud
            if p_type == 'solar' and 11 <= h <= 13 and random.random() < 0.1:
                actuals[i] *= 0.7
                reason = "Localized cloud cover causing irradiance dip"
            
            # Solar Spike: Noon peak efficiency
            if p_type == 'solar' and h == 12 and actuals[i] > cap * 0.8:
                reason = "Peak solar irradiance; high efficiency"

            # Wind Anomaly: Sudden gust or turbulence
            if p_type == 'wind' and random.random() < 0.05:
                actuals[i] *= 1.2 # Spike
                reason = "High-altitude wind gust detected"
            elif p_type == 'wind' and random.random() < 0.03:
                actuals[i] *= 0.5 # Drop
                reason = "Unpredicted low-level turbulence; stalling"
                
            # Error Injection (Prediction missed the spike)
            final_pred = preds[i]
            if "gust" in reason or "cloud" in reason:
                # Prediction stays smooth while actual spikes/dips
                pass
            else:
                # Normal track
                final_pred = actuals[i] * (1 + bias) + cap * noise_lvl * np.random.randn()

            # State level totals
            demand_base = 11000 + 2000 * np.sin((h - 18) * np.pi / 12)
            demand = demand_base + 500 * np.random.randn()
            thermal = 6000 + 500 * np.random.randn()
            hydro = 2000 + 300 * np.random.randn()
            freq = 49.9 + 0.2 * random.random()

            data.append({
                'timestamp': ts.strftime('%Y-%m-%d %H:%M:%S'),
                'plant_id': p_id,
                'plant_type': p_type,
                'installed_capacity_mw': cap,
                'generation_mw': round(actuals[i], 4),
                'generation_p50_mw': round(final_pred, 4),
                'reason': reason,
                'ghi_wm2': round(800 * solar_curve[i] + 50 * random.random(), 2) if p_type == 'solar' else 0,
                'cloud_cover_pct': random.randint(0, 100),
                'temperature_c': round(25 + 10 * np.sin((h - 10) * np.pi / 12) + random.random(), 2),
                'wind_speed_ms': round(5 + 10 * (actuals[i]/cap) + random.random(), 2) if p_type == 'wind' else random.uniform(1, 5),
                'wind_direction_deg': random.randint(0, 359),
                'humidity_pct': random.randint(30, 80),
                'pressure_hpa': 1010 + random.randint(-5, 5),
                'latitude': plant['lat'],
                'longitude': plant['lon'],
                'hub_height_m': 80 if p_type == 'wind' else 0,
                'thermal_mw': round(thermal, 2),
                'hydro_mw': round(hydro, 2),
                'demand_mw': round(demand, 2),
                'frequency': round(freq, 3)
            })

    df = pd.DataFrame(data)
    df.to_csv(FILE_NAME, index=False)
    print(f"Successfully generated demo data at {FILE_NAME}")

if __name__ == "__main__":
    generate_data()
