from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

DB_PATH = os.environ.get("DB_PATH", "sqlite:///./dashboard.db")

engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class GenerationData(Base):
    __tablename__ = "generation_data"
    __table_args__ = (UniqueConstraint('plant_id', 'timestamp', name='_plant_timestamp_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    actual_mw = Column(Float, nullable=True)
    predicted_mw = Column(Float, nullable=True)
    zone_label = Column(String)  # 'zone1', 'zone2', 'zone3'
    reason = Column(String, nullable=True)

class WeatherDataCache(Base):
    __tablename__ = "weather_cache"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    weather_json = Column(JSON)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
