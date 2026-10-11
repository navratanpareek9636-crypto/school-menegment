# Implementation Roadmap

This roadmap defines the sequential, iterative execution plan for building the complete, production-ready School ERP system across 12 distinct phases. Each phase concludes with explicit file tracking, automated verification, and a test gate.

---

## Roadmap Phases & Milestones

### Phase 1 — Discovery, Gap Analysis & System Specifications (Completed)
- [x] Inspect existing workspace, developer environment, and runtime dependencies.
- [x] Create `docs/requirements-inventory.md` with full traceability matrix.
- [x] Create `docs/gap-analysis.md`.
- [x] Create `docs/architecture.md`.
- [x] Create `docs/implementation-roadmap.md`.
- [x] Create `docs/decision-log.md`.
- [x] Verification: Documentation files exist and are verified.

### Phase 2 — Architecture, UI Planning & Data Modeling (Completed)
- [x] Create `docs/database-design.md` with complete Entity-Relationship definitions.
- [x] Create `docs/api-specification.md` defining all REST endpoints, payloads, and response contracts.
- [x] Create `docs/ui-flows.md` detailing user navigation, screen flows, and state machines.
- [x] Create `docs/compliance-verification.md` covering Indian school frameworks (CBSE, UDISE+, RTE).
- [x] Verification: All specification files validated for consistency with requirements.

### Phase 3 — Project Foundation & Database Subsystem (Completed)
- [x] Initialize project `package.json` with Express, CORS, security headers, JWT, crypto.
- [x] Implement database connection manager (`server/config/database.js`) using `node:sqlite` in WAL mode with foreign keys enabled.
- [x] Create migration runner (`server/db/migrator.js`) and comprehensive initial schema migration (`server/db/migrations/001_initial_schema.sql`).
- [x] Build seed data utility (`server/db/seeds/demo_seed.js`) with realistic, multi-tenant demo data for School A and School B.
- [x] Setup base testing framework (`tests/health.test.js`, `tests/db.test.js`).
- [x] Verification: Database migrations apply cleanly, foreign keys enforced, test runner passes.

### Phase 4 — Authentication, Authorization & Tenant Isolation (Completed)
- [x] Implement password hashing, JWT creation, token verification in `server/services/authService.js`.
- [x] Implement `server/middleware/authMiddleware.js` and `server/middleware/tenantMiddleware.js`.
- [x] Build Auth API routes (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`).
- [x] Implement audit logger service (`server/services/auditService.js`).
- [x] Verification: Unit and integration tests for login, bad credentials, rate limiting, token expiry, RBAC permissions, and cross-tenant isolation blocks (`tests/auth.test.js`, `tests/tenant.test.js`).

### Phase 5 — School Setup & Academic Structure (Completed)
- [x] Implement models and controllers for Schools, Academic Sessions, Classes, Sections, Subjects, and Grading Rules.
- [x] Add calendar and holiday management.
- [x] Verification: Integration tests verifying academic setup CRUD and constraints (`tests/academic.test.js`).

### Phase 6 — Core Student Operations & Admissions (Completed)
- [x] Implement Admissions module with full state-machine: `enquiry` -> `submitted` -> `under_review` -> `approved` / `rejected` -> `enrolled`.
- [x] Implement Student Information System (SIS): profiles, guardians, emergency contacts, active/withdrawn lifecycle.
- [x] Implement student search, filter, and pagination.
- [x] Verification: End-to-end tests for admissions workflow and enrollment (`tests/admissions.test.js`, `tests/e2e.test.js`).

### Phase 7 — Attendance & Timetable Management (Completed)
- [x] Implement Daily Student Attendance with duplicate-entry prevention on `(school_id, class_id, student_id, date)`.
- [x] Implement Attendance Correction workflow with audit history.
- [x] Implement Timetable scheduling with period slots and conflict detection (preventing teacher double-booking).
- [x] Verification: Tests for attendance batch submission, duplicate rejection, and timetable conflict errors (`tests/attendance.test.js`, `tests/timetable.test.js`).

### Phase 8 — Fees & Financial Controls (Completed)
- [x] Implement Fee Heads, Fee Structures, and Student Fee Assignments.
- [x] Implement Payment Collection with auto-generated receipt numbering, partial payment support, and idempotency protection.
- [x] Implement Controlled Reversals / Adjustments with required reason notes.
- [x] Verification: Financial tests verifying balance calculations, duplicate payment prevention, receipt generation, and reversal audit logs (`tests/fees.test.js`).

### Phase 9 — Examinations, Marks & Report Cards (Completed)
- [x] Implement Exam schedules, subject mappings, and marks entry.
- [x] Validation against maximum marks and calculation of CBSE 9-point grades (`A1` to `E2`) and divisions.
- [x] Implement Draft -> Review -> Published result workflow.
- [x] Report Card data generation and printable layout.
- [x] Verification: Tests for grade calculations, out-of-range mark validation, and publication locks (`tests/exams.test.js`).

### Phase 10 — Remaining Operational Modules (Completed)
- [x] Implement Staff / HR management (profiles, departments, roles).
- [x] Implement Homework & Submissions module.
- [x] Implement Library catalog, issue, return, and overdue tracking.
- [x] Implement Transport routes, stops, and student bus allocation with capacity validation.
- [x] Implement School Notices & Announcements with audience filters.
- [x] Verification: Integration tests for HR, Library, Transport, and Notices (`tests/modules.test.js`).

### Phase 11 — Reports, Compliance & External Adapters (Completed)
- [x] Implement Reporting endpoints (Fee collection, Attendance summary, Student demographics, Exam broadsheet).
- [x] Implement CSV and printable export generation.
- [x] Implement UDISE+ and RTE compliant export mappings.
- [x] Implement Mock Adapters for Payment Gateway and SMS notifications with test hooks.
- [x] Verification: Report reconciliation test against raw database rows (`tests/reports.test.js`).

### Phase 12 — Modern Responsive UI, Hardening & Release Documentation (Completed)
- [x] Build the complete React / Vite frontend SPA with role-specific navigation, dashboards, forms, tables, modals, and print layouts.
- [x] Connect all frontend views to backend REST APIs with live data flow.
- [x] Create comprehensive operational manuals: `README.md`, `.env.example`, `docs/local-development.md`, `docs/deployment.md`, `docs/database-migrations.md`, `docs/backup-and-restore.md`, `docs/troubleshooting.md`, `docs/user-guide.md`, `docs/known-limitations.md`.
- [x] Implement automated backup and restore script (`scripts/backup.js`, `scripts/restore.js`).
- [x] Execute complete test suite (53/53 passing), production build compilation, and verify end-to-end user workflows.
