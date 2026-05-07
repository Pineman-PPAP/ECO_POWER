from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import lightgbm as lgb
import httpx
import os
from pathlib import Path
from src.features.engineering import build_features, SOLAR_FEATURES

router = APIRouter()

# Setup paths relative to this file
BASE_DIR = Path(__file__).parent.parent.parent.parent
MODEL_PATH = BASE_DIR / "scaled lightgbm example" / "synthetic_base_model.txt"

# Initialize Booster
if MODEL_PATH.exists():
    try:
        bst = lgb.Booster(model_file=str(MODEL_PATH))
        model_features = bst.feature_name()
    except Exception as e:
        print(f"Error loading model: {e}")
        bst = None
        model_features = []
else:
    bst = None
    model_features = []

class PlantRequest(BaseModel):
    latitude: float
    longitude: float
    dc_capacity_mw: float
    ac_capacity_mw: float
    tilt: float
    azimuth: float
    id: str = "live_plant" # Default ID for feature engineering

@router.post("/live-prediction")
async def get_live_prediction(plant: PlantRequest):
    if bst is None:
        raise HTTPException(status_code=500, detail="Model file not found or invalid")

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": plant.latitude, "longitude": plant.longitude,
        "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,cloud_cover,shortwave_radiation,direct_normal_irradiance,diffuse_radiation",
        "timezone": "Asia/Kolkata", "forecast_days": 2
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Weather API Connection Error: {str(e)}")
    
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Weather API Failure")
    
    data = resp.json()
    
    # Standardize data for build_features
    records = []
    times = data['hourly']['time']
    for i in range(len(times)):
        records.append({
            'timestamp': pd.to_datetime(times[i]),
            'temperature_c': data['hourly']['temperature_2m'][i],
            'humidity_pct': data['hourly']['relative_humidity_2m'][i],
            'pressure_hpa': data['hourly']['surface_pressure'][i],
            'cloud_cover_pct': data['hourly']['cloud_cover'][i],
            'ghi_wm2': data['hourly']['shortwave_radiation'][i],
            'latitude': plant.latitude,
            'longitude': plant.longitude,
            'plant_id': plant.id,
            'plant_type': 'solar',
            'installed_capacity_mw': plant.dc_capacity_mw,
            'generation_mw': 0.0 # Placeholder
        })
    
    live_df = pd.DataFrame(records)
    
    # Apply Standardized Feature Engineering
    live_df = build_features(live_df)
    
    # Ensure all model features exist
    for col in model_features:
        if col not in live_df.columns:
            live_df[col] = 0.0
            
    # Prepare inference data
    X = live_df[model_features].copy()
    
    # Handle categorical features
    if 'plant_id' in X.columns:
        X['plant_id'] = X['plant_id'].astype('category')
    
    # 4. Inference
    try:
        raw_preds_plf = bst.predict(X)
        contribs = bst.predict(X, pred_contrib=True)
    except Exception as e:
        # Fallback to values if Pandas categorical matching fails
        raw_preds_plf = bst.predict(X.values)
        contribs = bst.predict(X.values, pred_contrib=True)
    
    # Scaling Logic
    # The model predicts PLF (0-1)
    live_df['Live_Predicted_MW'] = np.clip(raw_preds_plf, 0, 1.0) * plant.dc_capacity_mw
    # Clip to AC capacity
    live_df['Live_Predicted_MW'] = live_df['Live_Predicted_MW'].clip(0, plant.ac_capacity_mw)
    
    # Format Payload
    payload = []
    
    # Indices for SHAP
    ghi_idx = model_features.index('ghi_wm2') if 'ghi_wm2' in model_features else -1
    tcc_idx = model_features.index('cloud_cover_pct') if 'cloud_cover_pct' in model_features else -1

    for i, row in live_df.iterrows():
        payload.append({
            "timestamp": row['timestamp'].isoformat(),
            "pred_mw": round(row['Live_Predicted_MW'], 2), 
            "weather_ghi": round(row['ghi_wm2'], 0),
            "contrib_ghi": round(float(contribs[i][ghi_idx]) * plant.dc_capacity_mw, 2) if ghi_idx >= 0 else 0,
            "contrib_clouds": round(float(contribs[i][tcc_idx]) * plant.dc_capacity_mw, 2) if tcc_idx >= 0 else 0
        })
        
    return payload
