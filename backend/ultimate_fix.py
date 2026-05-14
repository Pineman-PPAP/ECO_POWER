
import os
import sys
import pandas as pd
import sqlite3
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Add src to path
sys.path.append(os.getcwd())

from src.config.plants import get_plants
from src.features.weather_fetcher import fetch_historical_weather
from src.models.predictor import predict_solar, predict_wind

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MASTER_CSV = Path("../hackathon_master_data.csv")
DB_PATH = "dashboard.db"

def recreate_db():
    logger.info("Recreating generation_data table with MW columns...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS generation_data")
    cur.execute("""
        CREATE TABLE generation_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id TEXT,
            timestamp DATETIME,
            actual_mw REAL,
            predicted_mw REAL,
            zone_label TEXT,
            reason TEXT,
            UNIQUE(plant_id, timestamp)
        )
    """)
    cur.execute("CREATE INDEX idx_plant_ts ON generation_data(plant_id, timestamp)")
    conn.commit()
    conn.close()

def get_col_val_mw(row, base_name):
    """MW Focused column extraction."""
    if f"{base_name}_mw" in row: return float(row[f"{base_name}_mw"])
    if f"{base_name}_kw" in row: return float(row[f"{base_name}_kw"]) / 1000.0
    return 0.0

def run_ultimate_fix():
    if not MASTER_CSV.exists():
        logger.error(f"Master CSV not found at {MASTER_CSV}")
        return

    recreate_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    logger.info("Loading master CSV (MW)...")
    df = pd.read_csv(MASTER_CSV)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    plants = get_plants()
    now = datetime.now()

    for plant in plants:
        plant_id = plant['id']
        logger.info(f"--- Processing Plant: {plant_id} (MW) ---")
        
        plant_csv = df[df['plant_id'] == plant_id]
        if plant_csv.empty: continue

        # Fetch Weather
        weather_data = fetch_historical_weather(
            plant_id, plant['latitude'], plant['longitude'],
            "2026-05-01", "2026-05-07" # Limit to past for speed
        )

        predictions = {}
        if weather_data:
            logger.info(f"Predicting...")
            try:
                preds_list = predict_solar(weather_data, plant) if plant['type'] == 'solar' else predict_wind(weather_data, plant)
                for p in preds_list:
                    # predict_generation returns kW currently in src/models/predictor.py
                    # We need to convert it to MW for our new schema
                    predictions[p['timestamp'].strftime("%Y-%m-%d %H:%M:%S")] = p['predicted_kw'] / 1000.0
            except Exception as e:
                logger.error(f"Prediction failed for {plant_id}: {e}")

        # Prepare Batch
        records = []
        seen_ts = set()
        
        for _, row in plant_csv.iterrows():
            ts = row['timestamp']
            ts_str = ts.strftime("%Y-%m-%d %H:%M:%S")
            if ts_str in seen_ts: continue
            seen_ts.add(ts_str)

            if ts < now.replace(hour=0, minute=0, second=0): zone = "zone1"
            elif ts < now: zone = "zone2"
            else: zone = "zone3"

            actual_mw = get_col_val_mw(row, 'generation')
            
            # Prediction Lookup: 
            # 1. Try CSV pre-calculated prediction (for realistic demo errors)
            if 'generation_p50_mw' in row:
                pred_mw = float(row['generation_p50_mw'])
            elif 'predicted_mw' in row:
                pred_mw = float(row['predicted_mw'])
            else:
                # 2. Fallback to Model Prediction
                pred_mw = predictions.get(ts_str)
                if pred_mw is None:
                    hourly_str = ts.replace(minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")
                    pred_mw = predictions.get(hourly_str, 0.0)

            reason = row.get('reason', 'Steady generation')
            records.append((plant_id, ts_str, actual_mw, pred_mw, zone, reason))

        logger.info(f"Inserting {len(records)} records (MW)...")
        cur.executemany("""
            INSERT OR REPLACE INTO generation_data (plant_id, timestamp, actual_mw, predicted_mw, zone_label, reason)
            VALUES (?, ?, ?, ?, ?, ?)
        """, records)
        conn.commit()

    conn.close()
    logger.info("Ultimate Fix (MW) Complete!")

if __name__ == "__main__":
    run_ultimate_fix()
