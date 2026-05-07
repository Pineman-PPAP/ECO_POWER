"""
feeder.py — Data Feeder for Representation Purpose
Clock-Sync Mode: Syncs with system time to feed provided CSV data.
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
NWP_CSV = DATA_DIR / "raw" / "nwp_weather.csv"
# Master CSV for Hackathon (User provided)
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

def run_feeder():
    """
    Clock-Sync Mode:
    1. Checks for hackathon_master_data.csv.
    2. Matches the current system time (rounded to 15m) with the CSV timestamp.
    3. Feeds the exact 'Actual' values to the database.
    """
    log.info("── Feeder cycle starting (Clock-Sync Mode) ────────────────")
    init_db()

    # Determine which file to use
    source_file = MASTER_CSV if MASTER_CSV.exists() else SCADA_CSV
    
    if not source_file.exists():
        log.error(f"No source CSV found at {source_file}")
        return

    try:
        df = pd.read_csv(source_file)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['plant_type'] = df.get('plant_type', pd.Series(['solar']*len(df))).str.lower().str.strip()
        
        # Get current time rounded to nearest 15 mins
        now = datetime.now()
        rounded_now = now.replace(minute=(now.minute // 15) * 15, second=0, microsecond=0)
        
        # Filter for rows matching EXACTLY the current time in the CSV
        recent_df = df[df['timestamp'] == rounded_now].copy()
        
        if recent_df.empty:
            log.warning(f"No data found in {source_file.name} for timestamp {rounded_now}")
            # Fallback: find the closest previous timestamp
            past_df = df[df['timestamp'] <= rounded_now]
            if not past_df.empty:
                latest_ts = past_df['timestamp'].max()
                recent_df = df[df['timestamp'] == latest_ts].copy()
                log.info(f"Falling back to latest available data from {latest_ts}")
            else:
                log.error("No past data available to fallback to.")
                return

        scraped_at = now.isoformat(timespec="seconds")
        sldc_ts = rounded_now.strftime("%d/%m/%Y %H:%M")
        
        # 1. Aggregate for default_readings (State-wide)
        solar_gen = recent_df[recent_df['plant_type'] == 'solar']['generation_mw'].sum()
        wind_gen = recent_df[recent_df['plant_type'] == 'wind']['generation_mw'].sum()
        
        # Use values from CSV if available, otherwise generate dummy
        thermal_gen = recent_df['thermal_mw'].sum() if 'thermal_mw' in recent_df.columns else 4500
        hydro_gen = recent_df['hydro_mw'].sum() if 'hydro_mw' in recent_df.columns else 1200
        state_demand = recent_df['demand_mw'].sum() if 'demand_mw' in recent_df.columns else (thermal_gen + hydro_gen + solar_gen + wind_gen)
        
        default_rec = {
            "scraped_at": scraped_at,
            "sldc_ts": sldc_ts,
            "frequency": recent_df['frequency'].iloc[0] if 'frequency' in recent_df.columns else 50.0,
            "state_ui_mw": 0.0,
            "state_demand_mw": state_demand,
            "thermal_mw": thermal_gen,
            "thermal_ipp_mw": 800,
            "hydro_mw": hydro_gen,
            "wind_mw": wind_gen,
            "solar_mw": solar_gen,
            "other_mw": 200,
            "total_generation_mw": solar_gen + wind_gen + thermal_gen + hydro_gen,
            "pavagada_solar_mw": solar_gen * 0.4,
            "central_gen_mw": 2500
        }
        
        # 2. Persist to DB (for SLDC Dashboard Endpoints)
        try:
            con = sqlite3.connect(DB_PATH)
            pd.DataFrame([default_rec]).to_sql("default_readings", con, if_exists="append", index=False)
            
            # Map NCEP (Zones)
            escoms = ["BESCOM", "MESCOM", "CESC", "GESCOM", "HESCOM"]
            ncep_recs = []
            for escom in escoms:
                share = 1.0 / len(escoms)
                ncep_recs.append({
                    "scraped_at": scraped_at, "sldc_ts": sldc_ts, "frequency": default_rec["frequency"],
                    "escom": escom, "biomass_mw": 10*share, "cogen_mw": 50*share, "minihydro_mw": 100*share,
                    "wind_mw": wind_gen * share, "solar_mw": solar_gen * share, "grid_drawal_mw": state_demand * share,
                    "total_mw": (solar_gen + wind_gen) * share
                })
            pd.DataFrame(ncep_recs).to_sql("ncep_readings", con, if_exists="append", index=False)
            
            con.commit()
            con.close()
            log.info(f"Feeder persisted Clock-Sync data: {sldc_ts} | solar={solar_gen:.1f}MW")
        except Exception as db_err:
            log.warning(f"Failed to persist to DB: {db_err}")

        # 3. Feed raw CSVs for Retraining/Inference
        try:
            # Append this exact row to scada_generation.csv
            recent_df.to_csv(SCADA_CSV, mode="a", header=False, index=False)
            log.info(f"Appended real-time row to {SCADA_CSV.name}")
        except Exception as csv_err:
            log.warning(f"Failed to append to raw CSV: {csv_err}")

    except Exception as e:
        log.exception(f"Feeder cycle failed: {e}")

    log.info("── Feeder cycle complete ──────────────────────────────")

if __name__ == "__main__":
    while True:
        run_feeder()
        time.sleep(60)
