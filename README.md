# Power Forecast Hub

A professional-grade renewable energy generation forecasting system designed for the Karnataka grid. This project uses LightGBM models to provide high-accuracy solar and wind power forecasts at 15-minute granularity (96 blocks per day).

## Project Structure

- **`frontend/`**: Modern React/Vite/Tailwind dashboard for real-time monitoring and visualization.
- **`backend/`**: Python-based forecasting engine, API, and legacy Streamlit control center.
- **`data/`**: Historical SCADA data, NWP weather forecasts, and grid assets metadata.
- **`models/`**: Trained quantile regression models (P10, P50, P90) and performance metrics.
- **`docs/`**: Technical specifications, research documents, and implementation plans.
- **`notebooks/`**: Exploratory data analysis and model training workflows.
- **`tests/`**: Unit tests for data pipelines and model inference.

## Key Features

- **Quantile Forecasting**: Provides P10 (conservative), P50 (median), and P90 (optimistic) scenarios to help grid operators manage reserves.
- **Explainable AI**: Utilizes SHAP values to explain the drivers behind every forecast.
- **Automated Retraining**: Monitors model drift and triggers retraining on sensor changes or seasonal shifts.
- **SLDC Compliance**: Outputs schedules in the standard 96-block format required by State Load Despatch Centers.

## Getting Started

### Backend
1. Navigate to `backend/`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Run the API (if applicable).

### Frontend
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Run the dev server: `npm run dev`.


## Documentation
For a detailed technical deep-dive, see [renewable_forecast_solution.txt](docs/renewable_forecast_solution.txt).

## CSV Data Feeder (Hackathon Mode)

As we currently do not have direct API access from the hackathon organization for live grid telemetry, we have implemented a **CSV Data Feeder** for representation and testing purposes.

### Why we use it:
- **Simulation**: To demonstrate the real-time capabilities of the dashboard (Live Graphs, Asset Monitoring) without a live connection.
- **Data Continuity**: It ensures the "Actual vs Predicted" visualizations are populated with realistic data patterns derived from historical SCADA records.
- **Stability**: Provides a reliable data stream for frontend development and user experience testing.

### Where it is used:
- **`backend/src/data/feeder.py`**: The engine that reads historical CSVs (`scada_generation.csv`), shifts timestamps to current time, and performs spatial aggregation.
- **`backend/src/api/main.py`**: A background scheduler triggers the feeder every 60 seconds to update the local `karnataka_solar.db`.
- **Telemetry Endpoints**: Endpoints like `/sldc/status` and `/sldc/assets` serve this "faked" live data to the frontend.

### Future Replacements:
- **KPTCL SLDC API**: Once access is granted, `scraper.py` will replace the feeder to pull official state-wide generation data.
- **SCADA IoT Integration**: Direct MQTT/HTTP streams from plant-level sensors will feed the `/ingest/scada` endpoint.
- **Live Weather APIs**: NWP data will be fetched from professional services (e.g., Solcast, Meteoblue) instead of reading from static `nwp_weather.csv`.
