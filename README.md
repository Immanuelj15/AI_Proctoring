# CyberProctor — Next-Gen AI-Powered Examination & Autonomous Proctoring Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade, full-stack online examination and proctoring platform combining real-time computer vision, acoustic disturbance detection, zero-trust browser containment, GPT-4o subjective answer evaluation, Tesseract OCR handwritten script extraction, and SHA-256 cryptographic scorecard verification.

---

## ⚡ Key Highlights & Architecture

```
                               ┌───────────────────────────────────────────────┐
                               │             Next.js 15+ Frontend              │
                               │  (Cyber Dark HUD, Web Audio, Video Telemetry) │
                               └───────┬───────────────────────────────┬───────┘
                                       │                               │
                      REST API Calls   │                               │ WebSocket Telemetry
                     (JWT Bearer Auth) │                               │ (/api/v1/proctor/stream)
                                       ▼                               ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │                  FastAPI Backend Engine                 │
                     │          (Port 8000 · Python 3.11+ · SQLAlchemy)        │
                     └──────┬─────────────┬─────────────┬─────────────┬────────┘
                            │             │             │             │
                            ▼             ▼             ▼             ▼
                     ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐
                     │  SQLite /  │ │  GPT-4o   │ │ Tesseract │ │  ReportLab  │
                     │ PostgreSQL │ │ Evaluation│ │ OCR Engine│ │   SHA-256   │
                     │  Database  │ │  Service  │ │  Service  │ │ PDF Engine  │
                     └────────────┘ └───────────┘ └───────────┘ └─────────────┘
```

### 1. Examiner Command Center
- **Question Bank Management**:
  - Support for Multiple Choice (**MCQ**) with negative marking, **Short Answer**, **Long Answer**, and **Handwritten Diagram / Photo Upload** (`IMAGE_UPLOAD`).
  - Search by keyword or subject, filter chips by question type and difficulty level (`EASY`, `MEDIUM`, `HARD`).
  - Full CRUD operations with glassmorphic **Edit Question Modal** and instant UI state synchronization.
  - Model Answer keys and AI rubrics securely scrubbed from student requests to eliminate data leakage.
- **Exam Configuration & Assembly**:
  - Timed duration configuration (server-enforced timers).
  - Toggles for **Real-Time AI Proctoring**, **Question Order Randomization**, and **Negative Marking**.
  - Custom sequence indexing (`orderIndex`) when linking questions from Question Bank.
  - Interactive Attached Questions explorer on each exam card with one-click detachment.
- **Real-Time Live Surveillance Matrix (`/proctor-live`)**:
  - Multi-candidate telemetry grid with live video/canvas overlays.
  - Two-way WebSocket intervention: Examiners can issue real-time textual warnings (`WARN`) or unilaterally terminate sessions (`DISQUALIFY`).
  - Gaze direction tracking, face bounding box, presence confidence, and tab violation counters.
- **Dual-Track Subjective Answer Grading (`/grading`)**:
  - Master-detail review workbench comparing **Question Prompt**, **Candidate Response**, **Model Rubric**, and **AI Justification**.
  - AI confidence metric (e.g., `92% Confidence`) for subjective grading suggestions.
  - Examiner score overrides and custom feedback remarks.
  - **Result Locking**: Certified/published sessions are locked against tampering (`HTTP 400 Bad Request`).
  - **Disqualification Safeguard**: Instantly resets database score records to `0.0` with violation notes.

### 2. Student Secure Examination Portal
- **Zero-Trust Browser Lockdown**:
  - Enforced fullscreen mode with automatic violations on fullscreen exit, window blur, or tab switching.
  - Right-click context menu, clipboard copy/cut/paste, and developer shortcuts strictly intercepted.
- **Continuous AI Proctoring**:
  - Real-time webcam face tracking and iris gaze direction tracking.
  - Web Audio API `AudioContext` and `AnalyserNode` monitoring real-time room acoustic decibels for conversation anomalies.
- **Multimodal Submissions**:
  - Rich text responses, code snippets, and camera/file uploads for handwritten diagrams with integrated OCR extraction.

### 3. Cryptographic Verification & Scorecard Certification
- **SHA-256 Digital Verification Seal**:
  - Official candidate scorecards generated with ReportLab are stamped with a 64-character cryptographic SHA-256 digest calculated across candidate email, session ID, final marks, suspicion score, status, and completion timestamp conforming to FIPS 180-4 standard.
  - Tamper-evident PDF scorecard download available for certified students and examiners.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 15+ (App Router), React 19, TypeScript, Vanilla CSS Cyber-HUD Design System, Lucide Icons |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy 2.0 ORM, Pydantic v2, Uvicorn, SQLite / PostgreSQL |
