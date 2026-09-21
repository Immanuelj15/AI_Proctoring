from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_router, users_router, health_router
from app.routers import questions as questions_router
from app.routers import exams as exams_router
from app.routers import proctor as proctor_router
from app.routers import sessions as sessions_router
from app.database.database import engine
from sqlalchemy import text
from app.models import Base
from app.services.exam_scheduler import start_scheduler, stop_scheduler

import os
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema exists
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        migration_statements = [
            "ALTER TABLE exam_sessions ADD COLUMN suspicion_score FLOAT DEFAULT 0.0",
            "ALTER TABLE exam_sessions ADD COLUMN ai_suspicion_score FLOAT DEFAULT 0.0",
            "ALTER TABLE exam_sessions ADD COLUMN confirmed_suspicion_score FLOAT DEFAULT 0.0",
            "ALTER TABLE exam_sessions ADD COLUMN id_photo_url VARCHAR(500)",
            "ALTER TABLE exam_sessions ADD COLUMN identity_verified BOOLEAN DEFAULT 0",
            "ALTER TABLE exam_sessions ADD COLUMN identity_confidence FLOAT",
            "ALTER TABLE exam_sessions ADD COLUMN last_face_match_confidence FLOAT",
            "ALTER TABLE exam_sessions ADD COLUMN id_verification_timestamp TIMESTAMP",
            "ALTER TABLE exam_sessions ADD COLUMN retention_purge_date TIMESTAMP",
            "ALTER TABLE exam_sessions ADD COLUMN room_scan_url VARCHAR(500)",
            "ALTER TABLE exam_sessions ADD COLUMN room_scan_completed BOOLEAN DEFAULT 0",
            "ALTER TABLE exam_sessions ADD COLUMN question_order VARCHAR(2000)",
            "ALTER TABLE proctor_events ADD COLUMN review_status VARCHAR(20) DEFAULT 'PENDING'",
            "ALTER TABLE proctor_events ADD COLUMN reviewed_by INTEGER",
            "ALTER TABLE proctor_events ADD COLUMN reviewed_at TIMESTAMP",
            "ALTER TABLE proctor_events ADD COLUMN examiner_notes VARCHAR(500)",
        ]
        for stmt in migration_statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass

    # Ensure uploads folders exist
    os.makedirs("uploads/id_photos", exist_ok=True)
    os.makedirs("uploads/room_scans", exist_ok=True)

    # Launch APScheduler background job for auto-submit
    start_scheduler()
    yield
    # Shutdown: Stop scheduler
    stop_scheduler()

app = FastAPI(
    title="AI-Based Intelligent Examination Platform API",
    description="Backend API supporting JWT Auth, RBAC, Question Bank, Timed Exam Engine, Auto-Evaluation, GPT-4o Subjective Grading & WebSocket Proctoring.",
    version="1.0.0",
    lifespan=lifespan
)

# Ensure uploads directory is mounted
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS middleware configuration for Next.js & React frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(questions_router.router)
app.include_router(exams_router.router)
app.include_router(sessions_router.router)
app.include_router(proctor_router.router)


@app.get("/")
def root():
    return {
        "message": "AI-Based Intelligent Examination Platform API",
        "docs_url": "/docs",
        "health_check": "/health"
    }
