from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.user import UserResponse
from app.models.user import User
from app.dependencies.auth import (
    get_current_user,
    require_student_only,
    require_examiner_only,
    require_admin_only
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return current_user


@router.get("", response_model=List[UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_only)
):
    """Retrieve list of all registered users (Admin only)."""
    return db.query(User).order_by(User.id.desc()).all()


@router.put("/{user_id}/approve", response_model=UserResponse)
def update_user_approval(
    user_id: int,
    is_approved: bool = True,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_only)
):
    """Approve or revoke user access (Admin only)."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    target_user.is_approved = is_approved
    db.commit()
    db.refresh(target_user)
    return target_user


@router.get("/student-test")
def student_test_endpoint(current_user: User = Depends(require_student_only)):
    """Test endpoint accessible ONLY by student users."""
    return {
        "message": "Student access granted",
        "user_id": current_user.id,
        "name": current_user.name,
        "role": current_user.role
    }


@router.get("/examiner-test")
def examiner_test_endpoint(current_user: User = Depends(require_examiner_only)):
    """Test endpoint accessible ONLY by examiner users."""
    return {
        "message": "Examiner access granted",
        "user_id": current_user.id,
        "name": current_user.name,
        "role": current_user.role
    }


@router.get("/admin-test")
def admin_test_endpoint(current_user: User = Depends(require_admin_only)):
    """Test endpoint accessible ONLY by admin users."""
    return {
        "message": "Admin access granted",
        "user_id": current_user.id,
        "name": current_user.name,
        "role": current_user.role
    }
