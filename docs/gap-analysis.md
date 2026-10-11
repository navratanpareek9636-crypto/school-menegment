# Gap Analysis Report

## 1. Baseline State Assessment

- **Workspace State**: Newly initialized workspace (`c:\Users\user\OneDrive\Desktop\school digram`).
- **Pre-existing Code**: None. No prior repository files, schemas, or tests existed.
- **Runtime Environment**:
  - Operating System: Windows 11 x64
  - Node.js: `v24.21.0` (Native `node:sqlite` supported)
  - npm: `11.19.0` (accessible via `npm.cmd`)
  - Python: `3.14.7`
  - Git: `2.55.0`

---

## 2. Gap Identification by Functional Domain

| Domain / Module | Target Requirement | Baseline State | Gap Identified | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| **System Architecture** | Multi-tenant backend, structured API, DB migration system, centralized error handling | Empty | Missing all backend scaffolding, routes, models, migrations | Build clean Node.js / Express backend with modular controllers, services, middleware, and a deterministic SQLite migration runner. |
| **Authentication & RBAC** | JWT / session auth, password hashing (PBKDF2/bcrypt), role-based middleware, tenant scoping | Empty | Missing authentication, session store, permission matrices | Implement `server/services/authService.js`, token signing with expiry, brute-force rate limiter, role middleware (`requireRole`, `requireSchool`). |
| **School Setup & Academic** | School profiles, sessions, terms, classes, sections, subjects, academic calendar | Empty | No academic schema or endpoints | Implement schema for `schools`, `academic_sessions`, `classes`, `sections`, `subjects`, and CRUD APIs with validation. |
| **Admissions Lifecycle** | Enquiries, applications, review/approve/reject state machine, enrollment conversion | Empty | Missing admission state machine and UI forms | Implement `admissions` table with transitions (`enquiry`, `submitted`, `under_review`, `approved`, `rejected`, `enrolled`), audit logs. |
| **Student Information (SIS)** | Student master, guardians, documents, status changes, roll numbers | Empty | Missing student registry and guardian relationships | Implement `students`, `guardians`, `student_guardians` tables with unique admission number generators and filters. |
| **Attendance Management** | Daily class attendance, status flags, double-entry prevention, historical corrections | Empty | Missing attendance engine | Create `attendance` table with unique constraint on `(school_id, student_id, attendance_date)`, batch marking API, correction audit trail. |
| **Fees & Financial Controls** | Fee structures, student allocations, receipt generation, reversals, concurrency lock | Empty | Missing financial accounting subsystem | Implement fee ledger, immutable receipts with sequence numbers (`REC-YYYY-XXXX`), idempotency tokens, reversal audit trail. |
| **Exams & Grading** | Exam terms, maximum marks, grading scale (CBSE/GPA), marks entry, report card publishing | Empty | Missing examination subsystem | Implement `exams`, `exam_subjects`, `marks` tables, validation against max marks, automated grade mapping, printable report cards. |
| **Staff & HR** | Staff directory, departments, designations, employment status | Empty | Missing staff management | Implement `staff` profiles, departments, subject teacher linkages. |
| **Timetable & Scheduling** | Weekly schedule by period, teacher conflict detection | Empty | Missing timetable engine | Implement `timetable_slots` with overlap validation preventing double-booking teachers in the same period. |
| **Homework & Learning** | Assignments, due dates, class targeting, submission tracking | Empty | Missing homework module | Implement `homework` and `homework_submissions` tables with teacher grading and student view. |
| **Library Management** | Book catalog, issue/return, copy count tracking, overdue calculation | Empty | Missing library module | Implement `books`, `book_issues` tables with copy decrement/increment triggers. |
| **Transport Management** | Routes, pickup stops, bus assignments, capacity checks | Empty | Missing transport module | Implement `transport_routes`, `transport_stops`, `student_transport` with capacity limits. |
| **Communication & Notices** | Notice board, audience filters, notifications | Empty | Missing notice system | Implement `notices` table with audience targeting (`all`, `teachers`, `students`, `parents`). |
| **Reports & Reconciliation** | Daily collections, student roster, attendance trends, exam broadsheets | Empty | Missing reporting layer | Implement aggregation endpoints with cross-verification checks against raw ledger rows. |
| **Frontend UI / UX** | Professional, responsive SPA with role-based navigation, empty states, modals, print layouts | Empty | No UI client exists | Build responsive React SPA with Tailwind CSS, Lucide icons, role dashboards, accessible forms, and print stylesheets. |
| **Testing & CI** | Automated unit, integration, RBAC, tenant isolation, and financial tests | Empty | No test suites exist | Implement end-to-end and unit test suites utilizing Node test runner / Jest-compatible runner with real DB verification. |
| **Operations & Docs** | Comprehensive documentation, backup scripts, environment config, health checks | Empty | No documentation | Generate full specification, API docs, backup/restore guides, runbooks, and `.env.example`. |

---

## 3. High-Priority Risk Analysis & Mitigations

1. **Risk: Financial Data Corruption / Double Payment**
   - *Mitigation*: SQLite database transactions (`BEGIN IMMEDIATE ... COMMIT`), unique constraint on idempotency tokens, atomic receipt sequence generation.

2. **Risk: Cross-Tenant Data Leaks**
   - *Mitigation*: Server-side `requireSchool` middleware automatically extracts and verifies `school_id` from the authenticated user token. Every SQL query explicitly scopes to `WHERE school_id = ?`.

3. **Risk: Privilege Escalation**
   - *Mitigation*: Strict role hierarchy and explicit endpoint permissions (`requireRole(['admin', 'principal'])`). Never trust client-supplied role parameters.

4. **Risk: Windows Execution Policy / Native Dependency Failures**
   - *Mitigation*: Utilize Node.js 24's built-in `node:sqlite` which has zero external native toolchain dependencies, and invoke scripts via `npm.cmd` / `node`.
