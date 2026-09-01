import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(__file__))

from app.database.database import SessionLocal, engine
from app.models import Base, User, UserRole
from app.core.security import hash_password


def seed_users():
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)

    # Safe schema migration for existing SQLite database
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 1"))
            conn.commit()
            print("Migrated schema: Added is_approved column to users table.")
        except Exception:
            # Column already exists
            pass

    db = SessionLocal()
    try:
        users_data = [
            {
                "name": "Default Student",
                "email": "student@example.com",
                "password": "StudentPassword123!",
                "role": UserRole.STUDENT,
                "is_approved": True
            },
            {
                "name": "Default Examiner",
                "email": "examiner@example.com",
                "password": "ExaminerPassword123!",
                "role": UserRole.EXAMINER,
                "is_approved": True
            },
            {
                "name": "Default Admin",
                "email": "admin@example.com",
                "password": "AdminPassword123!",
                "role": UserRole.ADMIN,
                "is_approved": True
            }
        ]

        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    is_approved=u["is_approved"]
                )
                db.add(user)
                print(f"Seeded user: {u['email']} ({u['role'].value})")
            else:
                existing.is_approved = True
                print(f"User {u['email']} already exists (set is_approved=True).")

        db.commit()
        print("Seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
