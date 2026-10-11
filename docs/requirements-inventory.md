# Requirements Inventory & Traceability Matrix

## 1. Executive Summary & Inventory Overview

This document establishes the exhaustive requirements baseline for the **Enterprise School ERP System**. The requirements are derived directly from the Master Prompt specification, industry best practices for School ERP systems, and standard Indian School regulatory frameworks (CBSE/State Board, RTE, UDISE+, and NEP guidelines).

### Priority Classification:
- **P0**: Essential for safe core operations (Multi-tenancy, Auth/RBAC, Academic Setup, Student Enrollment, Daily Attendance, Fee Collection & Receipts, Exam Grading & Report Cards, Audit Logs).
- **P1**: Important operational functionality (Staff HR & Leave, Timetable Scheduling, Homework & Submissions, Library Operations, Transport Management, Announcements/Notices, Financial Adjustments/Reversals, CSV/Print Reports).
- **P2**: Advanced / Optional functionality (External payment gateway mock adapters, UDISE+ automated report exports, advanced multi-criteria conflict analytics, biometric sync simulation).

### Status Classification:
- **Present and verified**
- **Partially implemented**
- **Missing** (initial state before phase implementation)
- **Conflicting**
- **Needs verification**
- **Not applicable**

---

## 2. Comprehensive Traceability Matrix

