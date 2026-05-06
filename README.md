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
