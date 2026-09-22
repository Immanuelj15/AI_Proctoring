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
  - **Multi-Source AI Question Extractor & Generator**:
    - Direct import from documents: **PDF** (`.pdf`), **Microsoft Word** (`.docx`), Plain Text (`.txt`, `.md`).
    - **External Web Link / URL Scraper**: Fetches any online documentation or article (e.g. Wikipedia, official docs) and strips headers/ads to extract relevant questions.
    - **Parametric Difficulty Distribution**: Configurable question counts for **Easy**, **Medium**, and **Hard** difficulty tiers with live total tally.
    - **Interactive Preview & Edit Workbench**: Verify, adjust marks, tweak answer keys, or toggle correct MCQ choices before batch importing into the question bank.
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

### 2. Trust & Integrity (Commercial-Grade Proctoring)
- **Zero-Biometric Identity Verification & Continuity**:
  - Pre-exam identity onboarding: Captures reference photo or government ID and runs a facial match against the live webcam stream.
  - Generates a normalized match confidence score (0.0 - 1.0).
  - **Privacy First**: Never stores biometric templates or embedding vectors. Only stores match confidence scores and timestamps.
  - Enforces a strictly audited 30-day retention and purge policy (`retention_purge_date`).
  - Periodic background facial verification (every 3 minutes) confirms candidate continuity during the examination.
- **Pre-Flight 360° Room Environment Scan**:
  - 15-second guided webcam pan clip recorded before the exam timer begins.
  - Uploaded as WebM media and attached to the exam session.
  - Lazy human review: Reviewed only if the candidate is flagged for anomalies, eliminating examiner fatigue.
- **Hybrid Human-in-the-Loop Review Queue (`/dashboard` -> 🛡️ Review Queue)**:
  - AI incidents are logged as `PENDING` and accrue provisional `ai_suspicion_score`.
  - **Zero automated grade penalties or unverified disqualifications**: Official penalties only apply when an Examiner/Admin reviews the incident snapshot and room scan, entering audited notes and selecting **Confirm Violation** or **Dismiss as False Positive**.
- **Crash-Safe Session Resume**:
  - Resilient to unexpected tab closes, accidental reloads, or device reboots.
  - Server-authoritative timer prevents clock tampering or resets.
  - Session question ordering and previously answered choices are restored exactly without data loss.

### 3. Student Secure Examination Portal
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

## 📱 Progressive Web App (PWA) & Web Push Engine

CyberProctor is a certified Progressive Web App installable across Windows, macOS, Linux, Android, and iOS.

### 1. Installation & Web App Manifest
- **Web App Manifest (`/manifest.json`)**: Configured with `display: standalone`, `theme_color: #12172B`, and `background_color: #F5F6F8`.
- **Branded Design-System Icons**: Includes `192x192`, `512x512`, `512x512 maskable`, and `72x72 badge` icons matching the Navy ink and Signal blue color tokens.
- **Custom Install Prompt (`InstallPrompt.tsx`)**: Intercepts the browser's `beforeinstallprompt` event, suppresses default chrome banners, and displays an accessible prompt offering one-click desktop/home screen installation. Automatically suppresses if running in standalone mode or dismissed within 24 hours.

### 2. Tri-Tier Service Worker Caching Architecture (`sw.js`)
To balance offline reliability with rigorous exam security, the service worker enforces 3 deliberate caching strategies:
1. **Static Build Assets (Cache-First)**: `/_next/static/`, CSS, JS, fonts, icons, and SVG assets are content-hashed and cached permanently in `ai-proctor-static-v1`, updating in the background.
2. **Page Navigations (Network-First)**: HTML page navigations attempt network fetch first, caching runtime pages in `ai-proctor-pages-v1`. On offline disconnect, serves cached copy; if uncached, serves the dedicated `/offline.html` fallback.
3. **API Endpoints & Telemetry (Strict Network-Only)**: Requests to `/api/`, `http://127.0.0.1:8000`, and WebSocket connections are **strictly network-only and never cached**. Exam timers, session states, and answers remain 100% server-authoritative.
- **Production Gating**: The service worker registers only in production builds (`NODE_ENV === 'production'`) to prevent caching interference with development hot reloading.

### 3. End-to-End VAPID Push Notifications
CyberProctor includes full push notification support for upcoming exam reminders and proctor alerts:
- **Frontend Opt-In (`PushNotificationToggle.tsx`)**: Negotiates browser permissions, subscribes with VAPID `applicationServerKey`, and syncs subscription endpoints to backend `POST /api/v1/notifications/subscribe`.
- **Backend Dispatch Service (`push_service.py`)**: Utilizes `pywebpush` and VAPID credentials to dispatch encrypted Web Push payloads. Automatically prunes expired endpoints (`HTTP 410 / 404`).
- **Scheduled Reminder Job (`exam_scheduler.py`)**: Periodically scans active examinations and broadcasts start reminders to enrolled candidates.
- **Service Worker Push & Click Handlers**: Renders rich notifications with badge and icon, focusing or opening the candidate room upon tap.

#### How to Generate & Configure VAPID Keys

