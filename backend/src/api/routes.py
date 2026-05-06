from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import pandas as pd

from src.data.database import get_db, GenerationData
from src.config.plants import get_plants, get_plant_by_id

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
    plant = get_plant_by_id(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
        
    query = db.query(GenerationData).filter(GenerationData.plant_id == plant_id)
    
    if start:
        try:
            start_dt = datetime.fromisoformat(start)
            query = query.filter(GenerationData.timestamp >= start_dt)
        except ValueError:
            pass
            
    if end:
        try:
            end_dt = datetime.fromisoformat(end)
            query = query.filter(GenerationData.timestamp <= end_dt)
        except ValueError:
            pass
            
    records = query.order_by(GenerationData.timestamp.asc()).all()
    
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "actual_kw": r.actual_kw,
            "predicted_kw": r.predicted_kw,
            "zone_label": r.zone_label
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
            GenerationData.actual_kw != None
        ).order_by(GenerationData.timestamp.desc()).first()
        
        result[p['id']] = {
            "timestamp": latest_actual.timestamp.isoformat() if latest_actual else None,
            "actual_kw": latest_actual.actual_kw if latest_actual else 0,
            "predicted_kw": latest_actual.predicted_kw if latest_actual else 0
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
        GenerationData.actual_kw != None
    ).all()
    
    if not records:
        return {
            "total_kwh": 0,
            "avg_accuracy_pct": 0,
            "peak_kw": 0,
            "peak_time": None
        }
        
    total_kwh = sum(r.actual_kw for r in records) * 0.25 # 15 min interval = 0.25 hours
    
    # Calculate accuracy
    errors = []
    for r in records:
        if r.predicted_kw > 0 or r.actual_kw > 0:
            err = abs(r.actual_kw - r.predicted_kw)
            max_val = max(r.actual_kw, r.predicted_kw)
            if max_val > 0:
                errors.append(err / max_val)
    
    avg_error = sum(errors) / len(errors) if errors else 0
    accuracy = max(0, (1 - avg_error) * 100)
    
    peak_record = max(records, key=lambda x: x.actual_kw)
    
    return {
        "total_kwh": round(total_kwh, 2),
        "avg_accuracy_pct": round(accuracy, 2),
        "peak_kw": round(peak_record.actual_kw, 2),
        "peak_time": peak_record.timestamp.isoformat()
    }
