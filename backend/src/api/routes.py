from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import pandas as pd

from src.data.database import get_db, GenerationData
from src.config.plants import get_plants, get_plant_by_id

import sqlite3
import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

# SLDC Sync state
_sldc_sync_lock = threading.Lock()
_last_sldc_sync: Optional[datetime] = None

def _sync_sldc_if_stale(max_age_seconds: int = 55) -> None:
    """Refresh KPTCL SLDC data at most once per minute."""
    global _last_sldc_sync
    now = datetime.now()
    if _last_sldc_sync and (now - _last_sldc_sync).total_seconds() < max_age_seconds:
        return
    if not _sldc_sync_lock.acquire(blocking=False):
        return
    try:
        if _last_sldc_sync and (now - _last_sldc_sync).total_seconds() < max_age_seconds:
            return
        from src.data.scraper import run_scrape
        run_scrape()
        _last_sldc_sync = datetime.now()
    except Exception as exc:
        logger.warning("SLDC sync failed: %s", exc)
    finally:
        _sldc_sync_lock.release()

router = APIRouter(prefix="/api")

@router.get("/plants")
def api_get_plants():
    return get_plants()

@router.get("/generation/{plant_id}")
def api_get_generation(
    plant_id: str, 
    start: Optional[str] = None, 
    end: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    print(f"FETCHING GENERATION: plant={plant_id} start={start} end={end}")
    plant = get_plant_by_id(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
        
    query = db.query(GenerationData).filter(GenerationData.plant_id == plant_id)
    
    now = datetime.now()
    
    # Defaults for Demo/Performance
    start_dt = now - timedelta(hours=24)
    if start:
        try:
            start_clean = start.replace('Z', '+00:00')
            start_dt = datetime.fromisoformat(start_clean).replace(tzinfo=None)
        except: pass
        
    end_dt = now + timedelta(hours=48)
    if end:
        try:
            end_clean = end.replace('Z', '+00:00')
            end_dt = datetime.fromisoformat(end_clean).replace(tzinfo=None)
        except: pass

    query = query.filter(GenerationData.timestamp >= start_dt, GenerationData.timestamp <= end_dt)
            
    records = query.order_by(GenerationData.timestamp.asc()).all()
    print(f"RETURNED {len(records)} records for {plant_id}")
    
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "actual_mw": r.actual_mw,
            "predicted_mw": r.predicted_mw,
            "zone_label": r.zone_label,
            "reason": r.reason
        }
        for r in records
    ]

@router.get("/generation/live/all")
def api_get_live(db: Session = Depends(get_db)):
    """Returns the latest non-null actual and predicted value for all plants."""
    plants = get_plants()
    result = {}
    
    for p in plants:
        # Get latest actual record (not null)
        latest_actual = db.query(GenerationData).filter(
            GenerationData.plant_id == p['id'],
            GenerationData.actual_mw != None
        ).order_by(GenerationData.timestamp.desc()).first()
        
        result[p['id']] = {
            "timestamp": latest_actual.timestamp.isoformat() if latest_actual else None,
            "actual_mw": latest_actual.actual_mw if latest_actual else 0,
            "predicted_mw": latest_actual.predicted_mw if latest_actual else 0
        }
        
    return result

@router.get("/summary/{plant_id}")
def api_get_summary(plant_id: str, db: Session = Depends(get_db)):
    """Today's total generation, average prediction accuracy, peak timestamp/value."""
    now = datetime.now()
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    records = db.query(GenerationData).filter(
        GenerationData.plant_id == plant_id,
        GenerationData.timestamp >= start_of_today,
        GenerationData.timestamp <= now,
        GenerationData.actual_mw != None
    ).all()
    
    if not records:
        return {
            "total_mwh": 0,
            "avg_accuracy_pct": 0,
            "peak_mw": 0,
            "peak_time": None
        }
        
    total_mwh = sum(r.actual_mw for r in records) * 0.25 # 15 min interval = 0.25 hours
    
    # Calculate accuracy
    errors = []
    for r in records:
        if r.predicted_mw > 0 or r.actual_mw > 0:
            err = abs(r.actual_mw - r.predicted_mw)
            max_val = max(r.actual_mw, r.predicted_mw)
            if max_val > 0:
                errors.append(err / max_val)
    
    avg_error = sum(errors) / len(errors) if errors else 0
    accuracy = max(0, (1 - avg_error) * 100)
    
    peak_record = max(records, key=lambda x: x.actual_mw)
    
    return {
        "total_mwh": round(total_mwh, 2),
        "avg_accuracy_pct": round(accuracy, 2),
        "peak_mw": round(peak_record.actual_mw, 2),
        "peak_time": peak_record.timestamp.isoformat()
    }

