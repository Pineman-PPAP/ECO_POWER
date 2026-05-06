import os
import pandas as pd
import numpy as np
import lightgbm as lgb
from src.models.physics import apply_solar_physics

# The file is in backend/src/models/predictor.py
# We want to go up to backend/, and then up to ECO_POWER/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_PATH = os.path.join(BASE_DIR, 'solar_lightgbm.txt')
BASE_MODEL_DC = 50.0  # MW, baseline the model was trained on

_bst = None
_model_features = None

def get_model():
    global _bst, _model_features
    if _bst is None:
        _bst = lgb.Booster(model_file=MODEL_PATH)
        _model_features = _bst.feature_name()
    return _bst, _model_features

def predict_solar(weather_dict: dict, plant: dict) -> list:
    """
    Predicts solar generation given a dictionary of raw open-meteo hourly data.
    weather_dict format: {"2026-05-06T10:00": {"temperature_2m": ..., "shortwave_radiation": ...}, ...}
    Returns a list of {"timestamp": dt, "predicted_kw": kw}
    """
    if not weather_dict:
        return []

    # Map raw Open-Meteo to dataframe
    records = []
    for ts_str, metrics in weather_dict.items():
        records.append({
            'datetime': pd.to_datetime(ts_str).tz_localize('Asia/Kolkata') if pd.to_datetime(ts_str).tz is None else pd.to_datetime(ts_str),
            'Temperature': metrics.get('temperature_2m', 0),
            'Dew_Point': metrics.get('dewpoint_2m', 0),
            'Relative_Humidity': metrics.get('relative_humidity_2m', 0),
            'Pressure': metrics.get('surface_pressure', 0),
            'TCC': metrics.get('cloud_cover', 0) / 100.0,
            'Low_Cloud': metrics.get('cloud_cover_low', 0) / 100.0,
            'Mid_Cloud': metrics.get('cloud_cover_mid', 0) / 100.0,
            'High_Cloud': metrics.get('cloud_cover_high', 0) / 100.0,
            'Wind_Speed': metrics.get('wind_speed_10m', 0),
            'GHI': metrics.get('shortwave_radiation', 0),
            'DNI': metrics.get('direct_normal_irradiance', 0) if 'direct_normal_irradiance' in metrics else metrics.get('shortwave_radiation', 0)*0.8,
            'DHI': metrics.get('diffuse_radiation', 0) if 'diffuse_radiation' in metrics else metrics.get('shortwave_radiation', 0)*0.2,
            'plant_id': plant['id']
        })
    df = pd.DataFrame(records).set_index('datetime')
    df.sort_index(inplace=True)
    
    # Apply Physics Pipeline
    bst, features = get_model()
    df = apply_solar_physics(df, plant['latitude'], plant['longitude'], plant['tilt'], plant['azimuth'], model_features=features)

    # Inference
    raw_preds = bst.predict(df[features])
    
    # Apply Night Mask
    raw_preds[df['SZA'] > 88] = 0.0 
    
    # PGML Scaling Logic
    dc_cap_mw = plant['dc_capacity_mw']
    ac_cap_mw = plant['ac_capacity_mw']
    
    scaled_dc_output = (raw_preds / BASE_MODEL_DC) * dc_cap_mw
    
    # Enforce AC Inverter Limit
    live_predicted_mw = np.clip(scaled_dc_output, 0, ac_cap_mw)
    
    results = []
    for i, ts in enumerate(df.index):
        # Convert back to native python float, store in kW for consistency with DB schema
        kw_val = float(live_predicted_mw[i]) * 1000.0
        results.append({
            "timestamp": ts.to_pydatetime().replace(tzinfo=None),
            "predicted_kw": round(kw_val, 2)
        })
        
    return results
