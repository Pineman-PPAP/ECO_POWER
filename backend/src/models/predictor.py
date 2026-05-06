import os
import pandas as pd
import numpy as np
import joblib
import logging
from src.features.engineering import build_features, SOLAR_FEATURES, WIND_FEATURES

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(BASE_DIR, 'models', 'saved')

_models = {}

def get_model(plant_type: str):
    global _models
    if plant_type not in _models:
        model_name = f"{plant_type}_p50.pkl"
        model_path = os.path.join(MODELS_DIR, model_name)
        if os.path.exists(model_path):
            logger.info(f"Loading {plant_type} model from {model_path}")
            _models[plant_type] = joblib.load(model_path)
        else:
            logger.error(f"Model not found: {model_path}")
            return None
    return _models[plant_type]

def predict_generation(weather_dict: dict, plant: dict) -> list:
    """
    Unified prediction function for both solar and wind.
    """
    if not weather_dict:
        return []

    plant_type = plant.get('type', 'solar')
    model = get_model(plant_type)
    if not model:
        return []

    # 1. Map raw Open-Meteo to dataframe
    records = []
    for ts_str, metrics in weather_dict.items():
        records.append({
            'timestamp': pd.to_datetime(ts_str),
            'temperature_c': metrics.get('temperature_2m', 25.0),
            'humidity_pct': metrics.get('relative_humidity_2m', 50.0),
            'pressure_hpa': metrics.get('surface_pressure', 1013.0),
            'cloud_cover_pct': metrics.get('cloud_cover', 0.0),
            'wind_speed_ms': metrics.get('wind_speed_10m', 0.0),
            'wind_speed_80m': metrics.get('wind_speed_80m', metrics.get('wind_speed_10m', 0.0)),
            'wind_speed_120m': metrics.get('wind_speed_120m', metrics.get('wind_speed_100m', metrics.get('wind_speed_10m', 0.0))),
            'wind_direction_deg': metrics.get('wind_direction_10m', 0.0),
            'ghi_wm2': metrics.get('shortwave_radiation', 0.0),
            'plant_id': plant['id'],
            'plant_type': plant_type,
            'latitude': plant['latitude'],
            'longitude': plant['longitude'],
            'installed_capacity_mw': plant.get('ac_capacity_mw', plant.get('capacity_kw', 1000) / 1000.0),
            'hub_height_m': plant.get('hub_height_m', 0.0),
            'generation_mw': 0.0  # Placeholder for PLF calculation
        })
    
    df = pd.DataFrame(records)
    df.sort_values('timestamp', inplace=True)
    
    # 2. Build Features
    # Note: build_features handles SZA, U/V decomposition, hub-height correction, etc.
    df = build_features(df)
    
    # 3. Select Features based on plant type
    features = SOLAR_FEATURES if plant_type == 'solar' else WIND_FEATURES
    
    # Ensure all features exist (handle lags if empty)
    for col in features:
        if col not in df.columns:
            df[col] = 0.0
            
    # LightGBM scikit-learn wrapper is sensitive to column order and types.
    # Use model.feature_name_ to ensure we pass exactly what it expects in the right order.
    model_features = getattr(model, 'feature_name_', features)
    
    # Ensure all required features exist in df
    for col in model_features:
        if col not in df.columns:
            df[col] = 0.0
            
    X = df[model_features].copy()
    X = X.fillna(0.0) # Ensure no NaNs reach the model
    
    if 'plant_id' in X.columns:
        X['plant_id'] = X['plant_id'].astype('category')

    # 4. Inference (Predict PLF)
    try:
        plf_preds = model.predict(X)
    except Exception as e:
        logger.warning(f"Prediction failed with DataFrame, falling back to values: {e}")
        plf_preds = model.predict(X.values)
    
    # 5. Scale to MW and format output
    ac_cap_mw = plant.get('ac_capacity_mw', plant.get('capacity_kw', 1000) / 1000.0)
    live_predicted_mw = np.clip(plf_preds, 0, 1.0) * ac_cap_mw
    
    results = []
    for i, ts in enumerate(df['timestamp']):
        # Store in kW for consistency with DB schema
        kw_val = float(live_predicted_mw[i]) * 1000.0
        results.append({
            "timestamp": ts.to_pydatetime().replace(tzinfo=None),
            "predicted_kw": round(kw_val, 2)
        })
        
    return results

def predict_solar(weather_dict: dict, plant: dict) -> list:
    return predict_generation(weather_dict, plant)

def predict_wind(weather_dict: dict, plant: dict) -> list:
    return predict_generation(weather_dict, plant)
