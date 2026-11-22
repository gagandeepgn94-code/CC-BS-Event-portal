# GM University — Department of Cloud Computing & Business Systems (CC-BS)
## Event Management Portal

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.1.0-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.3.3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-blueviolet)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-Institutional-541A1A)](#)

An enterprise-grade academic event management platform engineered specifically for the **Department of Cloud Computing & Business Systems (CC-BS)** at **GM University** for the **Academic Year 2026–2027**. 

The portal digitizes and unifies the end-to-end departmental event lifecycle—from faculty circular drafting and targeting by academic year and branch, to student discovery and registration, live attendance logging, photo gallery curation, jury scoring, one-click QR-verifiable certificate generation, and accredited departmental dossier reporting.

---

## Table of Contents

- [1. System Overview & Roles](#1-system-overview--roles)
- [2. Tech Stack & Directory Structure](#2-tech-stack--directory-structure)
- [3. End-to-End 4-Stage Event Lifecycle](#3-end-to-end-4-stage-event-lifecycle)
- [4. Security Controls & Environment Architecture](#4-security-controls--environment-architecture)
- [5. API Endpoints Reference](#5-api-endpoints-reference)
- [6. Local Development & Setup Guide](#6-local-development--setup-guide)
- [7. Windows & Dropbox Synchronization Safeguards](#7-windows--dropbox-synchronization-safeguards)

---

## 1. System Overview & Roles

The portal supports four distinct roles mapped directly to institutional departmental hierarchy:

| Role | Target Users | Key Capabilities |
| :--- | :--- | :--- |
| **`admin`** | Department Head (HOD) / System Admin | Unrestricted access across all events, faculty coordinators, student rosters, evaluations, circulars, certificates, and dossiers. |
| **`coordinator`** | Faculty / Staff Event In-Charge | Draft events, upload official PDF circulars and posters, target by year and branch, take live attendance, upload conduction photos, input scores/prizes, generate certificates, and download dossier reports for their assigned events. |
| **`judge`** | Technical Jury / Evaluator | View participant rosters and submit numeric scores (`0–100`), qualitative remarks, ranks, and prize allocations for live events. |
| **`student`** | Undergraduate CC-BS Students | Browse eligible notices on the Public Notice Board, register for open events, track check-in status on their personal dashboard, download verified PDF certificates, and submit post-event feedback. |

---

## 2. Tech Stack & Directory Structure

### 2.1 Technology Stack

- **Frontend:**
  - **Framework:** Next.js `16.4.6` (App Router, Turbopack compiler)
  - **Runtime & UI:** React `19.3.0`, Framer Motion `14.14.0`, Lucide React `1.77.0`
  - **Styling:** Tailwind CSS `4.3.3` (`@tailwindcss/turbopack`)
  - **Design System:** GM University Maroon (`#541A1A`), Gold (`#D4A843`), Warm Paper (`#FBF9F6`)
  - **Typography:** `Instrument Serif` (Display/Headlines), `Plus Jakarta Sans` (Body/UI)
- **Backend:**
  - **API Framework:** FastAPI `0.1.0` (Python 3.10–3.12, Uvicorn ASGI server)
  - **Database:** PostgreSQL with `psycopg 3` binary driver (`postgresql+psycopg://`)
  - **ORM & Migrations:** SQLAlchemy `2.0` Declarative Models, Alembic migrations
  - **Security & Auth:** Passlib with `bcrypt==4.0.1`, Python-Jose (HS256 JWT tokens, 24-hr expiry)
  - **Rate Limiting:** SlowAPI with in-memory / IP-based sliding window
  - **Document Engines:** ReportLab (A4 & Landscape PDF generation), `qrcode` (ISO-compliant QR codes), OpenPyXL (native `.xlsx` export)
  - **Storage Subsystem:** Boto3 (AWS S3) with zero-dependency local disk fallback (`backend/uploads/`)

---

### 2.2 Directory Structure

```
ccbs-event-portal/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   ├── 9a443a672c73_initial_schema.py             # Base database tables & enums
│   │   │   └── b1a2c3d4e5f6_event_lifecycle_and_feedback.py # Lifecycle fields & feedback table
│   │   └── env.py                                         # Alembic configuration
│   ├── app/
│   │   ├── core/
│   │   │   ├── database.py                                # Engine, SessionLocal, Base, Settings
│   │   │   ├── limiter.py                                 # SlowAPI rate limiter instance
│   │   │   ├── s3.py                                      # S3 storage helper with local fallback
│   │   │   └── security.py                                # Bcrypt hashing, JWT tokens, role guards
│   │   ├── models/
│   │   │   └── models.py                                  # User, Event, Registration, Attendance, etc.
│   │   ├── routers/
│   │   │   ├── auth.py                                    # /api/v1/auth (login, register, me)
│   │   │   ├── conclude.py                                # /api/v1/events/{id}/conclude & /api/v1/verify
│   │   │   ├── conduction.py                              # /api/v1/events/{id}/conduction (attendance, judging)
│   │   │   ├── events.py                                  # /api/v1/events (CRUD, uploads, photos, feedback)
│   │   │   └── registrations.py                            # /api/v1/events/{id}/registrations & /registrations/my
│   │   ├── schemas/
│   │   │   ├── auth.py                                    # Pydantic schemas for auth & profiles
│   │   │   └── event.py                                   # Pydantic schemas for events & status transitions
│   │   ├── services/
│   │   │   └── pdf_service.py                             # ReportLab certificate & dossier PDF generators
│   │   └── main.py                                        # FastAPI app, SlowAPI, CORS, static mounts
│   ├── uploads/                                           # Local storage for circulars, posters, photos, certs
│   ├── .env.example                                       # Documented configuration template
│   ├── alembic.ini                                        # Alembic database configuration
│   ├── init_db.py                                         # Database creation script
│   ├── requirements.txt                                   # Python dependencies
│   └── seed_admin.py                                      # Default HOD & Coordinator seed script
│
├── frontend/
│   ├── public/
│   │   ├── images/
│   │   │   ├── campus-bg.jpg                              # High-resolution campus hero background
│   │   │   └── gmu-logo.png                               # Official GM University department crest
│   │   └── *.svg
│   ├── src/
│   │   ├── app/
│   │   │   ├── coordinator/
│   │   │   │   └── events/
│   │   │   │       ├── [id]/CoordHubClient.tsx             # 3-Stage Coordinator Hub (Plan, Conduct, Conclude)
│   │   │   │       └── page.tsx                           # Coordinator Events List & Creation Drawer
│   │   │   ├── events/
│   │   │   │   └── [id]/EventDetailClient.tsx             # Student Event Detail & Registration Page
│   │   │   ├── student/
│   │   │   │   └── dashboard/page.tsx                     # Student Dashboard (My Events, Certs, Feedback)
│   │   │   ├── verify/
│   │   │   │   ├── [code]/VerifyClient.tsx                # Public Certificate Authenticity Display
│   │   │   │   └── page.tsx                               # Certificate Verification Code Search
│   │   │   ├── login/page.tsx                             # Glassmorphic Login Form
│   │   │   ├── register/page.tsx                          # Student Account Registration Form
│   │   │   ├── globals.css                                # Tailwind directives & design tokens
│   │   │   ├── layout.tsx                                 # Root layout with adaptive Glassmorphic Navbar
│   │   │   └── page.tsx                                   # Department Notice Board & Hero Section
│   │   ├── components/
│   │   │   ├── Motion.tsx                                 # Reusable Framer Motion animation primitives
│   │   │   ├── Navbar.tsx                                 # Glassmorphic responsive navigation bar
│   │   │   └── ui.tsx                                     # Shared badges (GroupBadge, StatusBadge, Spinner)
│   │   └── lib/
│   │       └── api.ts                                     # Strongly typed API client library
│   ├── .env.local                                         # Frontend configuration (NEXT_PUBLIC_API_URL)
│   ├── next.config.ts                                     # Turbopack & HTTP security headers configuration
│   └── package.json                                       # Node dependencies & build scripts
├── .gitignore                                             # Repository root git ignore rules
└── README.md                                              # Master project guide
```

---

## 3. End-to-End 4-Stage Event Lifecycle

The platform models the faculty's four sequential event stages through a finite state machine:
`draft` &rarr; `open` &rarr; `live` &rarr; `concluded`

```
  [Stage 1: Planning]          [Stage 2: Discovery]         [Stage 3: Conduction]        [Stage 4: Conclusion]
 ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
 │  Status: 'draft'   │       │   Status: 'open'   │       │   Status: 'live'   │       │ Status: 'concluded'│
 │                    │       │                    │       │                    │       │                    │
 │ • Year/Branch Pills│──────>│ • Notice Board     │──────>│ • Live Attendance  │──────>│ • Concluding Notes │
 │ • Budget & Venue   │Publish│ • Eligibility Check│ Start │ • Photo Gallery    │Finish │ • Feedback Reviews │
 │ • Circular & Poster│       │ • 1-Click Register │ Event │ • Judge Scoring    │ Event │ • QR Certificates  │
 │ • Rubrics & Prizes │       │ • Student Dashboard│       │ • Excel XLSX Export│       │ • Event Dossier PDF│
 └────────────────────┘       └────────────────────┘       └────────────────────┘       └────────────────────┘
```

### Stage 1: Planning, Circulars & Targeting (`draft`)
- Coordinators configure:
  - **Academic Year Targeting:** Multi-select pills for `1st Year`, `2nd Year`, `3rd Year`, and `4th Year`.
  - **Branch Targeting:** Multi-select pills for `CC` (Cloud Computing), `BS` (Business Systems), or `ALL`.
  - **Event Classification:** `Workshop`, `Hackathon`, `Seminar`, `1-Hour Session`, or `Competition`.
  - **Logistics & Budget:** Budget allocation string, venue approval toggle (`pending` vs `approved`), rules, criteria, and prizes.
  - **Official Assets:** Uploads for official PDF Circular (validated `%PDF`, max 10 MB) and event Poster (JPEG/PNG/WebP, max 5 MB).
- Submitting "Publish Notice" advances status to `open`.

### Stage 2: Student Discovery, Registration & Personal Dashboard (`open`)
- **Public Department Notice Board (`/`):** Filter by status (`All`, `Open`, `Live`), academic year (`1st`–`4th Year`), and branch (`CC`, `BS`), with live search.
- **Event Detail View (`/events/[id]`):** Displays schedules, venue, guidelines, circular download, and capacity checks.
- **Eligibility Validation:** Enforces that `current_user.target_group` is in `event.target_groups` before confirming registration.
- **Student Dashboard (`/student/dashboard`):** Real-time stat cards (Registered, Attended, Certificates), enrollment records, and post-event feedback submission.

### Stage 3: Conduction, Attendance, Photos & Judging (`live` / `open`)
- **Coordinator Hub (`/coordinator/events/[id]`):** Conduction tab unlocks when event is `open`, `live`, or `concluded`.
- **Attendance Tracking:** Real-time single-click or bulk check-in toggles (`is_present = True`).
- **Conduction Photos Gallery:** Multi-image photo upload (`POST /events/{id}/photos`) with magic-byte verification, displayed in an interactive gallery.
- **Jury Scoring & Evaluation:** Modal for numeric score (`0.00–100.00`), numerical rank (`#1`, `#2`), prize allocation, and evaluator feedback.
- **Roster Export:** Instant streaming download of participant data as a formatted `.xlsx` workbook.

### Stage 4: Conclusion, Feedback, Certificates & Dossier (`concluded`)
- **Concluding Remarks:** Formal post-event summary documented by the coordinator.
- **Student Feedback Analysis:** Average star rating and review list (student identities protected for non-managers).
- **One-Click Batch Certificate Generation:** Renders landscape A4 PDFs via ReportLab with GMU CC-BS branding, distinguishing between **Achievement** (for ranked winners with prize details) and **Participation**.
- **Cryptographic QR Verification:** Each certificate embeds an ISO QR code linking to `/verify/[code]`.
- **Departmental Dossier Report:** Instant generation of an executive A4 PDF dossier summarizing registrations, attendance percentages, and winner tables.

---

## 4. Security Controls & Environment Architecture

### 4.1 Authentication & Session Handling
- **Password Security:** Salted and hashed using `passlib.context.CryptContext` with `bcrypt==4.0.1`. Schemas cap passwords at `max_length=128` to prevent CPU exhaustion.
- **JWT Authorization:** Signed with HMAC-SHA256 (`HS256`) and a 48-byte URL-safe random secret key. Verified on protected routes via `get_current_user` and `require_roles(...)`.
- **Rate Limiting:** Integrated `SlowAPI` with `@limiter.limit("10/minute")` on `/api/v1/auth/login` and `/api/v1/auth/register`.

### 4.2 Broken Object-Level Authorization (IDOR) Defenses
- **Attendance Marking (`/conduction/attendance`):** Strictly restricted to `admin` or the assigned event coordinator (`event.coordinator_id == current_user.id`).
- **Scoring & Judging (`/conduction/judgement`):** Unassigned coordinators are blocked from submitting scores on events they do not coordinate.
- **Participant Rosters & Excel Export (`/registrations/` & `/export`):** Enforces ownership checks before returning student PII.
- **Draft Event Privacy (`get_event`):** Events in `draft` status return `404 Not Found` to students, public visitors, and other coordinators; accessible exclusively to the creator or `admin`.
- **Feedback Integrity:** `POST /feedback` requires `event.status == "concluded"` AND verified present attendance (`attendance.is_present == True`).

### 4.3 File Upload Hardening
- **Extension & Magic-Byte Whitelist:**
  - Circulars: strictly `.pdf` verifying `%PDF` header bytes (max 10 MB).
  - Posters & Photos: strictly `.jpg`, `.jpeg`, `.png`, `.webp` verifying JPEG/PNG/WebP magic bytes (max 5 MB).
  - Explicitly blocks `.svg`, `.html`, scripts, and executables, preventing Stored XSS.
- **Path Traversal Prevention:** Uses `Path(filename).name` stripped basenames prefixed with UUID directories.

### 4.4 Data Privacy & Security Headers
- **Student Feedback Privacy:** `GET /feedback` masks student names to `"Verified Attendee"` and sets `user_id = None` for non-managers; only `admin` and the owning coordinator see reviewer names.
- **Public Metadata Sanitization:** Internal fields (`budget`, `venue_permission_status`, `concluding_remarks`) are automatically stripped to `None` for unauthenticated or non-managing callers.
- **HTTP Security Headers (`frontend/next.config.ts`):** Injects `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a scoped `Content-Security-Policy`.
- **Client URI Safety:** All dynamic path parameters in `frontend/src/lib/api.ts` are wrapped with `encodeURIComponent(...)`.

---

## 5. API Endpoints Reference

All backend endpoints are prefixed with `/api/v1`:

| Router | Method | Path | Summary / Description | Access Control |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/register` | Register student account (Name, Email, USN, Year) | Public (Rate-limited: 10/min) |
| | `POST` | `/auth/login` | Authenticate user, return JWT token and role | Public (Rate-limited: 10/min) |
| | `GET` | `/auth/me` | Return currently authenticated user profile | Authenticated (Any role) |
| **Events** | `POST` | `/events/` | Create new event with optional circular PDF & poster | `admin`, `coordinator` |
| | `GET` | `/events/` | List all events (public sees open/live/concluded) | Public / Optional Token |
| | `GET` | `/events/{id}` | Get full event detail (drafts restricted to owner) | Public / Student (Group check) |
| | `PATCH` | `/events/{id}/guidelines` | Update rules, location, budget, criteria, prizes | `admin`, Assigned `coordinator` |
| | `PATCH` | `/events/{id}/status` | Advance lifecycle status (`draft` &rarr; `open` &rarr; `live` &rarr; `concluded`) | `admin`, Assigned `coordinator` |
| | `POST` | `/events/{id}/photos` | Upload conduction photo gallery (magic-byte checked) | `admin`, Assigned `coordinator` |
| | `POST` | `/events/{id}/feedback` | Submit rating (1–5) and review (concluded + attended) | Enrolled & Present Student |
| | `GET` | `/events/{id}/feedback` | List feedback (names anonymized for non-managers) | Authenticated (Any role) |
| **Registrations** | `POST` | `/events/{id}/registrations/` | Enroll student in open event (eligibility validated) | `student` |
| | `GET` | `/events/{id}/registrations/` | List registered participants with attendance flags | `admin`, Assigned `coordinator`, `judge` |
| | `GET` | `/events/{id}/registrations/export` | Download participant roster as `.xlsx` workbook | `admin`, Assigned `coordinator` |
| | `GET` | `/registrations/my` | List current student's personal registrations & certs | `student` |
| **Conduction** | `POST` | `/events/{id}/conduction/attendance` | Mark single or bulk participant attendance | `admin`, Assigned `coordinator` |
| | `POST` | `/events/{id}/conduction/judgement` | Record evaluation score, rank, prize, remarks | `admin`, Assigned `coordinator`, `judge` |
| **Conclude** | `POST` | `/events/{id}/conclude/certificates/generate` | Batch-generate QR certificates for verified attendees | `admin`, Assigned `coordinator` |
| | `GET` | `/events/{id}/conclude/verify/{code}` | Event-scoped certificate verification | Public |
| | `GET` | `/verify/{code}` | Global certificate verification with PDF download URL | Public |
| | `GET` | `/events/{id}/conclude/report` | Download official Event Dossier summary PDF report | `admin`, Assigned `coordinator` |
| **Health** | `GET` | `/health` | Liveness probe returning `{"status": "ok"}` | Public |

---

## 6. Local Development & Setup Guide

### 6.1 Prerequisites
- **Python:** `3.10` to `3.12` with `pip` and virtual environment support
- **Node.js:** `20.x` or `22.x` with `npm`
- **PostgreSQL:** Server running on `localhost:5432` with administrative access (default superuser `postgres`)

---

### 6.2 Backend Setup

1. **Navigate to the backend directory and activate virtual environment:**
   ```powershell
   cd backend
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install Python dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure environment variables (`backend/.env`):**
   Copy the documented template:
   ```powershell
   cp .env.example .env
   ```
   Edit `backend/.env`:
   ```ini
   # Database connection string
   DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/ccbs_events

   # JWT secret (generate a secure random 48-byte token)
   JWT_SECRET=your_generated_random_secret_here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Seed credentials for initial setup
   SEED_ADMIN_PASSWORD=<set-strong-admin-password>
   SEED_COORD_PASSWORD=<set-strong-coordinator-password>

   # AWS S3 Storage (leave empty for automatic local storage fallback to backend/uploads/)
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=
   ```

4. **Initialize database, run migrations, and seed default accounts:**
   ```powershell
   # Create ccbs_events PostgreSQL database
   python init_db.py

   # Apply all Alembic schema migrations
   python -m alembic upgrade head

   # Seed initial HOD Admin and Coordinator accounts
   python seed_admin.py
   ```

   *Initial Seed Accounts:*
   - **HOD / Admin:** `admin@ccbs.edu.in` | Password configured via `SEED_ADMIN_PASSWORD`
   - **Coordinator:** `coord@ccbs.edu.in` | Password configured via `SEED_COORD_PASSWORD`

5. **Start the FastAPI backend server:**
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   - Swagger Interactive Documentation: `http://localhost:8000/docs`
   - ReDoc Interactive Documentation: `http://localhost:8000/redoc`
   - Health Probe: `http://localhost:8000/health`

---

### 6.3 Frontend Setup

1. **Navigate to the frontend directory and install dependencies:**
   ```powershell
   cd frontend
   npm install
   ```

2. **Verify frontend environment configuration (`frontend/.env.local`):**
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

3. **Start the development server:**
   ```powershell
   npm run dev
   ```
   The portal will be accessible at `http://localhost:3000`.

4. **Verify production compilation:**
   ```powershell
   npm run build
   ```
   Compiles all routes using Next.js Turbopack, verifying 0 TypeScript errors.

---

## 7. Windows & Dropbox Synchronization Safeguards

When running development builds inside synchronized Dropbox folders on Windows, background synchronization engines can lock files inside `.next/`, `node_modules/`, and `venv/`, resulting in intermittent `EPERM` or `EBUSY` compilation errors.

**Apply Dropbox Ignore Streams (PowerShell):**
```powershell
# Exclude frontend build artifacts and dependencies from Dropbox sync
Set-Content -Path "frontend\.next" -Stream "com.dropbox.ignored" -Value 1
Set-Content -Path "frontend\node_modules" -Stream "com.dropbox.ignored" -Value 1

# Exclude backend virtual environment from Dropbox sync
Set-Content -Path "backend\venv" -Stream "com.dropbox.ignored" -Value 1
```

---

> **Department of Cloud Computing & Business Systems (CC-BS)**  
> **GM University**  
> *Developed with precision for academic excellence.*
