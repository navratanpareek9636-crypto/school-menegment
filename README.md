# Enterprise Multi-Tenant School ERP System

A production-grade, responsive, multi-tenant School ERP application built from end-to-end to manage admissions, student information (SIS), daily attendance, fees accounting with immutable receipts, examinations with CBSE 9-point grading, timetable scheduling with conflict detection, staff HR, library, transport, and UDISE+ compliant regulatory reporting.

---

## Key Architecture & Features

- **Multi-Tenant Isolation**: Complete tenant scoping via `school_id` foreign keys, server-side middleware enforcement, composite unique constraints, and platform Superadmin multi-tenant switching.
- **Authentication & RBAC**: Salted PBKDF2 password hashing (100,000 iterations, 64-byte salt), signed JSON Web Tokens (JWT), rate limiting, and server-side role enforcement (Super Admin, School Admin, Principal, Teacher, Accountant, Admission Staff, Student, Parent).
- **Core Modules**:
  - **Admissions**: Application tracking, review state machine (`submitted` -> `under_review` -> `approved` / `rejected` -> `enrolled`), duplicate applicant prevention, and atomic student conversion.
  - **Student Information System (SIS)**: Student master, 360-degree profile, active/withdrawn lifecycle with audit reason, guardian records, and demographic fields.
  - **Daily Attendance**: Class/section roster, duplicate entry prevention on same date, and authorized correction mode with audit logging.
  - **Fees & Financial Controls**: Fee heads & structures, partial payments, automated receipt numbering, client-side idempotency protection, and controlled reversals (posted transactions are never hard-deleted).
  - **Examinations & Results**: Scheduled assessments, marks entry with max-marks validation, automatic CBSE 9-point grade calculation (`A1` to `E2`), publication lock, and printable holistic progress report cards.
  - **Timetable**: Weekly scheduling by periods with real-time teacher double-booking conflict detection.
  - **Staff & HR**: Employee directory, departments, and designations.
  - **Homework**: Subject assignments and student submissions.
  - **Library**: Book catalog, real-time available copies tracking, checkouts, and overdue returns.
  - **Transport**: Bus fleet, routes, stops, and vehicle seat capacity limit validation.
  - **Circulars & Notices**: Campus-wide and role-targeted announcements.
  - **Reports & UDISE+**: Financial reconciliation audit, fee collection by mode, defaulters roster, and UDISE+ compliant CSV exports.
  - **Security Audit Trail**: Immutable system audit log with actor, IP, timestamp, and JSON before/after snapshots.

---

## Technology Stack

- **Backend**: Node.js (v24 LTS), Express.js, Helmet, CORS, Express-Rate-Limit, JsonWebToken.
- **Data Tier**: Native `node:sqlite` in WAL mode (`PRAGMA journal_mode = WAL`) with enforced foreign keys (`PRAGMA foreign_keys = ON`) and transaction concurrency handling (`PRAGMA busy_timeout = 10000`).
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, print stylesheets for receipts and report cards.
- **Testing**: Node.js native test runner (`node:test` + `node:assert/strict`) with 53 comprehensive automated tests.

---

## Quick Start & Local Execution

### 1. Prerequisites
- Node.js `v20+` or `v24+` LTS
- npm `v10+`

### 2. Installation
```bash
# Clone or navigate to the repository
cd "school-erp-system"

# Install backend dependencies
npm install

# Install frontend dependencies and build production SPA
cd client
npm install
npm run build
cd ..
```

### 3. Database Initialization & Seed Data
```bash
# Apply database migrations
npm run migrate

# Populate multi-tenant demo data for School A and School B
npm run seed
```

### 4. Run Automated Test Suite
```bash
npm test
```
*Executes all 53 unit, integration, RBAC, tenant isolation, financial, and HTTP end-to-end test scenarios.*

### 5. Start the Application
```bash
npm start
```
The application will launch on `http://localhost:5000`.

---

## Demo Credentials (Seeded)

| Role | Username | Password | School Tenant |
| :--- | :--- | :--- | :--- |
| **School Admin** | `admin.dpms@schoolerp.internal` | `Admin@2026` | School A (DPMS-01) |
| **Principal** | `principal.dpms@schoolerp.internal` | `Principal@2026` | School A (DPMS-01) |
| **Teacher** | `teacher.sharma@schoolerp.internal` | `Teacher@2026` | School A (DPMS-01) |
| **Accountant** | `accountant.dpms@schoolerp.internal` | `Accountant@2026` | School A (DPMS-01) |
| **Admission Staff**| `admissions.dpms@schoolerp.internal` | `Staff@2026` | School A (DPMS-01) |
| **Student** | `student.aarav@schoolerp.internal` | `Student@2026` | School A (DPMS-01) |
| **Super Admin** | `superadmin` | `SuperAdmin@2026` | Platform Global |

---

## Documentation Index

- [Requirements Inventory & Traceability](docs/requirements-inventory.md)
- [Gap Analysis Report](docs/gap-analysis.md)
- [System Architecture](docs/architecture.md)
- [Database Schema Specification](docs/database-design.md)
- [REST API Specification](docs/api-specification.md)
- [UI Screen Flows & State Machines](docs/ui-flows.md)
- [Regulatory & Compliance Verification](docs/compliance-verification.md)
- [Local Development Guide](docs/local-development.md)
- [Production Deployment Guide](docs/deployment.md)
- [Database Migrations](docs/database-migrations.md)
- [Backup & Disaster Recovery](docs/backup-and-restore.md)
- [Troubleshooting Runbook](docs/troubleshooting.md)
- [User Guide](docs/user-guide.md)
- [Known Limitations & Unconfigured Adapters](docs/known-limitations.md)
- [Standalone HTML Edition Guide](standalone-html/README.md)
