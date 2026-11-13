# Sweety - Blood Glucose Tracker 🍬

Sweety is a full-stack, production-grade Blood Glucose Tracking application designed to help diabetic and health-conscious users record, manage, and monitor their blood glucose readings across four daily slots.

Built with **React (TypeScript)**, **Node.js & Express.js**, and **PostgreSQL**, with strict security policies including **HttpOnly JWT cookies**, **transactional token rotation with replay detection**, and **CSRF protection**.

---

## Architecture & Security Highlights

1. **HttpOnly Cookie Authentication**:
   - Access tokens (15-minute expiry) and Refresh tokens (7-day expiry) are stored strictly in `HttpOnly`, `SameSite: Lax`, and `Secure` (in production) cookies.
   - Tokens are **never** exposed in JSON response bodies or stored in `localStorage`.
2. **Safe Transactional Token Rotation & Reuse Detection**:
   - Refresh tokens are hashed (SHA-256) and grouped by `family_id` (UUID) in PostgreSQL.
   - Token rotation runs inside an explicit database transaction with row-level locking (`SELECT ... FOR UPDATE`) to prevent concurrent race conditions.
   - If an already-used token is replayed, the entire session family is revoked immediately (`revoked_at = NOW()`), cookies are cleared, and HTTP 401 is returned.
3. **CSRF Protection**:
   - All state-changing requests (`POST`, `PATCH`, `DELETE`) require a valid `X-CSRF-Token` custom header matched against a signed `_csrf` cookie via `crypto.timingSafeEqual`.
4. **Timezone & Date Integrity**:
   - Application timezone is locked to **`Asia/Kolkata` (IST)**.
   - `reading_date` is stored purely as a PostgreSQL `DATE` (never converted to timestamp).
   - Future dates (evaluated in IST) are strictly prevented across all inputs.
5. **Deterministic Slot Sequence & Recyclability**:
   - Exactly 4 slots: `MORNING_FASTING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER`.
   - Max 4 readings per day per user (one per slot). Duplicate slots return `409 Conflict`.
   - Deleting a reading immediately frees up that slot for that date.
6. **Row-Level Ownership Isolation**:
   - Every read, update, and delete query enforces `WHERE user_id = $x`. Cross-user access attempts return `404 Not Found`.
7. **Comprehensive Reporting**:
   - **Daily Report**: Aggregates + individual slot breakdown.
   - **Month-to-Date (MTD) Report**: 1st of month through selected date.
   - **Monthly Report**: Entire **previous calendar month** relative to selected date.
   - **Graceful Empty States**: Returns `200 OK` with `null` metrics, `0` count, and `[]` readings when no data exists.

---

## Technology Stack

- **Frontend**:
  - React 19 with Vite & TypeScript
  - Tailwind CSS with shadcn/ui design tokens
  - Framer Motion (animated auth transitions)
  - Lucide React icons
  - React Hook Form with Zod validation
- **Backend**:
  - Node.js & Express.js (3-tier layered architecture)
  - PostgreSQL (`pg.Pool` with connection pooling and transactions)
  - bcrypt (password hashing with 10 salt rounds)
  - jsonwebtoken (JWT signing & verification)
- **Database & DevOps**:
  - PostgreSQL 16 (Docker Compose)
  - Automated SQL migration runner

---

## Quickstart Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

---

### 2. Environment Setup

Create `.env` in the project root (a pre-configured `.env` is already present, template available in `.env.example`):

```ini
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=sweety_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5433

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Security Secrets
JWT_ACCESS_SECRET=dev_sweety_jwt_access_secret_super_secure_key_12345
JWT_REFRESH_SECRET=dev_sweety_jwt_refresh_secret_super_secure_key_67890
COOKIE_SECRET=dev_sweety_cookie_signing_secret_key_13579
CSRF_SECRET=dev_sweety_csrf_secret_token_signing_key_24680
```

---

