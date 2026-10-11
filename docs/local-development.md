# Local Development Guide

## 1. Prerequisites & Environment Setup

To run and develop the **Enterprise School ERP System** locally, ensure your workstation meets the following prerequisites:
- **Node.js**: `v20+` or `v24+` LTS (Node 24 recommended for native `node:sqlite` support).
- **npm**: `v10+` (on Windows PowerShell, invoke via `npm.cmd` if script execution policy restrictions are in place).
- **Git**: `v2.x`.
- **Memory**: Minimum 4GB RAM.
- **Disk Space**: At least 500MB free disk space.

---

## 2. Installation Steps

### Step 1: Install Dependencies
Install server-side dependencies:
```bash
npm.cmd install
```

Install frontend client dependencies:
```bash
cd client
npm.cmd install
cd ..
```

---

## 3. Environment Configuration

Copy the sample environment file to create your local `.env`:
```bash
cp .env.example .env
```

Verify your `.env` settings:
```ini
PORT=5000
NODE_ENV=development
DATABASE_PATH=./data/school_erp.sqlite
JWT_SECRET=super-secure-change-in-production-secret-key-32chars
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
DEFAULT_SCHOOL_ID=1
PAYMENT_GATEWAY_PROVIDER=mock
SMS_PROVIDER=mock
UDISE_EXPORT_ENABLED=true
```

---

## 4. Database Setup & Demo Data Seeding

### Apply Schema Migrations
```bash
npm.cmd run migrate
```
This runs `server/db/migrator.js` and applies all unapplied SQL scripts in `server/db/migrations/`.

### Seed Realistic Multi-Tenant Demo Data
```bash
npm.cmd run seed
```
This provisions:
- Global Superadmin
- School A ("Delhi Public Model School", code `DPMS-01`, UDISE `07010100101`)
- School B ("St. Xavier's International Academy", code `SXIA-02`, UDISE `07010100202`)
- Academic sessions, classes (Grades 9-12), sections, and subjects
- Admissions in various review states (`submitted`, `under_review`, `approved`, `rejected`, `enrolled`)
- Students, guardians, and RTE candidates
- Attendance records
- Fee heads, quarterly structures, allocations, payments with receipts, and adjustments
- Term assessments with CBSE marks and report cards
- Staff directory, timetable slots, homework, library catalog, transport routes, and notices.

---

## 5. Running the Application

### Option A: Unified Full-Stack Server (Recommended)
Build the frontend once, then serve both API and SPA from Express on port 5000:
```bash
cd client
npm.cmd run build
cd ..
npm.cmd start
```
Visit: **`http://localhost:5000`**

### Option B: Dual Development Servers with Hot Reload
In terminal 1 (Backend API):
```bash
npm.cmd run dev
```

In terminal 2 (Vite Frontend with HMR):
```bash
cd client
npm.cmd run dev
```
Visit: **`http://localhost:3000`** (Vite proxies `/api` calls directly to `http://localhost:5000`).

---

## 6. Running Automated Tests

Run the full suite of 53 automated tests:
```bash
npm.cmd test
```

To run individual test suites:
```bash
node --test tests/auth.test.js
node --test tests/tenant.test.js
node --test tests/fees.test.js
node --test tests/exams.test.js
node --test tests/e2e.test.js
```

---

## 7. Project Directory Structure

```
├── client/                     # React 18 + Vite Frontend SPA
│   ├── src/
│   │   ├── components/         # Reusable UI (Navbar, Sidebar)
│   │   ├── context/            # AuthContext (JWT, active school)
│   │   ├── services/           # Centralized API client
│   │   ├── views/              # Role-specific Views (15 modules)
│   │   ├── App.jsx             # Main router & layout shell
│   │   └── main.jsx            # React root mount
│   ├── tailwind.config.js      # Styling configuration
│   └── vite.config.js          # Build configuration & proxy
├── docs/                       # Architecture & operational manuals
├── scripts/                    # Backup & disaster recovery scripts
├── server/                     # Node.js Express Backend
│   ├── adapters/               # Mock Payment & SMS Gateway adapters
│   ├── config/                 # Database connection & pragmas
│   ├── db/                     # Migrations & Demo Seed scripts
│   ├── middleware/             # Auth, RBAC & Tenant middlewares
│   ├── routes/                 # REST API endpoints
│   ├── services/               # Auth, Audit & Exam calculation logic
│   └── index.js                # Server entry point
└── tests/                      # Automated test suites
```
