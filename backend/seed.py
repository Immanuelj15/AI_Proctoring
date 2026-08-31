import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database.database import SessionLocal, engine
from app.models import Base, User, UserRole
from app.core.security import hash_password


def seed_users():
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        users_data = [
            {
                "name": "Default Student",
                "email": "student@example.com",
                "password": "StudentPassword123!",
                "role": UserRole.STUDENT
            },
            {
                "name": "Default Examiner",
                "email": "examiner@example.com",
                "password": "ExaminerPassword123!",
                "role": UserRole.EXAMINER
            },
            {
                "name": "Default Admin",
                "email": "admin@example.com",
                "password": "AdminPassword123!",
                "role": UserRole.ADMIN
            }
        ]

        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"]
                )
                db.add(user)
                print(f"Seeded user: {u['email']} ({u['role'].value})")
            else:
                print(f"User {u['email']} already exists.")

        db.commit()
        print("Seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
