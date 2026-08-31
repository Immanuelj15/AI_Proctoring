from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_router, users_router, health_router
from app.routers import questions as questions_router
from app.routers import exams as exams_router
from app.routers import proctor as proctor_router
from app.routers import sessions as sessions_router
from app.services.exam_scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch APScheduler background job for auto-submit
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