### 3. Start Database (Docker Compose)

Start the PostgreSQL container (mapped to host port **5433** to avoid collisions with local Postgres instances):

```bash
docker compose up -d
```

Verify that the container is healthy:
```bash
docker compose ps
```

---

### 4. Run Database Migrations

Run the automated migration runner to create tables, ENUM types, and constraints:

```bash
cd server
npm run migrate
```

*Expected output*: `Migration completed successfully! All tables created.`

---

### 5. Run the Automated Test Suite (50 Automated Tests)

Run the full end-to-end integration test suite:

```bash
cd server
npm test
```

*Expected output*: **`TOTAL TESTS: 50 | PASSED: 50 | 100% PASS RATE`**

---

### 6. Start the Backend Server

```bash
cd server
npm run dev
```
*Backend server runs on `http://localhost:5000`*

---

### 7. Start the Frontend Application

In a separate terminal:

```bash
cd client
npm run dev
```
*Frontend opens at `http://localhost:5173`*

---

## API Endpoints Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register new user & set HttpOnly cookies | No |
| `POST` | `/login` | Authenticate credentials & set HttpOnly cookies | No |
| `GET` | `/csrf-token` | Issue CSRF token & signed cookie | No |
| `POST` | `/refresh` | Rotate refresh token with reuse detection | CSRF Protected |
| `POST` | `/logout` | Revoke session family & clear cookies | CSRF Protected |
| `GET` | `/me` | Retrieve authenticated user profile | Yes (JWT Cookie) |

### Glucose Readings (`/api/v1/readings`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Log new glucose reading (40–600 mg/dL) | Yes + CSRF |
| `GET` | `/` | Fetch user reading history (sorted chronologically) | Yes |
| `PATCH` | `/:id` | Update date, slot, or value with ownership check | Yes + CSRF |
| `DELETE`| `/:id` | Delete reading & free slot for re-entry (204) | Yes + CSRF |

### Reports & Analytics (`/api/v1/reports`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/daily?date=YYYY-MM-DD` | Daily summary + individual slot breakdown | Yes |
| `GET` | `/month-to-date?date=YYYY-MM-DD` | Summary from 1st of month to selected date | Yes |
| `GET` | `/monthly?date=YYYY-MM-DD` | Summary for entire previous calendar month | Yes |

---

## Project Structure

```
Blood Glucose Tracker/
├── docker-compose.yml          # PostgreSQL 16 container definition
├── .env.example                # Environment variables template
├── README.md                   # Complete documentation
├── docs/                       # Project specifications & implementation plan
│   ├── Project_plan.md
│   ├── API_structure.md
│   ├── Imp_decision.md
│   └── Implementation_plan.md
├── server/                     # Backend Node.js / Express application
│   ├── migrations/             # SQL schema migrations (001_init_schema.sql)
│   └── src/
│       ├── config/             # PostgreSQL connection pool (db.js)
│       ├── controllers/        # auth, reading, report controllers
│       ├── middlewares/        # auth, csrf, readingValidation, errorHandler
│       ├── routes/             # authRoutes, readingRoutes, reportRoutes
│       ├── services/           # authService, readingService, reportService
│       ├── utils/              # password, tokens, cookies, date, reportDates
│       ├── scripts/            # migrate.js, testSuite.js
│       ├── app.js              # Express app setup & route mounting
│       └── server.js           # Server entry point (port 5000)
└── client/                     # Frontend React (Vite + TypeScript + Tailwind)
    └── src/
        ├── components/
        │   ├── dashboard/      # DashboardLayout, RecordsView, AnalyticsView, ReadingModal
        │   └── ui/             # shadcn primitives (button, input, label, card, auth-form-1)
        ├── context/            # AuthContext (global user state)
        ├── services/           # api.ts (credentials & CSRF handling)
        ├── App.tsx             # Root view switcher
        └── main.tsx            # React DOM entry point
```
