# AI Examination Platform — Next.js Frontend

This directory contains the Next.js (App Router) + TypeScript frontend application for the **AI-Based Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis**.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (White & Blue design system)
- **API Client**: Fetch API utilizing `NEXT_PUBLIC_API_URL`
- **Auth**: Isolated JWT Session state with client token management and server-side verification (`GET /users/me`).

---

## Project Structure

```text
frontend/
├── app/
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing page (/)
│   ├── login/page.tsx         # Login page (/login)
│   ├── register/page.tsx      # Register page (/register)
│   ├── dashboard/page.tsx     # Protected dashboard page (/dashboard)
│   └── unauthorized/page.tsx  # Unauthorized access fallback page (/unauthorized)
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx      # Login form component
│   │   └── RegisterForm.tsx   # Register form component
│   └── common/
│       ├── Loading.tsx        # Centered loading spinner
│       └── ProtectedRoute.tsx # Route guard wrapper calling GET /users/me
│
├── lib/
│   ├── api.ts                 # API client wrapper
│   ├── auth.ts                # Token session state manager
│   └── types.ts               # TypeScript interfaces (User, LoginRequest, etc.)
│
├── .env.local                 # Environment variables (NEXT_PUBLIC_API_URL=http://127.0.0.1:8000)
├── .env.example
├── package.json
└── README.md
```

---

## Setup & Running

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Endpoints Integrated

- `POST /auth/register` — User registration
- `POST /auth/login` — Authenticate and receive JWT access token
- `GET /users/me` — Authenticated current-user verification & profile fetch
