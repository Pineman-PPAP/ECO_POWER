import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import pandas as pd
from sqlalchemy import delete

from src.data.database import SessionLocal, GenerationData
from src.config.plants import get_plants
from src.features.weather_fetcher import fetch_forecast_weather
from src.models.synthetic_actual import generate_solar_actual, generate_wind_actual
from src.models.predictor import predict_solar, predict_wind
from src.jobs.backfill import interpolate_weather_to_15min, run_backfill
from src.data.feeder import run_feeder, MASTER_CSV

logger = logging.getLogger(__name__)

def run_15min_job():
    logger.info("Running 15-minute live fetch job (MW)...")
    db = SessionLocal()
    try:
        plants = get_plants()
        now = datetime.now()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        two_hours_ahead = now + timedelta(hours=24)
        
        # Load Master CSV if available for actuals
        master_df = None
        if MASTER_CSV.exists():
            try:
                master_df = pd.read_csv(MASTER_CSV)
                master_df['timestamp'] = pd.to_datetime(master_df['timestamp'])
            except Exception as e:
                logger.warning(f"Failed to load master CSV: {e}")

        def get_mw_val(r):
            if 'generation_mw' in r: return float(r['generation_mw'])
            if 'generation_kw' in r: return float(r['generation_kw']) / 1000.0
            if 'power_output_mw' in r: return float(r['power_output_mw'])
            return 0.0

        for plant in plants:
            plant_id = plant['id']
            hourly_weather = fetch_forecast_weather(plant_id, plant['latitude'], plant['longitude'], forecast_days=2)
            if not hourly_weather: continue
                
            weather_15min = interpolate_weather_to_15min(hourly_weather)
            filtered_weather = {
                ts: data for ts, data in weather_15min.items() 
                if start_of_today <= datetime.fromisoformat(ts).replace(tzinfo=None) <= two_hours_ahead
            }
            if not filtered_weather: continue

            # Predictions (models return kW, convert to MW)
            preds_list = predict_solar(filtered_weather, plant) if plant['type'] == 'solar' else predict_wind(filtered_weather, plant)
            pred_dict = {p['timestamp']: p['predicted_kw'] / 1000.0 for p in preds_list}
            
            # Actuals
            actual_records = []
            if master_df is not None:
                plant_data = master_df[master_df['plant_id'] == plant_id]
                actual_records = [
                    {"timestamp": ts, "actual_mw": get_mw_val(row)}
                    for ts, row in plant_data.set_index('timestamp').iterrows()
                ]
            else:
                # Fallback to synthetic (converts kW to MW)
                synth = generate_solar_actual(filtered_weather, plant) if plant['type'] == 'solar' else generate_wind_actual(filtered_weather, plant)
                actual_records = [{"timestamp": a['timestamp'], "actual_mw": a['actual_kw'] / 1000.0} for a in synth]

            db_records = []
            for ts_iso, w_data in filtered_weather.items():
                ts = datetime.fromisoformat(ts_iso).replace(tzinfo=None)
                zone = "zone2" if ts < now else "zone3"
                
                actual_val = None
                if ts <= now:
                    match = next((a for a in actual_records if a['timestamp'].replace(tzinfo=None) == ts), None)
                    if match: actual_val = match['actual_mw']
                
                db_records.append(GenerationData(
                    plant_id=plant_id,
                    timestamp=ts,
                    actual_mw=actual_val,
                    predicted_mw=pred_dict.get(ts, 0.0),
                    zone_label=zone
                ))
            
            # Atomic UPSERT-like behavior
            db.execute(
                delete(GenerationData).where(
                    GenerationData.plant_id == plant_id,
                    GenerationData.timestamp >= start_of_today,
                    GenerationData.timestamp <= two_hours_ahead,
                    GenerationData.zone_label.in_(["zone2", "zone3"])
                )
            )
            db.bulk_save_objects(db_records)
            db.commit()
            
        logger.info("15-minute job completed.")
    except Exception as e:
        logger.error(f"15-minute job failed: {e}")
        db.rollback()
    finally:
        db.close()

def run_midnight_cleanup():
    logger.info("Running Midnight Cleanup...")
    db = SessionLocal()
    try:
        now = datetime.now()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        records_to_update = db.query(GenerationData).filter(
            GenerationData.timestamp < start_of_today,
            GenerationData.zone_label.in_(["zone2", "zone3"])
        ).all()
        for r in records_to_update: r.zone_label = "zone1"
        db.commit()
    except Exception as e:
        logger.error(f"Midnight job failed: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # scheduler.add_job(run_backfill, 'date', run_date=datetime.now() + timedelta(seconds=5))
    scheduler.add_job(run_15min_job, IntervalTrigger(minutes=15), next_run_time=datetime.now() + timedelta(seconds=15))
    scheduler.add_job(run_feeder, IntervalTrigger(minutes=1), next_run_time=datetime.now() + timedelta(seconds=10))
    scheduler.add_job(run_midnight_cleanup, CronTrigger(hour=0, minute=5))
    scheduler.start()
    return scheduler
