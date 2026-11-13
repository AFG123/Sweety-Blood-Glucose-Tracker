# Sweety – Blood Glucose Tracker 🍬

Sweety is a web application where diabetes patients can record up to 4 blood glucose readings a day and view daily, month-to-date, and monthly reports.

Built with **React (TypeScript + Tailwind CSS)** on the frontend, **Node.js & Express** on the backend, and **PostgreSQL** for storage.

---

## Demo Account

If you want to quickly test the app with pre-filled data, you can use the demo user created by the seed script:

- **Email:** `demo@sweety.com`
- **Password:** `Password123`

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running for PostgreSQL)

---

## Setup & Running the Project


### 1. Database Setup (Docker)

First, create your environment file from the example:

```bash
cp .env.example .env
```

Then start the PostgreSQL database container:

```bash
docker compose up -d
```


### 2. Backend Setup & Migrations

From the root folder, navigate to the `server` directory and install dependencies:

```bash
cd server
npm install
```

Run database migrations to create the tables, ENUM types, and constraints:

```bash
npm run migrate
```

### 3. Seed Sample Data (Optional but Recommended)

Populate the demo user and 27 realistic sample readings across today, earlier this month, and last month:

```bash
npm run seed
```

### 4. Run Automated Tests

Run the backend test suite (50 automated tests covering auth, CSRF, validations, CRUD, and reports):

```bash
npm test
```

### 5. Start the Backend Server

```bash
npm run dev
```

The backend API will run on `http://localhost:5000`.

### 6. Start the Frontend App

Open a new terminal, navigate to `client`, install dependencies, and start the Vite dev server:

```bash
cd client
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## API Summary

All endpoints return consistent JSON responses (`{ success, data }` or `{ success, message, errors }`).

### Auth (`/api/v1/auth`)
- `POST /register` – Register a new account (sets HttpOnly cookies)
- `POST /login` – Sign in with email and password
- `GET /csrf-token` – Issues anti-CSRF token
- `POST /refresh` – Rotates refresh token (CSRF protected)
- `POST /logout` – Logs out and clears auth cookies
- `GET /me` – Returns logged-in user profile

### Readings (`/api/v1/readings`)
- `POST /` – Add a new reading (date, slot, value)
- `GET /` – Get all readings for logged-in user (sorted by date & slot)
- `PATCH /:id` – Update reading date, slot, or value
- `DELETE /:id` – Delete reading (frees up the slot for that date)

### Reports (`/api/v1/reports`)
- `GET /daily?date=YYYY-MM-DD` – Stats + list of readings for selected day
- `GET /month-to-date?date=YYYY-MM-DD` – Stats from 1st of month to selected date
- `GET /monthly?date=YYYY-MM-DD` – Stats for the entire previous calendar month

---

## Notes

### Assumptions
1. **Timezone:** I used `Asia/Kolkata` (IST) as the application timezone. This ensures that checking for "future dates" is always accurate regardless of where the server or developer is hosted.
2. **Glucose Range:** The 40–600 mg/dl restriction is treated as a strict whole-number input validation rule as required by the assignment brief.
3. **Slots:** Only 4 fixed slots are permitted per day (`Morning (fasting)`, `After breakfast`, `After lunch`, `After dinner`). Once a reading is deleted, that slot immediately becomes available again for that date.
4. **Security Decisions:** Used `HttpOnly` cookies for both access and refresh tokens rather than `localStorage` to guard against XSS token theft, paired with custom `X-CSRF-Token` headers for CSRF defense and row-level locking for safe token rotation.

### What I'd Improve with More Time
- **Interactive Charts (Bonus):** Add a visual line chart using Recharts to display blood glucose trends over the month.
- **Pagination (Bonus):** Implement server-side pagination (`?page=1&limit=20`) on the readings history table so it scales cleanly when a user has hundreds of records.
- **Background Reminders (Bonus):** Set up a BullMQ job that sends an evening reminder email/notification if a user hasn't logged all 4 slots for the day.
- **Doctor Role (Bonus):** Add a clinician view where a doctor can see assigned patients and review their glycemic control reports.