| Req ID | Module / Area | Source / Ref | Priority | Affected Roles | Description & Acceptance Criteria | Implementation Location | Verification / Test Plan | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Architecture / Tenant | Master Prompt §5 | P0 | Super Admin, School Admin | Multi-tenant isolation: Shared database with enforced `school_id` foreign keys and server-side middleware tenant scoping. | `server/middleware/tenantMiddleware.js`, `server/routes/*` | `tests/tenant.test.js`: Cross-school data read/write blocked with 403 Forbidden. | Present and verified |
| **SEC-02** | Authentication | Master Prompt §7 | P0 | All Roles | Secure login/logout, PBKDF2 (100k iters, 32-byte salt), signed JWT with 24h expiry, rate limiting. | `server/routes/auth.js`, `server/services/authService.js` | `tests/auth.test.js`: Verified login, bad credentials, expired tokens. | Present and verified |
| **SEC-03** | RBAC Authorization | Master Prompt §6 | P0 | All Roles | Granular Role-Based Access Control verified server-side via `requireRole` middleware. | `server/middleware/authMiddleware.js` | `tests/auth.test.js`, `tests/e2e.test.js`: Allowed & rejected actions tested. | Present and verified |
| **SEC-04** | Audit Logging | Master Prompt §6, §9.N | P0 | System, Auditor, Admins | Immutable audit trail for sensitive actions: permission changes, financial adjustments, status mutations. | `server/services/auditService.js`, `audit_logs` table | `tests/fees.test.js`, `tests/admissions.test.js`: JSON diffs & actor IP saved. | Present and verified |
| **CFG-01** | School Setup | Master Prompt §9.A | P0 | School Admin | School profile, contact details, academic sessions, terms, classes, sections, subjects, calendar. | `server/routes/schools.js`, `server/routes/academic.js`, `client/src/views/AcademicView.jsx` | `tests/academic.test.js`: Sessions, classes, sections, and subjects verified. | Present and verified |
| **ADM-01** | Admissions | Master Prompt §9.B, §10 | P0 | Admission Staff, Admin | Student application submission, review, approval/rejection workflow, 1-click conversion to enrolled student. | `server/routes/admissions.js`, `client/src/views/AdmissionsView.jsx` | `tests/admissions.test.js`: Full lifecycle tested and verified. | Present and verified |
| **SIS-01** | Student Information | Master Prompt §9.C | P0 | Admin, Staff, Student, Parent | Student 360 profile, unique admission number, guardian records, emergency contacts, active/transferred/withdrawn lifecycle. | `server/routes/students.js`, `client/src/views/StudentsView.jsx` | `tests/e2e.test.js`, `tests/admissions.test.js`: Directory, search & lifecycle verified. | Present and verified |
| **ATT-01** | Attendance (Student) | Master Prompt §9.E | P0 | Teachers, Admin | Class/Section daily attendance (P, A, L, Excused), duplicate submission prevention, date-locked attendance corrections. | `server/routes/attendance.js`, `client/src/views/AttendanceView.jsx` | `tests/attendance.test.js`: Batch marking, duplicate blocking, corrections verified. | Present and verified |
| **FEE-01** | Fee Structures & Heads | Master Prompt §9.F | P0 | Accountant, School Admin | Configurable fee heads, session-based fee schedules, student-specific assignments, discounts/waivers. | `server/routes/fees.js`, `client/src/views/FeesView.jsx` | `tests/fees.test.js`: Fee allocation, balance tracking verified. | Present and verified |
| **FEE-02** | Fee Collection & Receipts| Master Prompt §9.F | P0 | Accountant, Parent | Partial & full fee payments, auto-generated unique receipt number, payment mode tracking, double-payment idempotency protection. | `server/routes/fees.js`, `client/src/views/FeesView.jsx` | `tests/fees.test.js`: Unique receipt generation, partial payment, idempotency key verified. | Present and verified |
| **FEE-03** | Financial Adjustments | Master Prompt §9.F | P1 | Accountant, School Admin | Controlled reversal/refund/adjustment entries with mandatory justification reason and audit logging. Never hard-delete posted transactions. | `server/routes/fees.js`, `client/src/views/FeesView.jsx` | `tests/fees.test.js`: Compensating adjustment verified, no hard-delete. | Present and verified |
| **EXM-01** | Examinations & Grading | Master Prompt §9.G | P0 | Exam Controller, Teacher | Exam terms/assessments setup, subject marks entry, max marks validation, CBSE 9-point grading scale (A1 to E2), pass/fail rules. | `server/routes/exams.js`, `server/services/examService.js`, `client/src/views/ExamsView.jsx` | `tests/exams.test.js`: Accurate CBSE grading scale, max mark limits verified. | Present and verified |
| **EXM-02** | Report Card Generation | Master Prompt §9.G | P0 | Exam Controller, Parent, Student | Review, publish workflow; student-wise report cards with subject scores, overall percentage, grade, division classification, print view. | `server/routes/exams.js`, `client/src/views/ExamsView.jsx` | `tests/exams.test.js`: Division calculation, printable report card verified. | Present and verified |
| **HR-01** | Staff & HR | Master Prompt §9.D | P1 | School Admin, HR | Staff profiles, designation, department, qualification, contact, status (active/inactive), role association. | `server/routes/staff.js`, `client/src/views/StaffView.jsx` | `tests/modules.test.js`: Staff profile creation & employee code uniqueness verified. | Present and verified |
| **TT-01** | Timetable Scheduling | Master Prompt §9.H | P1 | Academic Admin, Teacher | Class weekly timetable grid by periods, subject & teacher allocation, conflict detection (teacher double-booking). | `server/routes/timetable.js`, `client/src/views/TimetableView.jsx` | `tests/timetable.test.js`: Duplicate slot & teacher double-booking prevention verified. | Present and verified |
| **HW-01** | Homework & Assignments | Master Prompt §9.I | P1 | Teachers, Students, Parents | Homework assignment creation by subject/class, due dates, instructions, student submission tracking, teacher evaluation. | `server/routes/homework.js`, `client/src/views/HomeworkView.jsx` | UI & API verified with full CRUD operations. | Present and verified |
| **LIB-01** | Library Management | Master Prompt §9.J | P1 | Librarian, Students, Staff | Book catalog (ISBN, title, author, category, copies), issue/return transactions, due date tracking, available count tracking. | `server/routes/library.js`, `client/src/views/LibraryView.jsx` | `tests/modules.test.js`: Copy decrement on checkout and increment on return verified. | Present and verified |
| **TRN-01** | Transport Management | Master Prompt §9.K | P1 | Transport Manager, Admin | Routes, stops, vehicle details (bus number, driver contact), student allocation with capacity validation. | `server/routes/transport.js`, `client/src/views/TransportView.jsx` | `tests/modules.test.js`: Capacity limit enforcement verified. | Present and verified |
| **COM-01** | Notices & Communications| Master Prompt §9.L | P1 | Admin, Teachers, All Roles | School-wide and role-targeted announcements/circulars, urgent alerts, in-app notification list. | `server/routes/notices.js`, `client/src/views/NoticesView.jsx` | API & UI verified with audience scoping. | Present and verified |
| **REP-01** | Reports & Analytics | Master Prompt §9.M | P0 | Admin, Accountant, Principal | Comprehensive reports: Admission summary, Student roster, Daily attendance %, Fee collection & outstanding dues, Exam performance. | `server/routes/reports.js`, `client/src/views/ReportsView.jsx` | `tests/reports.test.js`: Mathematical reconciliation against raw DB records verified. | Present and verified |
| **CMP-01** | Compliance & Indian Context| Master Prompt §13 | P1 | School Admin, Principal | Academic session structure (April-March), UDISE+ standard student demographic export, CBSE 9-point grading. | `server/routes/reports.js`, `docs/compliance-verification.md` | `tests/reports.test.js`: UDISE+ export verified; CBSE grading verified. | Present and verified |
| **SYS-01** | Backup & Health | Master Prompt §16, §18 | P0 | DevOps, Super Admin | Database backup script, automated point-in-time snapshot, integrity check, server health check endpoint (`/api/health`). | `server/routes/health.js`, `scripts/backup.js`, `scripts/restore.js` | `tests/e2e.test.js`, snapshot execution & restore verified. | Present and verified |
| **UI-01** | Responsive UI / UX | Master Prompt §8 | P0 | All Roles | Clean, modern responsive interface, role-based dashboards, sidebar navigation, accessible forms, zero dead buttons, print layouts. | `client/src/*` | Built production bundle (`client/dist`), verified 15 views across desktop/mobile. | Present and verified |

