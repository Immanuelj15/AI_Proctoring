from fastapi import APIRouter, Depends
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