@router.get("/sldc/generation")
def api_get_sldc_generation(limit: int = 48):
    """Returns historical solar and wind generation data scraped from KPTCL SLDC."""
    _sync_sldc_if_stale()
    db_path = Path("data/karnataka_solar.db")
    if not db_path.exists():
        return {"status": "error", "message": "SLDC database not found"}

    try:
        con = sqlite3.connect(db_path)
        query = """
            SELECT 
                d.sldc_ts,
                d.state_demand_mw,
                d.total_generation_mw,
                d.solar_mw,
                d.wind_mw,
                d.scraped_at
            FROM default_readings d
            INNER JOIN (
                SELECT sldc_ts, MAX(id) AS id
                FROM default_readings
                WHERE sldc_ts IS NOT NULL AND sldc_ts != ''
                GROUP BY sldc_ts
            ) latest ON latest.id = d.id
            ORDER BY d.scraped_at DESC
            LIMIT ?
        """
        df = pd.read_sql(query, con, params=(limit,))
        con.close()
        df = df.sort_values("scraped_at")
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Failed to fetch SLDC data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sldc/status")
def api_get_sldc_status():
    """Returns the latest grid status including frequency and total generation."""
    _sync_sldc_if_stale()
    db_path = Path("data/karnataka_solar.db")
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="SLDC database not found")

    try:
        con = sqlite3.connect(db_path)
        default_df = pd.read_sql("SELECT * FROM default_readings ORDER BY scraped_at DESC LIMIT 1", con)
        gen_df = pd.read_sql("SELECT total_gen_mw, ncep_mw, cgs_mw FROM stategen_readings ORDER BY scraped_at DESC LIMIT 1", con)
        con.close()

        if default_df.empty:
            raise HTTPException(status_code=404, detail="No SLDC data found")

        latest = default_df.iloc[0]
        status = {
            "timestamp": latest["sldc_ts"],
            "scraped_at": latest["scraped_at"],
            "frequency": latest["frequency"],
            "state_ui_mw": latest["state_ui_mw"],
            "state_demand_mw": latest["state_demand_mw"],
            "solar_mw": latest["solar_mw"],
            "wind_mw": latest["wind_mw"],
            "hydro_mw": latest["hydro_mw"],
            "thermal_mw": latest["thermal_mw"],
            "thermal_ipp_mw": latest["thermal_ipp_mw"],
            "other_mw": latest["other_mw"],
            "pavagada_solar_mw": latest["pavagada_solar_mw"],
            "live_generation_mw": latest["total_generation_mw"] or (gen_df.iloc[0]["total_gen_mw"] if not gen_df.empty else 0),
            "ncep_mw": latest["solar_mw"] + latest["wind_mw"],
            "cgs_mw": gen_df.iloc[0]["cgs_mw"] if not gen_df.empty else 0,
        }
        
        last_scrape = pd.to_datetime(status["scraped_at"])
        is_stale = (pd.Timestamp.now() - last_scrape).total_seconds() > 1800
        status["is_stale"] = is_stale
        return status
    except Exception as e:
        logger.error(f"Failed to fetch SLDC status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sldc/assets")
