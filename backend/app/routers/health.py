from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Application health check endpoint."""
    return {"status": "ok"}


@router.get("/health/db")
def db_health_check(db: Session = Depends(get_db)):
    """Database connectivity health check endpoint."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection error: {str(e)}"
        )
