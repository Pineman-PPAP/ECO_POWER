import pandas as pd
import sqlite3
import logging
from pathlib import Path
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
DASHBOARD_DB = BASE_DIR / "dashboard.db"
SLDC_DB = BASE_DIR / "data" / "karnataka_solar.db"
MASTER_CSV = BASE_DIR.parent / "hackathon_master_data.csv"

def refresh_data():
    if not MASTER_CSV.exists():
        logger.error(f"Master CSV not found at {MASTER_CSV}")
        return

    logger.info(f"Reading Master CSV: {MASTER_CSV} (MW Mode)")
    df = pd.read_csv(MASTER_CSV)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # 1. Update dashboard.db (Plant-level actuals in MW)
    logger.info("Updating dashboard.db (generation_data)...")
    conn_dash = sqlite3.connect(DASHBOARD_DB)
    cur = conn_dash.cursor()

    def get_mw_val(row):
        if 'generation_mw' in row: return float(row['generation_mw'])
        if 'generation_kw' in row: return float(row['generation_kw']) / 1000.0
        if 'power_output_mw' in row: return float(row['power_output_mw'])
        return 0.0

    for plant_id, plant_df in df.groupby('plant_id'):
        logger.info(f"Processing plant: {plant_id}")
        for _, row in plant_df.iterrows():
            ts_str = row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            val_mw = get_mw_val(row)
            
            # Use INSERT OR REPLACE if the table has unique constraint
            cur.execute("""
                INSERT INTO generation_data (plant_id, timestamp, actual_mw, predicted_mw, zone_label)
                VALUES (?, ?, ?, 0.0, 'zone1')
                ON CONFLICT(plant_id, timestamp) DO UPDATE SET actual_mw = excluded.actual_mw
            """, (plant_id, ts_str, val_mw))
            
    conn_dash.commit()
    conn_dash.close()

    # 2. Update karnataka_solar.db (SLDC-level totals in MW)
    logger.info("Updating karnataka_solar.db (default_readings)...")
    conn_sldc = sqlite3.connect(SLDC_DB)
    cur_sldc = conn_sldc.cursor()
    
    # Group by timestamp to get state-wide totals
    for ts, ts_df in df.groupby('timestamp'):
        ts_dt = pd.to_datetime(ts)
        
        # State-level aggregates
        solar_mw = ts_df[ts_df['plant_type'].str.lower().str.contains('solar', na=False)].apply(get_mw_val, axis=1).sum()
        wind_mw = ts_df[ts_df['plant_type'].str.lower().str.contains('wind', na=False)].apply(get_mw_val, axis=1).sum()
        
        # Take thermal/demand from the first row available for that timestamp
        first_row = ts_df.iloc[0]
        thermal_mw = get_mw_val(first_row.get('thermal', {})) or 4500.0
        hydro_mw = get_mw_val(first_row.get('hydro', {})) or 1200.0
        demand_mw = get_mw_val(first_row.get('demand', {})) or (thermal_mw + hydro_mw + solar_mw + wind_mw)
        freq = first_row.get('frequency', 50.0)
        total_gen = solar_mw + wind_mw + thermal_mw + hydro_mw

        ts_str = ts_dt.strftime('%d/%m/%Y %H:%M')
        scraped_at = ts_dt.isoformat()
        
        cur_sldc.execute("DELETE FROM default_readings WHERE sldc_ts = ?", (ts_str,))
        cur_sldc.execute("""
            INSERT INTO default_readings 
            (scraped_at, sldc_ts, frequency, state_ui_mw, state_demand_mw, thermal_mw, thermal_ipp_mw, hydro_mw, wind_mw, solar_mw, other_mw, total_generation_mw, pavagada_solar_mw, central_gen_mw)
            VALUES (?, ?, ?, 0.0, ?, ?, 700.0, ?, ?, ?, 200.0, ?, ?, 2500.0)
        """, (scraped_at, ts_str, freq, demand_mw, thermal_mw, hydro_mw, wind_mw, solar_mw, total_gen, solar_mw*0.4))
            
    conn_sldc.commit()
    conn_sldc.close()
    logger.info("Refresh complete (MW)!")

if __name__ == "__main__":
    refresh_data()