To generate new VAPID keys, run using Node.js:
```bash
npx web-push generate-vapid-keys
```
Or using Python:
```bash
python -c "from py_vapid import Vapid; v = Vapid(); v.generate_keys(); import base64; from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat; print('PUBLIC_KEY=' + base64.urlsafe_b64encode(v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)).decode().rstrip('=')); print('PRIVATE_KEY=' + base64.urlsafe_b64encode(v.private_key.private_numbers().private_value.to_bytes(32, 'big')).decode().rstrip('='))"
```

Configure your environment variables:
- **Backend (`backend/.env`)**:
  ```env
  VAPID_PUBLIC_KEY=BIohzaztSefqt-2j2dRioX1FUz9JxV8r-lRTE026iNGeooeAR_5I93Jexg9irrBArOyPxyV7I9smh1YonkIgKug
  VAPID_PRIVATE_KEY=RnPeaGBiB693csmLC1TvjZ3ACGXgVUfcYKTHp4vdIYQ
  VAPID_CLAIMS_SUB=mailto:admin@aiproctor.internal
  ```
- **Frontend (`frontend/.env.local`)**:
  ```env
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIohzaztSefqt-2j2dRioX1FUz9JxV8r-lRTE026iNGeooeAR_5I93Jexg9irrBArOyPxyV7I9smh1YonkIgKug
  ```

---

## 🌐 Multilingual UI (6 Languages)

CyberProctor supports 6 Indian and international languages natively without complex URL-based routing:
1. **English** (`en`)
2. **Hindi** (`hi` - हिन्दी)
3. **Telugu** (`te` - తెలుగు)
4. **Tamil** (`ta` - தமிழ்)
5. **Malayalam** (`ml` - മലയാളം)
6. **Kannada** (`kn` - ಕನ್ನಡ)

### 1. Architecture & Translation Hook
- **Client-Side Locale Context (`LocaleContext.tsx`)**:
  - Auto-detects preferred browser language on first visit (`navigator.languages`).
  - Persists language preference across sessions via `localStorage` and `cookie`.
  - Sets `document.documentElement.lang` dynamically for accessibility and screen readers.
- **Translation Hook (`useTranslation()`)**:
  - Exposes `t(key, variables?)` with `{{variable}}` token interpolation (e.g. `Question {{current}} of {{total}}`).
  - Automatic fallback to English if any key is missing in another locale (never returns blank or crashes).
- **Native-Script Language Switcher (`LanguageSwitcher.tsx`)**:
  - Displays each language in its native script (e.g., తెలుగు, தமிழ், हिन्दी).
  - Placed persistently in the Global Header and on the Login screen.

### 2. Dictionary Parity & Automated Audit
All 6 dictionaries (`locales/en.json`, `locales/hi.json`, `locales/te.json`, `locales/ta.json`, `locales/ml.json`, `locales/kn.json`) share an identical key schema. To verify 100% parity and prevent translation drift:
```bash
python frontend/scripts/audit-locales.py
```
Output:
```
============================================================
AUDITING LOCALES AGAINST CANONICAL: en.json
Total Canonical Keys: 96
============================================================
Locale: hi.json (96 keys) -> [PASS] Zero missing keys
Locale: te.json (96 keys) -> [PASS] Zero missing keys
Locale: ta.json (96 keys) -> [PASS] Zero missing keys
Locale: ml.json (96 keys) -> [PASS] Zero missing keys
Locale: kn.json (96 keys) -> [PASS] Zero missing keys
============================================================
[SUCCESS] 100% LOCALE PARITY CONFIRMED across all 6 languages.
============================================================
```

### 3. Translation Coverage Boundaries
- **Fully Translated High-Traffic Surfaces**:
  - **Login Flow**: Portal selection cards, role selectors (Student, Examiner, Admin), quick-fill buttons, form inputs, error banners, and registration links.
  - **Global Navigation**: Header brand titles, live status indicator, instant demo action buttons, navigation tabs, sign in/sign out.
  - **Candidate Dashboard**: Welcome banners, metric statistics (Question Bank, Active Exams, Candidates, Mean Integrity), tab labels, candidate exam listings, and launch exam buttons.
  - **Active Exam Room**: Dynamic question counters (`Question X of Y`), previous/next buttons, answer saved status, submit exam actions, submit confirmation modal, and live biometric HUD status badges.
  - **PWA & System**: Offline fallback screens, app install prompts, and push reminder opt-ins.
- **Intentional Scope Boundaries (Untranslated)**:
  - Raw exam questions and MCQ choices stored inside the database remain in the language authored by the examiner (e.g., Computer Science technical terms in English).
  - Examiner subjective grading remarks and free-text notes written during live evaluation.

---

## 🔒 Security & Compliance Standards
- **Zero-Trust Architecture**: Every endpoint enforces JWT bearer validation and RBAC guards (`student`, `examiner`, `admin`).
- **Data Leak Prevention**: Student sessions receive sanitized question objects without model answers or rubric guidance.
- **Audit Logging**: All proctor incidents (gaze deviance, audio disturbances, tab shifts, window blurs) are immutably logged with millisecond timestamps and suspicion score deltas.
- **Digital Authenticity**: SHA-256 integrity seal prevents fraudulent scorecard alterations.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
