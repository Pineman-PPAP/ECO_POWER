"""
feeder.py — Data Feeder for Representation Purpose
Clock-Sync Mode: Syncs with system time to feed provided CSV data.
Units: MW
"""

import pandas as pd
import sqlite3
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
import random

# Paths
BASE_DIR = Path(__file__).parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "karnataka_solar.db"
SCADA_CSV = DATA_DIR / "raw" / "scada_generation.csv"
MASTER_CSV = BASE_DIR / "hackathon_master_data.csv" 

# Logging
log = logging.getLogger("data_feeder")
if not log.handlers:
    log.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s  %(levelname)-8s  %(message)s")
    sh = logging.StreamHandler()
    sh.setFormatter(formatter)
    log.addHandler(sh)

def init_db():
    """Ensure DB tables exist."""
    from src.data.scraper import init_db as scraper_init
    scraper_init()

def get_val(row, base):
    """MW-first robust extraction."""
    for suffix in ['_mw', '_kw', '']:
        col = f"{base}{suffix}"
        if col in row:
            val = float(row[col])
            return val / 1000.0 if suffix == '_kw' else val
    return 0.0

def run_feeder():
    log.info("── Feeder cycle starting (Clock-Sync Mode - MW) ────────────────")
    init_db()

    source_file = MASTER_CSV if MASTER_CSV.exists() else SCADA_CSV
    if not source_file.exists():
        log.error(f"No source CSV found at {source_file}")
        return

    try:
        df = pd.read_csv(source_file)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Get current time rounded to nearest 15 mins
        now = datetime.now()
        rounded_now = now.replace(minute=(now.minute // 15) * 15, second=0, microsecond=0)
        
        # Filter for rows matching EXACTLY the current time in the CSV
        recent_df = df[df['timestamp'] == rounded_now].copy()
        
        if recent_df.empty:
            log.warning(f"No data found in {source_file.name} for timestamp {rounded_now}")
            past_df = df[df['timestamp'] <= rounded_now]
            if not past_df.empty:
                latest_ts = past_df['timestamp'].max()
                recent_df = df[df['timestamp'] == latest_ts].copy()
            else:
                log.error("No data available.")
                return

        # Aggregates
        latest_row = recent_df.iloc[0] # Just take one row for state-level keys if needed
        # But usually we sum by plant_type for state-level totals
        solar_gen = recent_df[recent_df['plant_type'].str.lower().str.contains('solar', na=False)].apply(lambda r: get_val(r, 'generation'), axis=1).sum()
        wind_gen = recent_df[recent_df['plant_type'].str.lower().str.contains('wind', na=False)].apply(lambda r: get_val(r, 'generation'), axis=1).sum()
        
        total_gen = get_val(latest_row, 'generation')
        if total_gen == 0: total_gen = solar_gen + wind_gen

        thermal_mw = get_val(latest_row, 'thermal') or 4500.0
        hydro_mw = get_val(latest_row, 'hydro') or 1200.0
        demand_mw = get_val(latest_row, 'demand') or (thermal_mw + hydro_mw + solar_gen + wind_gen)

        default_rec = {
            "scraped_at": now.isoformat(timespec="seconds"),
            "sldc_ts": rounded_now.strftime("%d/%m/%Y %H:%M"),
            "frequency": latest_row.get('frequency', 50.0),
            "state_ui_mw": 0.0,
            "state_demand_mw": demand_mw,
            "thermal_mw": thermal_mw,
            "thermal_ipp_mw": 800,
            "hydro_mw": hydro_mw,
            "wind_mw": wind_gen,
            "solar_mw": solar_gen,
            "other_mw": 200,
            "total_generation_mw": total_gen,
            "pavagada_solar_mw": recent_df[recent_df['plant_id'] == 'kspdcl_pavagada'].apply(lambda r: get_val(r, 'generation'), axis=1).sum() or (solar_gen * 0.4),
            "central_gen_mw": 2500
        }
        
        con = sqlite3.connect(DB_PATH)
        pd.DataFrame([default_rec]).to_sql("default_readings", con, if_exists="append", index=False)
        con.commit()
        con.close()
        log.info(f"Feeder persisted Clock-Sync data: {rounded_now} | solar={solar_gen:.1f}MW")

    except Exception as e:
        log.exception(f"Feeder cycle failed: {e}")

if __name__ == "__main__":
    while True:
        run_feeder()
        time.sleep(60)