---

## 3. Ambiguities, Conflicts & Documented Resolutions

1. **Multi-tenancy Strategy**:
   - *Conflict / Ambiguity*: The prompt allows separate databases, schemas, or shared tables with tenant scoping.
   - *Resolution*: Adopt **Shared Tables with Enforced Tenant Scoping** (`school_id` foreign key on all tenant-specific tables, composite indexes `(school_id, ...)`, and server-side middleware validation). This provides extreme reliability, fast deployment, seamless migrations, and complete testability without complex multi-database connection pooling overhead.

2. **Database Engine Choice**:
   - *Resolution*: High-performance native SQLite (`node:sqlite` in Node.js 24) with Write-Ahead Logging (`WAL` mode) and enforced Foreign Keys. Zero external daemon prerequisites, zero C++ build failures, atomic transactions for financial integrity, and instant portability across development and deployment environments.

3. **External Payment Gateway & SMS**:
   - *Ambiguity*: Integration with real gateways requires production credentials and webhook URLs.
   - *Resolution*: As mandated in §12, implement robust mock adapters with complete API contracts (`MockRazorpayService`, `MockSMSService`) with realistic request/response simulation, toggleable test modes, and full error simulation capabilities. No unverified third-party claims.

4. **Regulatory & Compliance Claims**:
   - *Ambiguity*: Claiming full automated government portal integration (UDISE+, CBSE portal) is illegal without certified API keys.
   - *Resolution*: As mandated in §13, provide configurable fields and export templates formatted strictly according to UDISE+ and RTE specifications, documented clearly with verification status and disclaimer.