| **Security & Auth**| OAuth2 Bearer, Passlib (Bcrypt), PyJWT, Role-Based Access Control (RBAC) |
| **AI & Vision** | OpenAI GPT-4o API (Subjective Grading), PyTesseract (OCR), Web Audio API (Decibel Analysis) |
| **Reporting** | ReportLab PDF Engine with Cryptographic SHA-256 Integrity Verification |
| **Testing** | Pytest, Pytest-AsyncIO, Starlette TestClient |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.17.0+ or v20+
- **Python**: v3.11+
- **Git** installed

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file in `backend/` (or copy from example):
   ```env
   SECRET_KEY=cyberproctor_super_secret_jwt_key_change_in_production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=480
   DATABASE_URL=sqlite:///./exam_platform.db
   OPENAI_API_KEY=your_openai_api_key_optional
   ```

5. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Backend will be running at `http://127.0.0.1:8000`. Interactive Swagger API docs are available at `http://127.0.0.1:8000/docs`.

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Ensure `frontend/.env.local` contains:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

---

## 🧪 Running Automated Tests

Run the complete backend test suite using `pytest`:

```bash
cd backend
python -m pytest
```

All 18 tests cover end-to-end user authentication, question bank CRUD, exam assembly, real-time proctoring telemetry, AI answer evaluation, examiner overrides, and cryptographic PDF generation:

```
============================= test session starts =============================
platform win32 -- Python 3.11.3, pytest-9.1.1
collected 18 items

tests/test_auth.py ........                                              [ 44%]
tests/test_flowchart_e2e.py .                                            [ 50%]
tests/test_questions_exams.py .                                          [ 55%]
tests/test_users.py .......                                              [ 94%]
tests/test_weeks_1_to_4.py .                                             [100%]

============================= 18 passed in 15.68s =============================
```

---

## 📂 Project Directory Structure

```
.
├── backend/
│   ├── app/
│   │   ├── core/               # Security, JWT tokens, config
│   │   ├── database/           # DB engine, session factory, base model
│   │   ├── dependencies/       # RBAC dependencies & OAuth2 handlers
│   │   ├── models/             # SQLAlchemy ORM models (User, Exam, Session, Question, Result)
│   │   ├── routers/            # API route controllers (auth, questions, exams, sessions, proctor)
│   │   ├── schemas/            # Pydantic v2 validation schemas
│   │   ├── services/           # Business logic (GPT-4o LLM grading, OCR, ReportLab PDF)
│   │   └── main.py             # FastAPI entrypoint, CORS, routers mount
│   ├── tests/                  # Pytest test cases & E2E flowchart suites
│   ├── requirements.txt        # Python package dependencies
│   └── seed_dbms_exam.py       # Seed script with realistic questions & exams
├── frontend/
│   ├── app/
│   │   ├── admin/              # Admin dashboard
│   │   ├── examiner/           # Examiner portal & question bank workbench
│   │   ├── student/            # Student active exams & past scorecards
│   │   ├── exam/[sessionId]/   # Live examination test-taking environment
│   │   ├── grading/            # AI evaluation review & score override portal
│   │   ├── proctor-live/       # Real-time WebSocket surveillance matrix
│   │   ├── results/[sessionId]/# Certified scorecard view
│   │   └── globals.css         # Dark Cyber-HUD styling system
│   ├── components/
│   │   ├── common/             # ProtectedRoute, Header, Navigation
│   │   ├── exam/               # Question rendering, Image upload, Lockdown modal
│   │   └── examiner/           # QuestionBankManager, ExamManager
│   ├── hooks/
│   │   └── useProctoring.ts    # Web Audio + Video + WebSocket proctoring hook
│   └── lib/
│       └── api.ts              # Type-safe client API wrapper
├── docker-compose.yml          # Containerized deployment config
└── README.md                   # Platform documentation
```

---

## 🔒 Security & Compliance Standards
- **Zero-Trust Architecture**: Every endpoint enforces JWT bearer validation and RBAC guards (`student`, `examiner`, `admin`).
- **Data Leak Prevention**: Student sessions receive sanitized question objects without model answers or rubric guidance.
- **Audit Logging**: All proctor incidents (gaze deviance, audio disturbances, tab shifts, window blurs) are immutably logged with millisecond timestamps and suspicion score deltas.
- **Digital Authenticity**: SHA-256 integrity seal prevents fraudulent scorecard alterations.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
