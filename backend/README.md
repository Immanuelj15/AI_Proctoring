# AI-Based Intelligent Examination Platform — Day 1 Backend

This repository contains the backend foundation for the **AI-Based Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis**.

## Implemented Features (Day 1)

1. **Complete Database Design (SQLAlchemy 2.x & Alembic)**
   - Schema entities: `users`, `question_bank`, `options`, `exams`, `exam_questions`, `exam_sessions`, `answers`, `results`, `proctor_events`.
   - Complete foreign keys, cascading deletion rules, and relationships.

2. **User Registration & JWT Authentication**
   - Password hashing using bcrypt (`passlib`).
   - Secure token generation using `python-jose` with `sub`, `role`, and expiration (`exp`).
   - Registration validation enforcing unique emails and restricted roles (`student`, `examiner`, `admin`).
   - Dual-mode login (OAuth2 form data & JSON payloads).

3. **Role-Based Authorization (RBAC)**
   - Custom dependencies (`require_student_only`, `require_examiner_only`, `require_admin_only`).
   - Correct HTTP error codes: `401 Unauthorized` for missing/invalid credentials, `403 Forbidden` for insufficient role permissions.

---

## Setup & Running

### 1. Environment Setup

Ensure Python 3.10+ is installed.

```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env` and update credentials:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/examination_db
JWT_SECRET_KEY=super-secret-jwt-key-examination-platform-2026
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Database Migrations (Alembic)

To apply migrations against your PostgreSQL database:

```bash
# Generate initial migration
alembic revision --autogenerate -m "create examination platform schema"

# Upgrade database to head
alembic upgrade head
```

### 4. Seed Default Users

```bash
python seed.py
```

Seeds:
- `student@example.com` (Password: `StudentPassword123!`)
- `examiner@example.com` (Password: `ExaminerPassword123!`)
- `admin@example.com` (Password: `AdminPassword123!`)

### 5. Running the Application

```bash
uvicorn app.main:app --reload
```

Open Interactive API Documentation (Swagger UI):
`http://127.0.0.1:8000/docs`

---

## API Endpoints Overview

| Method | Endpoint | Description | Auth Required | Access |
|---|---|---|---|---|
| `GET` | `/health` | Application health check | No | Public |
| `GET` | `/health/db` | Database connection check | No | Public |
| `POST` | `/auth/register` | Register new user | No | Public |
| `POST` | `/auth/login` | Login & receive JWT | No | Public |
| `GET` | `/users/me` | Fetch current user info | Yes | Authenticated |
| `GET` | `/users/student-test` | Test endpoint for students | Yes | Student |
| `GET` | `/users/examiner-test` | Test endpoint for examiners | Yes | Examiner |
| `GET` | `/users/admin-test` | Test endpoint for admins | Yes | Admin |

---

## Running Automated Tests

Run tests using Pytest:

```bash
pytest
```