def api_get_sldc_assets():
    """Get current SLDC asset/category breakdown."""
    _sync_sldc_if_stale()
    db_path = Path("data/karnataka_solar.db")
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="SLDC database not found")

    try:
        con = sqlite3.connect(db_path)
        default_df = pd.read_sql("SELECT * FROM default_readings ORDER BY scraped_at DESC LIMIT 1", con)
        ncep_df = pd.read_sql("SELECT * FROM ncep_readings WHERE scraped_at = (SELECT MAX(scraped_at) FROM ncep_readings) ORDER BY escom", con)
        plant_df = pd.read_sql("SELECT * FROM stategen_readings WHERE scraped_at = (SELECT MAX(scraped_at) FROM stategen_readings) ORDER BY plant", con)
        con.close()

        assets = []
        if not default_df.empty:
            latest = default_df.iloc[0]
            categories = [
                ("SOLAR", "Solar", "solar", latest["solar_mw"], latest["pavagada_solar_mw"]),
                ("WIND", "Wind", "wind", latest["wind_mw"], None),
                ("HYDRO", "Hydro", "hydro", latest["hydro_mw"], None),
                ("THERMAL", "Thermal", "thermal", latest["thermal_mw"], None),
                ("THERMAL_IPP", "Thermal IPP", "thermal", latest["thermal_ipp_mw"], None),
                ("OTHER", "Other", "other", latest["other_mw"], None),
            ]
            for asset_id, name, kind, generation, child_generation in categories:
                item = {
                    "asset_id": asset_id, "name": name, "asset_type": kind,
                    "generation_mw": float(generation or 0),
                    "timestamp": latest["sldc_ts"], "source": "Default.aspx",
                }
                if child_generation is not None:
                    item["pavagada_solar_mw"] = float(child_generation or 0)
                assets.append(item)

        for _, row in ncep_df.iterrows():
            solar = float(row["solar_mw"] or 0)
            wind = float(row["wind_mw"] or 0)
            hr = datetime.now().hour
            is_day = 6 <= hr <= 18
            s_status = "green" if solar > 50 else ("yellow" if solar > 0 else ("red" if is_day else "green"))
            w_status = "green" if wind > 50 else ("yellow" if wind > 0 else "red")

            assets.append({
                "asset_id": f"ZONE_S_{str(row['escom']).upper()}", "name": f"{row['escom']} Solar",
                "asset_type": "solar", "generation_mw": solar, "status": s_status,
                "timestamp": row["sldc_ts"], "source": "StateNCEP.aspx",
            })
            assets.append({
                "asset_id": f"ZONE_W_{str(row['escom']).upper()}", "name": f"{row['escom']} Wind",
                "asset_type": "wind", "generation_mw": wind, "status": w_status,
                "timestamp": row["sldc_ts"], "source": "StateNCEP.aspx",
            })

        for _, row in plant_df.iterrows():
            gen = float(row["generation_mw"] or 0)
            cap = float(row["capacity_mw"] or 0)
            status = "green"
            if cap > 0:
                lf = gen / cap
                if lf < 0.05: status = "red"
                elif lf < 0.2: status = "yellow"
            
            assets.append({
                "asset_id": f"PLANT_{str(row['plant']).upper().replace(' ', '_')}", "name": row["plant"],
                "asset_type": "conventional_plant", "capacity_mw": cap, "generation_mw": gen,
                "status": status, "timestamp": row["sldc_ts"], "source": "StateGen.aspx",
            })

        if not default_df.empty:
            pav = float(default_df.iloc[0]["pavagada_solar_mw"] or 0)
            assets.append({
                "asset_id": "PLANT_PAVAGADA", "name": "Pavagada Solar Park",
                "asset_type": "solar", "capacity_mw": 2050.0, "generation_mw": pav,
                "status": "green" if pav > 100 else ("yellow" if pav > 0 else "red"),
                "timestamp": default_df.iloc[0]["sldc_ts"], "source": "Default.aspx",
            })

        return {"assets": assets}
    except Exception as e:
        logger.error("Failed to fetch SLDC assets: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sldc/sync")
def api_sync_sldc():
    _sync_sldc_if_stale(max_age_seconds=0)
    return {"status": "ok", "message": "SLDC sync attempted."}
