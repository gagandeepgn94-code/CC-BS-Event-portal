# GM University — Department of Cloud Computing & Business Systems (CC-BS)
## Event Management Portal — Technical & Operational Architecture Documentation

> **Official Departmental Platform Guide**  
> **Institution:** GM University  
> **Department:** Department of Cloud Computing & Business Systems (CC-BS)  
> **Academic Year:** 2026–2027  
> **Brand Identity:** Deep Maroon (`#541A1A`), GMU Warm Gold (`#D4A843`), Ivory White (`#FBF9F6`)  

---

## Table of Contents

1. [System Overview & Architecture](#1-system-overview--architecture)
   - 1.1 [Purpose & Scope](#11-purpose--scope)
   - 1.2 [Technology Stack](#12-technology-stack)
   - 1.3 [Repository Directory Structure](#13-repository-directory-structure)
   - 1.4 [System Architecture & End-to-End Request Flow](#14-system-architecture--end-to-end-request-flow)
2. [Roles, Authentication & Authorization](#2-roles-authentication--authorization)
   - 2.1 [User Roles & Permissions Matrix](#21-user-roles--permissions-matrix)
   - 2.2 [JWT Authentication & Security Architecture](#22-jwt-authentication--security-architecture)
   - 2.3 [Session Lifecycle & Client Storage](#23-session-lifecycle--client-storage)
   - 2.4 [Route & Action Guards (Backend & Frontend)](#24-route--action-guards-backend--frontend)
3. [Data Model & Database Migrations](#3-data-model--database-migrations)
   - 3.1 [Entity Relationship Diagram (ERD)](#31-entity-relationship-diagram-erd)
   - 3.2 [Core Database Tables & Column Specifications](#32-core-database-tables--column-specifications)
   - 3.3 [Alembic Database Migration Pipeline](#33-alembic-database-migration-pipeline)
4. [End-to-End 4-Stage Event Lifecycle & User Flows](#4-end-to-end-4-stage-event-lifecycle--user-flows)
   - 4.1 [Stage 1 — Planning, Circulars & Targeting](#41-stage-1--planning-circulars--targeting)
   - 4.2 [Stage 2 — Student Discovery, Registration & Personal Dashboard](#42-stage-2--student-discovery-registration--personal-dashboard)
   - 4.3 [Stage 3 — Conduction, Attendance, Photos & Judging](#43-stage-3--conduction-attendance-photos--judging)
   - 4.4 [Stage 4 — Conclusion, Feedback, Certificates & Dossier](#44-stage-4--conclusion-feedback-certificates--dossier)
5. [Complete API Endpoints & Frontend Routes Reference](#5-complete-api-endpoints--frontend-routes-reference)
   - 5.1 [FastAPI REST API Endpoints Reference](#51-fastapi-rest-api-endpoints-reference)
   - 5.2 [Next.js App Router Pages & Components Reference](#52-nextjs-app-router-pages--components-reference)
6. [Local Development, Build & Troubleshooting](#6-local-development-build--troubleshooting)
   - 6.1 [Environment Prerequisites](#61-environment-prerequisites)
   - 6.2 [Backend Setup & Database Initialization](#62-backend-setup--database-initialization)
   - 6.3 [Frontend Setup & Compilation](#63-frontend-setup--compilation)
   - 6.4 [Windows & Dropbox Synchronization Safeguards](#64-windows--dropbox-synchronization-safeguards)
   - 6.5 [Common Pitfalls & Diagnostic Guide](#65-common-pitfalls--diagnostic-guide)
7. [Security Architecture, Audit & Hardening](#7-security-architecture-audit--hardening)
   - 7.1 [Secrets, Seed Credentials & Git Hygiene](#71-secrets-seed-credentials--git-hygiene)
   - 7.2 [Authorization, Ownership & Lifecycle Enforcement](#72-authorization-ownership--lifecycle-enforcement)
   - 7.3 [File Uploads, Rate Limiting & Privacy Controls](#73-file-uploads-rate-limiting--privacy-controls)
   - 7.4 [Frontend Protections & Remaining Hardening Notes](#74-frontend-protections--remaining-hardening-notes)

---

## 1. System Overview & Architecture

### 1.1 Purpose & Scope

The **CC-BS Event Management Portal** is a purpose-built, enterprise-grade academic platform engineered for the **Department of Cloud Computing & Business Systems (CC-BS)** at **GM University**. 

The portal digitizes and unifies the complete academic event lifecycle for departmental technical workshops, hackathons, seminars, 1-hour skill sessions, and competitive hack fests:
- **Centralized Circular & Poster Management:** Faculty coordinators upload official university notices, guidelines, and promotional creatives.
- **Granular Academic Targeting:** Events are filtered and restricted by Year of Study (1st, 2nd, 3rd, 4th Year) and Branch (`CC`, `BS`, or `ALL`).
- **Real-Time Student Engagement:** Students register individually or in teams, track attendance status, view event schedules, and submit qualitative post-event feedback.
- **On-Ground Conduction & Evaluation:** Coordinators take live attendance, upload event photo albums, and evaluate entries with scores, ranks, and prize allocations.
- **Automated Credentialing & Reporting:** Instant bulk generation of QR-verifiable PDF certificates and automated departmental Dossier Reports summarizing metrics, attendance percentages, and winners.

---

### 1.2 Technology Stack

The platform is constructed on a decoupled modern web architecture:

| Tier | Component | Technology / Library | Version / Details |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Application Framework | **Next.js** (App Router) | `16.4.6` (React `19.3.0`, React DOM `19.3.0`) |
| | Bundler / Compiler | **Turbopack** | Next.js native build pipeline |
| | Styling Engine | **Tailwind CSS** + PostCSS | `4.3.3` (`@tailwindcss/turbopack`) |
| | Motion & Animations | **Framer Motion** | `14.14.0` (Wispr Flow custom curves) |
| | Iconography | **Lucide React** | `1.77.0` |
| | Typography | Google Fonts | `Instrument Serif` (Display), `Plus Jakarta Sans` (UI) |
| **Backend API**| REST Framework | **FastAPI** | Async Python ASGI framework (`0.1.0`) |
| | Application Server | **Uvicorn** (`uvicorn[standard]`) | ASGI HTTP/WebSocket server |
| | Data Validation | **Pydantic v2** & `pydantic-settings` | Type safety and schema validation |
| | Security / Auth | **Passlib** (`bcrypt==4.0.1`), **Python-Jose** | Cryptographic hashing & HS256 JWT tokens |
| **Database** | Database Engine | **PostgreSQL** | Relational database (port `5432`) |
| | Python Driver | **Psycopg 3** (`psycopg[binary]`) | Fast binary async PostgreSQL driver |
| | ORM | **SQLAlchemy** | `2.0` Declarative Mapped columns |
| | Migration Engine | **Alembic** | Version-controlled schema migrations |
| **Services** | PDF Generation | **ReportLab** | High-precision PDF rendering (A4 & Landscape) |
| | QR Code Engine | **qrcode** (`qrcode[pil]`) | ISO-compliant QR generation for cert verification |
| | Spreadsheet Export | **OpenPyXL** | Native `.xlsx` workbook generation with styled headers |
| | Object Storage | **Boto3** (AWS S3) | Presigned URL generator with zero-dependency local disk fallback |

---

### 1.3 Repository Directory Structure

```
ccbs-event-portal/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   ├── 9a443a672c73_initial_schema.py             # Initial schema: users, events, registrations, etc.
│   │   │   └── b1a2c3d4e5f6_event_lifecycle_and_feedback.py # Migration for branch targeting, lifecycle & feedbacks
│   │   ├── env.py                                         # Alembic runtime environment & ORM target metadata
│   │   ├── README
│   │   └── script.py.mako
│   ├── app/
│   │   ├── core/
│   │   │   ├── database.py                                # Engine, SessionLocal, Base, get_db, pydantic Settings
│   │   │   ├── s3.py                                      # AWS S3 / Local filesystem dual-mode storage helper
│   │   │   └── security.py                                # Bcrypt hashing, JWT creation/verification, role guards
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── models.py                                  # SQLAlchemy models: User, Event, Registration, etc.
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                                    # /api/v1/auth (register, login, me)
│   │   │   ├── conclude.py                                # /api/v1/events/{id}/conclude & /api/v1/verify
│   │   │   ├── conduction.py                              # /api/v1/events/{id}/conduction (attendance, judging)
│   │   │   ├── events.py                                  # /api/v1/events (CRUD, guidelines, photos, feedback)
│   │   │   └── registrations.py                            # /api/v1/events/{id}/registrations & /api/v1/registrations/my
│   │   ├── schemas/
│   │   │   ├── auth.py                                    # Pydantic schemas for auth and user profiles
│   │   │   └── event.py                                   # Pydantic schemas for events, feedback, transitions
│   │   ├── services/
│   │   │   └── pdf_service.py                             # ReportLab engines for Certificates & Event Dossiers
│   │   ├── __init__.py
│   │   └── main.py                                        # FastAPI app factory, CORS, router mounting, static files
│   ├── uploads/                                           # Local storage folder for circulars, posters, photos, certs
│   ├── .env                                               # Backend environment config (DB, JWT, AWS credentials)
│   ├── alembic.ini                                        # Alembic database URL & migration configuration
│   ├── init_db.py                                         # Script to create ccbs_events PostgreSQL database
│   ├── requirements.txt                                   # Python dependencies
│   └── seed_admin.py                                      # Default HOD admin and coordinator user seed script
│
├── frontend/
│   ├── public/
│   │   ├── images/
│   │   │   ├── campus-bg.jpg                              # High-resolution campus hero background
│   │   │   └── gmu-logo.png                               # Official GM University department emblem
│   │   ├── campus-bg.jpg
│   │   └── *.svg
│   ├── src/
│   │   ├── app/
│   │   │   ├── coordinator/
│   │   │   │   └── events/
│   │   │   │       ├── [id]/
│   │   │   │       │   ├── CoordHubClient.tsx             # 3-Stage Coordinator Hub (Plan, Conduct, Conclude)
│   │   │   │       │   └── page.tsx                       # Server wrapper for Coordinator Hub
│   │   │   │       └── page.tsx                           # Coordinator Events List & Event Creation Drawer
│   │   │   ├── events/
│   │   │   │   └── [id]/
│   │   │   │       ├── EventDetailClient.tsx              # Student Event Detail & Registration page
│   │   │   │       └── page.tsx                           # Server wrapper for Event Detail
│   │   │   ├── student/
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx                           # Student Dashboard (My Events, Certs, Feedback Modal)
│   │   │   ├── verify/
│   │   │   │   ├── [code]/
│   │   │   │   │   ├── VerifyClient.tsx                   # Certificate Authenticity Display Engine
│   │   │   │   │   └── page.tsx                           # Server wrapper for /verify/[code]
│   │   │   │   └── page.tsx                               # Public Verification Code Search Input
│   │   │   ├── login/
│   │   │   │   └── page.tsx                               # Glassmorphic Login page
│   │   │   ├── register/
│   │   │   │   └── page.tsx                               # Student Registration page (USN & Year selector)
│   │   │   ├── globals.css                                # Tailwind directives, custom fonts & design tokens
│   │   │   ├── layout.tsx                                 # Root layout with Glassmorphic Navbar & Footer
│   │   │   └── page.tsx                                   # Public Department Notice Board & Hero Section
│   │   ├── components/
│   │   │   ├── Motion.tsx                                 # Framer motion primitives (FadeIn, Stagger, HoverCard)
│   │   │   ├── Navbar.tsx                                 # Adaptive Glassmorphic navigation bar
│   │   │   └── ui.tsx                                     # Shared UI badges (GroupBadge, StatusBadge, Spinner)
│   │   └── lib/
│   │       └── api.ts                                     # Strongly typed API client library for FastAPI
│   ├── .env.local                                         # Frontend config (NEXT_PUBLIC_API_URL)
│   ├── next.config.ts                                     # Turbopack CSS loader configuration
│   ├── package.json                                       # Node dependencies & scripts
│   └── tsconfig.json                                      # TypeScript configuration
└── PROJECT_DOCUMENTATION.md                               # Master technical & operational documentation
```

---

### 1.4 System Architecture & End-to-End Request Flow

```mermaid
flowchart TD
    subgraph Client ["Client Browser (Next.js 16 UI)"]
        UI_Home["Notice Board ('/')"]
        UI_Coord["Coord Hub ('/coordinator/events/[id]')"]
        UI_Student["Student Dashboard ('/student/dashboard')"]
        UI_Verify["Verify Portal ('/verify/[code]')"]
        API_Lib["Frontend Client ('src/lib/api.ts')"]
    end

    subgraph Backend ["FastAPI Application (Port 8000)"]
        Router_Auth["/api/v1/auth"]
        Router_Events["/api/v1/events"]
        Router_Reg["/api/v1/events/{id}/registrations"]
        Router_Cond["/api/v1/events/{id}/conduction"]
        Router_Conc["/api/v1/events/{id}/conclude"]
        Security["Security (JWT / Passlib Bcrypt)"]
        PDF_Service["PDF Service (ReportLab)"]
        S3_Helper["S3 Storage Helper (AWS / Local disk)"]
    end

    subgraph Storage ["Persistent Infrastructure"]
        Postgres[("PostgreSQL Database (ccbs_events)")]
        Disk_S3[("Object Storage (Local /uploads/ or AWS S3)")]
    end

    UI_Home -->|Fetch Events| API_Lib
    UI_Coord -->|Manage Stages| API_Lib
    UI_Student -->|Register & Feedback| API_Lib
    UI_Verify -->|Validate Code| API_Lib

    API_Lib -->|REST HTTP / JSON + Bearer JWT| Backend

    Router_Auth --> Security
    Security --> Postgres

    Router_Events --> Postgres
    Router_Events --> S3_Helper

    Router_Reg --> Postgres
    Router_Reg -->|Export XLSX| Postgres

    Router_Cond --> Postgres
    Router_Cond --> S3_Helper

    Router_Conc --> Postgres
    Router_Conc --> PDF_Service
    PDF_Service --> S3_Helper
    S3_Helper --> Disk_S3
```

---

## 2. Roles, Authentication & Authorization

### 2.1 User Roles & Permissions Matrix

The portal defines four distinct user roles mapped directly to university departmental roles via the `user_role` PostgreSQL enum:

| Role String | Description | Key Capabilities | Restricted Actions |
| :--- | :--- | :--- | :--- |
| `admin` | Department Head (HOD) / Systems Administrator | Unrestricted management of all events, coordinators, attendees, scores, guidelines, certificates, and dossiers. | None |
| `coordinator` | Faculty / Staff Event In-Charge | Create events, upload circulars & posters, edit planning guidelines, mark attendance, upload photos, input judge scores, trigger certificates, download dossier. | Limited to managing events assigned to their `coordinator_id` (or unassigned events). Cannot manage other coordinators' events. |
| `judge` | Event Evaluator / Jury Member | View participant rosters for assigned events and submit evaluation scores, feedback remarks, ranks, and prizes. | Cannot alter event guidelines, delete events, or alter registration statuses. |
| `student` | Undergraduate Student in CC-BS | View eligible notices, register for open events, view registered schedule, view attendance, download verified certificates, submit event ratings/reviews. | Cannot access `/coordinator/*`, mark attendance, or alter event statuses. |

---

### 2.2 JWT Authentication & Security Architecture

Authentication is stateless and implemented using standard JSON Web Tokens (JWT) adhering to RFC 7519:

1. **Password Hashing:** Passwords are never stored in plaintext. They are salted and hashed using `passlib.context.CryptContext` utilizing the `bcrypt` algorithm (`bcrypt==4.0.1`).
2. **Access Token Generation:** 
   - Endpoint: `POST /api/v1/auth/login`.
   - Claims:
     - `sub`: The UUID of the authenticated `User`.
     - `role`: The role string (`student`, `coordinator`, `admin`, `judge`).
     - `exp`: UTC expiration timestamp controlled by `ACCESS_TOKEN_EXPIRE_MINUTES` in `backend/.env` (default: 1440 minutes / 24 hours).
   - Algorithm: HMAC-SHA256 (`HS256`) signed with `JWT_SECRET`.
3. **Dependency-Based Route Guards (`app/core/security.py`):**
   - `get_current_user`: Inspects the HTTP `Authorization: Bearer <token>` header, decodes the token, checks signature and expiry, retrieves the user from PostgreSQL, verifies `is_active == True`, and returns the ORM `User` instance (or returns `401 Unauthorized`).
   - `get_optional_current_user`: Gracefully decodes token if provided without throwing errors; returns `None` for unauthenticated public requests. Enables public notice board queries while preserving student group filtering when signed in.
   - `require_roles(*roles)`: Higher-order dependency returning a guard callable that asserts `current_user.role in allowed_roles`, raising `403 Forbidden` on mismatch.

---

### 2.3 Session Lifecycle & Client Storage

On the Next.js client (`frontend/src/`):
- Upon successful login via `login(email, password)`:
  - Token is stored in `localStorage.setItem("token", data.access_token)`.
  - User details are fetched from `GET /api/v1/auth/me` and stored in `localStorage.setItem("user_info", JSON.stringify(me))`.
- Upon signout:
  - `localStorage.removeItem("token")` and `localStorage.removeItem("user_info")` are executed.
  - The client redirects to `/login` or `/`.

---

### 2.4 Route & Action Guards (Backend & Frontend)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant FE as Next.js (/coordinator/events/[id])
    participant Auth as Security Dependency (require_roles)
    participant API as FastAPI Router
    participant DB as PostgreSQL

    User->>FE: Open Event Management Hub
    FE->>API: PATCH /api/v1/events/{id}/guidelines (Header: Bearer JWT)
    API->>Auth: Verify JWT & Validate Role ("admin", "coordinator")
    alt Missing or Expired Token
        Auth-->>FE: 401 Unauthorized
        FE->>User: Redirect to /login
    else Role is "student"
        Auth-->>FE: 403 Forbidden ("Access denied. Required role(s): admin, coordinator")
        FE->>User: Display Toast Error
    else Valid Coordinator / Admin
        Auth->>API: Inject current_user (User ORM)
        API->>DB: Check if coordinator_id == user.id (or admin)
        API->>DB: UPDATE events SET guidelines...
        DB-->>API: Success
        API-->>FE: Return EventResponse JSON
        FE->>User: UI Updates & Toast "Guidelines saved"
    end
```

---

## 3. Data Model & Database Migrations

### 3.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ events : "coordinates"
    users ||--o{ registrations : "submits"
    users ||--o{ attendance : "marks"
    users ||--o{ judgements : "evaluates"
    users ||--o{ feedbacks : "writes"
    events ||--o{ registrations : "enrolls"
    events ||--o{ judgements : "scores"
    events ||--o{ feedbacks : "receives"
    registrations ||--o| attendance : "has"
    registrations ||--o| judgements : "evaluated_by"
    registrations ||--o| certificates : "issued"

    users {
        uuid id PK
        string name
        string usn UK
        string email UK
        string password_hash
        user_role role
        int target_group
        boolean is_active
        timestamptz created_at
    }

    events {
        uuid id PK
        string title
        text description
        string circular_s3_key
        string poster_s3_key
        int_array target_groups
        json target_branches
        string event_type
        string budget
        string venue_permission_status
        text judgment_criteria
        text prizes
        text concluding_remarks
        json event_photos
        text rules
        string location
        timestamptz event_date
        int max_participants
        event_status status
        uuid coordinator_id FK
        timestamptz created_at
    }

    registrations {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        string team_name
        jsonb team_members
        registration_status status
        timestamptz registered_at
    }

    attendance {
        uuid id PK
        uuid registration_id FK,UK
        boolean is_present
        uuid marked_by FK
        timestamptz check_in_time
    }

    judgements {
        uuid id PK
        uuid event_id FK
        uuid registration_id FK
        uuid judge_id FK
        numeric score
        text remarks
        int rank
        text prize_details
    }

    certificates {
        uuid id PK
        uuid registration_id FK,UK
        cert_type cert_type
        string verification_code UK
        string s3_key
        timestamptz issued_at
    }

    feedbacks {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        int rating
        text comment
        timestamptz created_at
    }
```

---

### 3.2 Core Database Tables & Column Specifications

#### 1. `users` Table
Stores authentication credentials, university identity, and roles.
- `id` (`UUID`, Primary Key, default `uuid.uuid4()`)
- `name` (`VARCHAR(255)`, Not Null): Full name of student or faculty member.
- `usn` (`VARCHAR(20)`, Unique, Nullable): University Seat Number (e.g., `1GM22CS045`).
- `email` (`VARCHAR(255)`, Unique, Not Null): Official university or departmental email address.
- `password_hash` (`VARCHAR(255)`, Not Null): Bcrypt password hash.
- `role` (`ENUM('admin', 'coordinator', 'judge', 'student')`, Not Null, Default `'student'`).
- `target_group` (`INTEGER`, Nullable): Academic Year (`1`, `2`, `3`, or `4`).
- `is_active` (`BOOLEAN`, Not Null, Default `True`).
- `created_at` (`TIMESTAMPTZ`, Server Default `now()`, Not Null).

#### 2. `events` Table
Contains event planning data, target filtering, uploaded asset keys, and lifecycle status.
- `id` (`UUID`, Primary Key)
- `title` (`VARCHAR(255)`, Not Null)
- `description` (`TEXT`, Nullable)
- `circular_s3_key` (`VARCHAR(512)`, Nullable): Object key for uploaded PDF circular.
- `poster_s3_key` (`VARCHAR(512)`, Nullable): Object key for event creative poster.
- `target_groups` (`ARRAY(INTEGER)`, Nullable): Array of allowed academic years (e.g. `[1, 2]`).
- `target_branches` (`JSON`, Nullable, Default `["ALL"]`): Array of branches e.g. `["CC", "BS"]` or `["ALL"]`.
- `event_type` (`VARCHAR(100)`, Nullable): `"Workshop"`, `"Hackathon"`, `"Seminar"`, `"1-Hour Session"`, etc.
- `budget` (`VARCHAR(100)`, Nullable): Financial allocation string (e.g. `"₹15,000"`).
- `venue_permission_status` (`VARCHAR(50)`, Default `'pending'`): Status e.g. `'pending'` or `'approved'`.
- `judgment_criteria` (`TEXT`, Nullable): Criteria for evaluation and scoring rubric.
- `prizes` (`TEXT`, Nullable): Description of awards, prize pool, or merchandise.
- `concluding_remarks` (`TEXT`, Nullable): Post-event summary recorded by the coordinator.
- `event_photos` (`JSON`, Default `[]`): Array of object keys or URLs for event conduction photos.
- `rules` (`TEXT`, Nullable): Detailed student guidelines and compliance rules.
- `location` (`VARCHAR(255)`, Nullable): Venue (e.g. `"Auditorium Block A"`).
- `event_date` (`TIMESTAMPTZ`, Nullable): Scheduled event date and start time.
- `max_participants` (`INTEGER`, Nullable): Capacity cap (enforced at registration).
- `status` (`ENUM('draft', 'open', 'live', 'concluded')`, Not Null, Default `'draft'`).
- `coordinator_id` (`UUID`, Foreign Key `users.id` on delete `SET NULL`, Nullable).
- `created_at` (`TIMESTAMPTZ`, Server Default `now()`, Not Null).

#### 3. `registrations` Table
Tracks individual and team event registrations.
- `id` (`UUID`, Primary Key)
- `event_id` (`UUID`, Foreign Key `events.id` on delete `CASCADE`, Not Null)
- `user_id` (`UUID`, Foreign Key `users.id` on delete `CASCADE`, Not Null)
- `team_name` (`VARCHAR(255)`, Nullable)
- `team_members` (`JSONB`, Nullable): Free-form member metadata.
- `status` (`ENUM('pending', 'confirmed', 'cancelled')`, Not Null, Default `'pending'`)
- `registered_at` (`TIMESTAMPTZ`, Server Default `now()`, Not Null)
- *Constraint:* `UniqueConstraint('event_id', 'user_id', name='uq_registration_event_user')` prevents duplicate student sign-ups.

#### 4. `attendance` Table
Records participant verification and check-in timestamp.
- `id` (`UUID`, Primary Key)
- `registration_id` (`UUID`, Foreign Key `registrations.id` on delete `CASCADE`, Unique, Not Null)
- `is_present` (`BOOLEAN`, Not Null, Default `False`)
- `marked_by` (`UUID`, Foreign Key `users.id` on delete `SET NULL`, Nullable)
- `check_in_time` (`TIMESTAMPTZ`, Nullable)

#### 5. `judgements` Table
Records judge evaluations, scores, ranks, and prizes.
- `id` (`UUID`, Primary Key)
- `event_id` (`UUID`, Foreign Key `events.id` on delete `CASCADE`, Not Null)
- `registration_id` (`UUID`, Foreign Key `registrations.id` on delete `CASCADE`, Not Null)
- `judge_id` (`UUID`, Foreign Key `users.id` on delete `CASCADE`, Not Null)
- `score` (`NUMERIC(5, 2)`, Nullable): Score from `0.00` to `100.00`.
- `remarks` (`TEXT`, Nullable): Evaluator feedback notes.
- `rank` (`INTEGER`, Nullable): Numerical rank assigned (1st, 2nd, etc.).
- `prize_details` (`TEXT`, Nullable): Prize designation (e.g. "1st Place Winner").

#### 6. `certificates` Table
Stores issued verifiable credentials.
- `id` (`UUID`, Primary Key)
- `registration_id` (`UUID`, Foreign Key `registrations.id` on delete `CASCADE`, Unique, Not Null)
- `cert_type` (`ENUM('participation', 'winner')`, Not Null, Default `'participation'`)
- `verification_code` (`VARCHAR(64)`, Unique, Not Null): Alphanumeric hex verification token.
- `s3_key` (`VARCHAR(512)`, Nullable): Storage key for the generated PDF.
- `issued_at` (`TIMESTAMPTZ`, Server Default `now()`, Not Null)

#### 7. `feedbacks` Table
Captures student ratings and commentary following event conclusion.
- `id` (`UUID`, Primary Key)
- `event_id` (`UUID`, Foreign Key `events.id` on delete `CASCADE`, Not Null)
- `user_id` (`UUID`, Foreign Key `users.id` on delete `CASCADE`, Not Null)
- `rating` (`INTEGER`, Not Null): Star rating from 1 to 5.
- `comment` (`TEXT`, Nullable): Student feedback comment.
- `created_at` (`TIMESTAMPTZ`, Server Default `now()`, Not Null)

---

### 3.3 Alembic Database Migration Pipeline

Schema evolution is strictly managed via Alembic:

1. **`9a443a672c73_initial_schema.py`**
   - Creates the core schema, enum types (`user_role`, `event_status`, `registration_status`, `cert_type`), and primary tables (`users`, `events`, `registrations`, `attendance`, `certificates`, `judgements`).
2. **`b1a2c3d4e5f6_event_lifecycle_and_feedback.py`**
   - Introduces expanded event lifecycle columns (`target_branches`, `event_type`, `budget`, `venue_permission_status`, `judgment_criteria`, `prizes`, `concluding_remarks`, `event_photos`) to the `events` table.
   - Creates the `feedbacks` table with foreign key cascade deletions on `event_id` and `user_id`.

**Applying Migrations:**
```powershell
cd backend
venv\Scripts\python.exe -m alembic upgrade head
```

---

## 4. End-to-End 4-Stage Event Lifecycle & User Flows

The CC-BS portal models the faculty's four sequential event management stages. Each stage is strictly tied to the event state machine (`draft` → `open` → `live` → `concluded`).

```mermaid
stateDiagram-v2
    [*] --> Draft : Coordinator Creates Event
    Draft --> Open : Publish Notice / Open Registrations
    Open --> Live : Event Commences (Mark Live)
    Open --> Draft : Withdraw to Draft (Optional)
    Live --> Concluded : Finalize Event (Conclude)
    Concluded --> [*]

    note right of Draft
        Stage 1: Planning
        Targeting (1st-4th Year, CC/BS),
        Budget, Rules, Venue, Circular PDF, Poster
    end note

    note right of Open
        Stage 2: Discovery
        Notice Board filtering,
        Student registrations & capacity checks
    end note

    note right of Live
        Stage 3: Conduction
        Live attendance marking, Photo uploads,
        Judge scoring, Ranks & Prizes
    end note

    note right of Concluded
        Stage 4: Conclusion
        Remarks, Student feedback & ratings,
        QR Certificates, Dossier PDF Report
    end note
```

---

### 4.1 Stage 1 — Planning, Circulars & Targeting

**Objective:** Enable faculty coordinators to plan, target, document, and publish departmental initiatives.

1. **Create Event Drawer (`frontend/src/app/coordinator/events/page.tsx`):**
   - Coordinators open the slide-over drawer and supply:
     - **Title & Description:** Full event name and description.
     - **Year Targeting:** Multi-select pill controls for `1st Year`, `2nd Year`, `3rd Year`, and `4th Year` (serialized as `target_groups: [1, 2, ...]`).
     - **Branch Targeting:** Multi-select pill controls for `CC` (Cloud Computing), `BS` (Business Systems), or `ALL` (serialized as `target_branches: ["CC", "BS"]`).
     - **Event Type:** Classification dropdown (`Workshop`, `Hackathon`, `Seminar`, `1-Hour Session`, `Competition`).
     - **Budget & Permissions:** Estimated budget allocation (e.g. `₹15,000`) and venue approval toggle (`pending` vs `approved`).
     - **Rules & Judgment Criteria:** Official guidelines, judging rubric, and prize specifications.
     - **Files:** Multi-part file uploads for the official **PDF Circular** and **Banner Poster**.
2. **Publish Notice:**
   - Submitting with "Publish Notice" defaults `status = "open"`, broadcasting the notice immediately to the Department Notice Board.

---

### 4.2 Stage 2 — Student Discovery, Registration & Personal Dashboard

**Objective:** Provide a fast, accessible portal for undergraduate students to discover relevant departmental notices, enroll with one click, and track credentials.

1. **Public Department Notice Board (`frontend/src/app/page.tsx`):**
   - **Hero Section:** Features GM University branding, campus background with glassmorphic overlay, Academic Year 2026–27 indicator, and direct dashboard quick-links.
   - **Filter Pills:**
     - Status: `All Events`, `Open`, `Live`.
     - Academic Years: `1st Year`, `2nd Year`, `3rd Year`, `4th Year`.
     - Branches: `CC`, `BS`.
   - **Live Search:** Instant client-side search across titles, locations, descriptions, and event types.
2. **Event Details & Registration (`frontend/src/app/events/[id]/EventDetailClient.tsx`):**
   - Displays event date, venue, circular download button, poster image, and rules.
   - Enforces student eligibility: verifies that `current_user.target_group` matches `event.target_groups`.
   - Checks capacity against `event.max_participants`.
   - Submitting calls `POST /api/v1/events/{id}/registrations/` and records a confirmed registration.
3. **Student Dashboard (`frontend/src/app/student/dashboard/page.tsx`):**
   - Real-time stat tiles: Registered Events, Attended Count, Certificates Earned.
   - Registration cards showing check-in status (Attended vs Pending).
   - Instant download button for verified PDF certificates when issued.
   - **Submit Feedback Modal:** Students rate concluded events (1 to 5 stars) and submit qualitative feedback comments.

---

### 4.3 Stage 3 — Conduction, Attendance, Photos & Judging

**Objective:** Provide coordinators with an on-ground operational console during event execution.

1. **Coordinator Hub Stage Navigation (`frontend/src/app/coordinator/events/[id]/CoordHubClient.tsx`):**
   - Tab 2 (`Conduct & Photos`) unlocks when the event transitions to `open`, `live`, or `concluded`.
2. **Attendance Management:**
   - Displays the complete participant roster (Name, USN, Target Year, Email, Registration Time).
   - Allows instant single-click attendance toggle per participant or bulk mark attendance.
   - Calls `POST /api/v1/events/{id}/conduction/attendance`.
3. **Event Conduction Photos Gallery:**
   - Multi-file photo upload (`POST /api/v1/events/{id}/photos`).
   - Uploads are saved into storage under `events/{id}/photos/` and displayed in an interactive visual gallery.
4. **Judging & Evaluation:**
   - Coordinators or Judges click "Evaluate" on any participant row to open the evaluation modal:
     - Numerical score (`0.00` to `100.00`).
     - Rank (`1`, `2`, `3`...).
     - Prize Details (e.g., `"1st Place Winner - Cash Prize ₹5,000"`).
     - Qualitative remarks.
   - Calls `POST /api/v1/events/{id}/conduction/judgement`.
5. **Participant Excel Export:**
   - Clicking "Export Excel" triggers `GET /api/v1/events/{id}/registrations/export`, streaming a formatted `.xlsx` workbook containing all student records, USNs, and attendance flags.

---

### 4.4 Stage 4 — Conclusion, Feedback, Certificates & Dossier

**Objective:** Formalize event conclusion, archive feedback, generate tamper-proof certificates, and produce accreditation dossiers.

1. **Event Finalization:**
   - Advancing the status pill to `concluded` locks further registrations and unlocks Stage 3 (`Conclude & Feedback`).
   - The coordinator records and saves official **Concluding Remarks**.
2. **Student Feedback Review:**
   - Coordinators view the departmental feedback summary:
     - Aggregate Average Rating (e.g. `4.8 / 5.0`).
     - Total review count.
     - Scrollable list of verified student comments and timestamps.
3. **One-Click Certificate Generation:**
   - Coordinator triggers "Generate All Certificates" (`POST /api/v1/events/{id}/conclude/certificates/generate`).
   - The backend PDF service (`pdf_service.py`) iterates through all participants marked `is_present == True`:
     - Assigns a unique cryptographic verification UUID (`verification_code`).
     - Renders a landscape A4 PDF featuring GM University CC-BS branding.
     - Distinguishes between **Certificate of Achievement** (for ranked winners with prize metadata) and **Certificate of Participation**.
     - Generates and embeds an ISO QR code linking directly to the verification endpoint (`/verify/{code}`).
     - Stores the PDF in S3/local storage and persists the record in `certificates`.
4. **Public Certificate Verification Portal (`/verify/[code]`):**
   - Third-party verifiers scan the QR code or enter the code on the web portal.
   - The backend confirms validity, returning recipient name, USN, event title, date of issue, and a secure download link.
5. **Official Event Dossier PDF Report:**
   - Coordinator clicks "Download Event Dossier" (`GET /api/v1/events/{id}/conclude/report`).
   - Generates an executive departmental report including:
     - Event title, date, venue, and coordinator metadata.
     - Total registration metrics, attendance count, and attendance percentage.
     - Complete formatted table of ranked winners, scores, and awarded prizes.

---

## 5. Complete API Endpoints & Frontend Routes Reference

### 5.1 FastAPI REST API Endpoints Reference

All endpoints are prefixed with `/api/v1`:

| Router | Method | Path | Summary / Purpose | Access / Role Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/register` | Register new student account (Name, Email, USN, Year, Password) | Public |
| | `POST` | `/auth/login` | Authenticate user and return Bearer JWT token + user role | Public |
| | `GET` | `/auth/me` | Fetch currently authenticated user profile | Authenticated (Any) |
| **Events** | `POST` | `/events/` | Create a new event with optional circular PDF & poster upload | `admin`, `coordinator` |
| | `GET` | `/events/` | List all events (public sees open/live/concluded; coordinators see all) | Public / Optional Auth |
| | `GET` | `/events/{id}` | Get full event detail with presigned file URLs | Public / Student (Group check) |
| | `PATCH` | `/events/{id}/guidelines` | Update rules, location, budget, criteria, prizes, remarks | `admin`, Assigned `coordinator` |
| | `PATCH` | `/events/{id}/status` | Advance event status (`draft` → `open` → `live` → `concluded`) | `admin`, Assigned `coordinator` |
| | `POST` | `/events/{id}/photos` | Upload event conduction photos | `admin`, `coordinator` |
| | `POST` | `/events/{id}/feedback` | Submit student rating (1–5) and feedback comment | Authenticated Student (Enrolled) |
| | `GET` | `/events/{id}/feedback` | Retrieve average rating and student feedback comments list | Authenticated (Any) |
| **Registrations** | `POST` | `/events/{id}/registrations/` | Enroll current student in an open event | `student` |
| | `GET` | `/events/{id}/registrations/` | List all registered participants with attendance status | `admin`, `coordinator`, `judge` |
| | `GET` | `/events/{id}/registrations/export` | Export participant roster as `.xlsx` spreadsheet | `admin`, `coordinator` |
| | `GET` | `/registrations/my` | List logged-in student's personal registrations, attendance & certs | `student` |
| **Conduction** | `POST` | `/events/{id}/conduction/attendance` | Mark single or bulk participant attendance (`is_present`) | `admin`, `coordinator` |
| | `POST` | `/events/{id}/conduction/judgement` | Record evaluation score (0–100), rank, prize, and remarks | `admin`, `coordinator`, `judge` |
| **Conclude** | `POST` | `/events/{id}/conclude/certificates/generate` | Batch-generate QR certificates for verified attendees | `admin`, Assigned `coordinator` |
| | `GET` | `/events/{id}/conclude/verify/{code}` | Verify certificate authenticity for a specific event | Public |
| | `GET` | `/verify/{code}` | Global public certificate verification with download URL | Public |
| | `GET` | `/events/{id}/conclude/report` | Download official Event Dossier summary PDF report | `admin`, Assigned `coordinator` |
| **Health** | `GET` | `/health` | Server liveness probe returning `{"status": "ok"}` | Public |

---

### 5.2 Next.js App Router Pages & Components Reference

| Route | File Path | Type | Purpose & Description |
| :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Client Component | Public Department Notice Board: hero section, search bar, status & year/branch filter pills, event card grid. |
| `/login` | `src/app/login/page.tsx` | Client Component | Glassmorphic portal login form for students and faculty. |
| `/register` | `src/app/register/page.tsx` | Client Component | Student account creation with USN and Year selector pills. |
| `/coordinator/events` | `src/app/coordinator/events/page.tsx` | Client Component | Coordinator console: displays event cards, metrics, and slide-over event creation drawer. |
| `/coordinator/events/[id]` | `src/app/coordinator/events/[id]/page.tsx` | Server Wrapper | Dynamic route server entry point wrapping `CoordHubClient.tsx` in a React Suspense boundary. |
| — | `src/app/coordinator/events/[id]/CoordHubClient.tsx` | Client Component | 3-Stage Coordinator Hub: Plan & Target, Conduct & Photos (attendance, judging, gallery), and Conclude & Feedback (certificates, dossier). |
| `/events/[id]` | `src/app/events/[id]/page.tsx` | Server Wrapper | Dynamic route server entry point wrapping `EventDetailClient.tsx`. |
| — | `src/app/events/[id]/EventDetailClient.tsx` | Client Component | Student Event Detail page: circular download, poster display, guidelines, and registration trigger. |
| `/student/dashboard` | `src/app/student/dashboard/page.tsx` | Client Component | Personal student dashboard: enrolled events, attendance badges, certificate download buttons, and feedback modal. |
| `/verify` | `src/app/verify/page.tsx` | Client Component | Public certificate search portal to enter verification codes manually. |
| `/verify/[code]` | `src/app/verify/[code]/page.tsx` | Server Wrapper | Server wrapper for the dynamic verification route. |
| — | `src/app/verify/[code]/VerifyClient.tsx` | Client Component | Visual certificate verification engine displaying student details, issue date, GMU badge, and download link. |
| — | `src/components/Navbar.tsx` | Client Component | Glassmorphic, role-aware top navigation bar with adaptive backgrounds for dark hero and light pages. |
| — | `src/components/Motion.tsx` | Client Primitives | Reusable Framer Motion components (`FadeIn`, `StaggerContainer`, `StaggerItem`, `HoverCard`) with reduced-motion support. |
| — | `src/components/ui.tsx` | UI Primitives | Shared badges (`GroupBadge`, `StatusBadge`), loading spinners, and styled alerts. |
| — | `src/lib/api.ts` | TypeScript Library | Typed API client wrapping `fetch` for all backend REST endpoints. |

---

## 6. Local Development, Build & Troubleshooting

### 6.1 Environment Prerequisites

- **Python:** Version `3.10` to `3.12` with `pip` and virtual environment support.
- **Node.js:** Version `20.x` or `22.x` with `npm`.
- **PostgreSQL:** Running instance on `localhost:5432` with administrative access (default username `postgres`).

---

### 6.2 Backend Setup & Database Initialization

1. **Activate Virtual Environment:**
   ```powershell
   cd "c:\Users\Gagandeep G\Dropbox\CC-BS web portal\ccbs-event-portal\backend"
   venv\Scripts\activate
   ```

2. **Install Dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (`backend/.env`):**
   ```env
   # Database Connection
   DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/ccbs_events

   # Security & Authentication (Generate using: python -c "import secrets; print(secrets.token_urlsafe(48))")
   JWT_SECRET=your_generated_random_secret_here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Seed credentials for initial setup (read by seed_admin.py)
   SEED_ADMIN_PASSWORD=<set-strong-admin-password>
   SEED_COORD_PASSWORD=<set-strong-coordinator-password>

   # AWS S3 Storage (Leave empty for automatic local filesystem fallback to backend/uploads/)
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=
   ```

4. **Initialize Database & Seed Accounts:**
   ```powershell
   # 1. Create the ccbs_events PostgreSQL database
   python init_db.py

   # 2. Run Alembic migrations to build tables and schema
   python -m alembic upgrade head

   # 3. Seed default HOD Admin and Coordinator accounts
   python seed_admin.py
   ```

   *Initial Seed Accounts:*
   - **HOD / Department Admin:** `admin@ccbs.edu.in` | Password configured via `SEED_ADMIN_PASSWORD`
   - **Event Coordinator:** `coord@ccbs.edu.in` | Password configured via `SEED_COORD_PASSWORD`

5. **Start FastAPI Backend Server:**
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   - Swagger Documentation: `http://localhost:8000/docs`
   - ReDoc Documentation: `http://localhost:8000/redoc`
   - Health Probe: `http://localhost:8000/health`

---

### 6.3 Frontend Setup & Compilation

1. **Navigate & Install Dependencies:**
   ```powershell
   cd "c:\Users\Gagandeep G\Dropbox\CC-BS web portal\ccbs-event-portal\frontend"
   npm install
   ```

2. **Configure Environment Variables (`frontend/.env.local`):**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

3. **Run Development Server:**
   ```powershell
   npm run dev
   ```
   The portal runs on `http://localhost:3000`.

4. **Production Build & Verification:**
   ```powershell
   npm run build
   ```
   Compiles all routes using Next.js Turbopack, verifying 0 TypeScript errors.

---

### 6.4 Windows & Dropbox Synchronization Safeguards

When developing inside a synchronized Dropbox folder on Windows, background synchronization locks can trigger `EPERM` or `EBUSY` file access errors during compilation in directories like `.next/`, `node_modules/`, and Python's `venv/`.

**Recommended Windows PowerShell Ignore Stream Fix:**
Mark build folders with the Dropbox ignore alternate data stream:
```powershell
# Ignore frontend build output and dependencies from Dropbox sync
Set-Content -Path "frontend\.next" -Stream "com.dropbox.ignored" -Value 1
Set-Content -Path "frontend\node_modules" -Stream "com.dropbox.ignored" -Value 1

# Ignore backend virtual environment from Dropbox sync
Set-Content -Path "backend\venv" -Stream "com.dropbox.ignored" -Value 1
```

---

### 6.5 Common Pitfalls & Diagnostic Guide

1. **"Each child in a list should have a unique 'key' prop" in React Tables:**
   - *Cause:* The backend `registrations` router returns participant dictionaries where primary keys might be referenced as `id` or `registration_id`.
   - *Resolution:* All table iterators and hover cards utilize safe composite fallbacks:
     ```tsx
     key={p.id ?? p.registration_id ?? `${p.student_id ?? p.usn}-${idx}`}
     ```

2. **"Event status transition rejected" (`422 Unprocessable Entity`):**
   - *Cause:* Attempting an invalid status jump (e.g. `draft` directly to `concluded`).
   - *Resolution:* Status transitions strictly follow the state machine in `_VALID_TRANSITIONS` (`draft` → `open` → `live` → `concluded`).

3. **Attendance or Score Submission Blocked:**
   - *Cause:* In early versions, `_require_live_event` enforced that only `live` events could record attendance.
   - *Resolution:* Conduction and attendance logging are permitted across `open`, `live`, and `concluded` states so coordinators can finalize check-ins and submit scores before and after event execution.

4. **PostgreSQL Psycopg Connection String Format:**
   - *Cause:* SQLAlchemy 2.0 requires `postgresql+psycopg://` as the URL dialect string, whereas raw Psycopg scripts (`init_db.py`) expect standard `postgresql://`.
   - *Resolution:* `init_db.py` automatically normalizes the connection URL at runtime using `.replace("postgresql+psycopg://", "postgresql://")`.

---

## 7. Security Architecture, Audit & Hardening

Following comprehensive security audits across the codebase, the CC-BS Event Management Portal incorporates multi-layered defensive controls across data storage, authorization, input validation, and HTTP security.

### 7.1 Secrets, Seed Credentials & Git Hygiene

- **Version Control Exclusion Rules:**
  - Both repository root [`.gitignore`](.gitignore) and [`backend/.gitignore`](backend/.gitignore) strictly exclude sensitive files:
    - Environment secrets: `.env`, `.env.*`, `*.env` (preserving only sanitized [`.env.example`](backend/.env.example)).
    - Dependencies & virtual environments: `venv/`, `env/`, `node_modules/`.
    - Build artifacts & caches: `.next/`, `out/`, `build/`, `__pycache__/`, `*.pyc`.
    - Uploaded files: `backend/uploads/*` (preserving directory structure via `.gitkeep`).
- **Cryptographic JWT Secret:**
  - Active `JWT_SECRET` in `backend/.env` is generated using a high-entropy 48-byte URL-safe string (`secrets.token_urlsafe(48)`), eliminating default or guessable placeholder secrets.
  - The public [`backend/.env.example`](backend/.env.example) template provides only safe documentation placeholders.
- **Environment-Driven Initial Credentials:**
  - [`backend/seed_admin.py`](backend/seed_admin.py) reads initial admin and coordinator passwords from environment variables (`SEED_ADMIN_PASSWORD` and `SEED_COORD_PASSWORD`) with clear console warnings when development fallbacks are utilized.

---

### 7.2 Authorization, Ownership & Lifecycle Enforcement

- **Broken Object-Level Authorization (IDOR) Defenses:**
  - **Attendance Management:** In [`backend/app/routers/conduction.py`](backend/app/routers/conduction.py), `_assert_can_manage_conduction()` asserts that only `admin` or the assigned event coordinator (`event.coordinator_id == current_user.id`) can record or alter participant check-ins.
  - **Evaluation & Scoring:** In [`backend/app/routers/conduction.py`](backend/app/routers/conduction.py), coordinators cannot submit or tamper with scores on events assigned to other faculty members.
  - **Rosters & Excel Export:** In [`backend/app/routers/registrations.py`](backend/app/routers/registrations.py), `list_registrations()` and `export_registrations()` verify event ownership before returning student PII (Names, USNs, Emails, Attendance).
  - **Institutional Scope for Judges:** Users with `role == "judge"` hold institution-wide evaluation privileges across live events. The database schema does not currently enforce an `assigned_judges` junction table, allowing departmental jury workflows without brittle per-event assignment dependencies.
- **Draft Event Privacy:**
  - In `get_event()` ([`backend/app/routers/events.py`](backend/app/routers/events.py)), events with `status == "draft"` are hidden from students, public visitors, and other coordinators, returning `404 Not Found` unless the caller is `admin` or the event creator.
- **Feedback Lifecycle & Attendance Gating:**
  - In `submit_feedback()` ([`backend/app/routers/events.py`](backend/app/routers/events.py)), reviews are strictly rejected unless:
    1. The event status is finalized as `concluded` (`event.status == "concluded"`).
    2. The student holds a confirmed registration AND is verified as present (`attendance.is_present == True`).

---

### 7.3 File Uploads, Rate Limiting & Privacy Controls

- **Extension, Magic-Byte & Size Validation:**
  - Implemented in `_validate_uploaded_file()` ([`backend/app/routers/events.py`](backend/app/routers/events.py)):
    - **PDF Circulars:** Extension restricted to `.pdf`, validated against `%PDF` magic bytes (offset 0), capped at **10 MB**.
    - **Posters & Conduction Photos:** Extensions restricted to `.jpg`, `.jpeg`, `.png`, `.webp`, validated against binary signatures (`\xff\xd8\xff` for JPEG, `\x89PNG` for PNG, `RIFF...WEBP` for WebP), capped at **5 MB**.
    - **Stored XSS Prevention:** Explicitly rejects `.svg`, `.html`, scripts, and executables.
- **Bcrypt DoS Mitigation:**
  - [`backend/app/schemas/auth.py`](backend/app/schemas/auth.py) enforces `max_length=128` on `UserRegisterRequest.password` and `UserLoginRequest.password`, preventing CPU exhaustion via oversized password payloads.
- **Rate Limiting with SlowAPI:**
  - Configured in [`backend/app/main.py`](backend/app/main.py) and [`backend/app/routers/auth.py`](backend/app/routers/auth.py) using an IP-based sliding window:
    - `POST /api/v1/auth/login`: capped at **10 requests / minute**.
    - `POST /api/v1/auth/register`: capped at **10 requests / minute**.
- **Student Privacy & Feedback Anonymization:**
  - `GET /api/v1/events/{event_id}/feedback` distinguishes between managers and general callers:
    - `admin` and assigned `coordinator` receive full reviewer identities (`user_name`, `user_id`).
    - Students and public visitors receive anonymized reviews (`user_name: "Verified Attendee"`, `user_id: None`).
- **Public Metadata Sanitization:**
  - In `_enrich()` ([`backend/app/routers/events.py`](backend/app/routers/events.py)), internal planning and financial fields (`budget`, `venue_permission_status`, `concluding_remarks`) are sanitized to `None` for unauthenticated visitors and non-managing students.

---

### 7.4 Frontend Protections & Remaining Hardening Notes

- **Client-Side Route Protection:**
  - [`frontend/src/app/coordinator/events/page.tsx`](frontend/src/app/coordinator/events/page.tsx) and [`CoordHubClient.tsx`](frontend/src/app/coordinator/events/[id]/CoordHubClient.tsx) inspect stored user roles and automatically redirect students to `/student/dashboard`.
- **Safe URI Encoding:**
  - All dynamic path segments in [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) (such as event IDs and verification codes) are encoded using `encodeURIComponent(...)` to prevent parameter injection.
- **HTTP Security Headers & CSP:**
  - Configured in [`frontend/next.config.ts`](frontend/next.config.ts) for all routes:
    - `X-Frame-Options: DENY` (Clickjacking prevention).
    - `X-Content-Type-Options: nosniff` (MIME-sniffing prevention).
    - `Referrer-Policy: strict-origin-when-cross-origin`.
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
    - `Content-Security-Policy`: Scoped to `'self'`, Google Fonts, local backend API (`http://localhost:8000`), and secure data/blob image sources.
- **Architectural & Future Hardening Roadmap:**
  - **Token Storage Migration:** JWT tokens are currently stored in browser `localStorage`. Future architectural phases can transition authentication to `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
  - **Per-Event Judge Mapping:** If multi-departmental jury segmentation is required in future academic sessions, an `event_judges` junction table or `assigned_judge_ids` array can be introduced to bind specific judges to specific competitions.

---

> **Department of Cloud Computing & Business Systems (CC-BS)**  
> **GM University**  
> *Developed with precision for academic excellence.*
