from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path

from src.data.database import init_db
from src.api.routes import router as api_router
from src.api.live_prediction import router as live_prediction_router
from src.jobs.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    init_db()
    
    logger.info("Starting background scheduler...")
    global scheduler
    scheduler = start_scheduler()
    
    yield
    
    # Shutdown
    if scheduler:
        scheduler.shutdown()
        logger.info("Scheduler shutdown complete.")

app = FastAPI(title="Power Generation Forecasting Dashboard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router)
app.include_router(live_prediction_router, prefix="/api")

# Static Files (Frontend)
FRONTEND_PATH = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_PATH.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_PATH), html=True), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve index.html for any route that doesn't match an API or static file
        # This is essential for React Router to work
        index_file = FRONTEND_PATH / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend build not found"}
else:
    @app.get("/")
    async def root():
        return {"message": "API is running. Frontend build not found at " + str(FRONTEND_PATH)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
