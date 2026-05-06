import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

def test_ingest_scada():
    payload = [{
        "timestamp": "2024-01-01 00:00:00",
        "plant_id": "SAUNDATTI_WF",
        "plant_type": "wind",
        "installed_capacity_mw": 84.0,
        "generation_mw": 42.0,
        "availability_flag": 1,
        "latitude": 16.052,
        "longitude": 74.648,
        "hub_height_m": 90
    }]
    response = client.post("/ingest/scada", json=payload)
    print("SCADA Response:", response.status_code, response.json())

def test_ingest_nwp():
    payload = [{
        "timestamp": "2024-01-01 00:00:00",
        "plant_id": "SAUNDATTI_WF",
        "ghi_wm2": 0.0,
        "cloud_cover_pct": 0.0,
        "temperature_c": 25.0,
        "wind_speed_ms": 10.0,
        "wind_direction_deg": 180.0,
        "pressure_hpa": 1010.0,
        "humidity_pct": 50.0
    }]
    response = client.post("/ingest/nwp", json=payload)
    print("NWP Response:", response.status_code, response.json())

if __name__ == "__main__":
    test_ingest_scada()
    test_ingest_nwp()
