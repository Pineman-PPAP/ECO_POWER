from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import lightgbm as lgb
import httpx
from pvlib import solarposition, irradiance, atmosphere
import os
from pathlib import Path

router = APIRouter()

# Setup paths relative to this file
# This will be used in production on Render
BASE_DIR = Path(__file__).parent.parent.parent.parent
MODEL_PATH = BASE_DIR / "scaled lightgbm example" / "synthetic_base_model.txt"

# Initialize Booster
if MODEL_PATH.exists():
    bst = lgb.Booster(model_file=str(MODEL_PATH))
    model_features = bst.feature_name()
else:
    bst = None
    model_features = []

def apply_solar_physics(df: pd.DataFrame, lat: float, lon: float, tilt: float, az: float) -> pd.DataFrame:
    # 1. Sun Position
    solpos = solarposition.get_solarposition(df.index, lat, lon)
    df['SZA'] = solpos['zenith']
    df['cos_SZA'] = np.cos(np.radians(df['SZA']))
    
    # 2. Geometric POA (Tilted Irradiance) 
    poa = irradiance.get_total_irradiance(
        surface_tilt=tilt,
        surface_azimuth=az,
        solar_zenith=solpos['apparent_zenith'],
        solar_azimuth=solpos['azimuth'],
        dni=df['DNI'],
        ghi=df['GHI'],
        dhi=df['DHI']
    )
    df['GHI'] = poa['poa_global'].fillna(0)
    
    # 3. Standard Features
    df['hour_sin'] = np.sin(2 * np.pi * df.index.hour / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df.index.hour / 24)
    df['AM_relative'] = atmosphere.get_relative_airmass(solpos['zenith'])
    df['GHI_lag1'] = df['GHI'].shift(1).fillna(0)
    
    # Mock operational variables
    df['rolling_gen_efficiency'] = 0.85 
    df['rolling_PR_proxy'] = 0.80
    df['Shading_Flag'] = 0
    
    for col in model_features:
        if col not in df.columns: df[col] = 0.0
            
    return df

class PlantRequest(BaseModel):
    latitude: float
    longitude: float
    dc_capacity_mw: float
    ac_capacity_mw: float
    tilt: float
    azimuth: float

@router.post("/live-prediction")
async def get_live_prediction(plant: PlantRequest):
    if bst is None:
        raise HTTPException(status_code=500, detail="Model file not found")

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": plant.latitude, "longitude": plant.longitude,
        "hourly": "temperature_2m,cloud_cover,shortwave_radiation,direct_normal_irradiance,diffuse_radiation",
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
    live_df = pd.DataFrame({
        'datetime': pd.to_datetime(data['hourly']['time']).tz_localize('Asia/Kolkata'),
        'Temperature': data['hourly']['temperature_2m'],
        'TCC': np.array(data['hourly']['cloud_cover']) / 100.0,
        'GHI': data['hourly']['shortwave_radiation'],
        'DNI': data['hourly']['direct_normal_irradiance'],
        'DHI': data['hourly']['diffuse_radiation'],
    }).set_index('datetime')
    
    # Apply Physics Pipeline
    live_df = apply_solar_physics(live_df, plant.latitude, plant.longitude, plant.tilt, plant.azimuth)

    BASE_MODEL_DC = 50.0
    
    raw_preds = bst.predict(live_df[model_features])
    contribs = bst.predict(live_df[model_features], pred_contrib=True)
    
    # Apply Night Mask
    raw_preds[live_df['SZA'] > 88] = 0.0 
    
    # Scaling Logic
    scaled_dc_output = (raw_preds / BASE_MODEL_DC) * plant.dc_capacity_mw
    live_df['Live_Predicted_MW'] = np.clip(scaled_dc_output, 0, plant.ac_capacity_mw) 
    
    # Format Payload
    payload = []
    scale_factor = plant.dc_capacity_mw / BASE_MODEL_DC
    
    # Indices for SHAP
    ghi_idx = model_features.index('GHI') if 'GHI' in model_features else 0
    tcc_idx = model_features.index('TCC') if 'TCC' in model_features else 0

    for ts, row in live_df.iterrows():
        idx = live_df.index.get_loc(ts)
        payload.append({
            "timestamp": ts.isoformat(),
            "pred_mw": round(row['Live_Predicted_MW'], 2), 
            "weather_ghi": round(row['GHI'], 0),
            "contrib_ghi": round(contribs[idx][ghi_idx] * scale_factor, 2),
            "contrib_clouds": round(contribs[idx][tcc_idx] * scale_factor, 2)
        })
        
    return payload
