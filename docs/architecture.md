# System Architecture Specification

## 1. High-Level Architecture Overview

The **Enterprise School ERP System** is designed as a modern, decoupled, multi-tenant web application adhering to clean architecture principles:

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|  - React 18 / Vite SPA (Responsive Desktop, Tablet & Mobile)                      |
|  - Role-specific UI Views (Admin, Principal, Teacher, Accountant, Student, Parent)|
|  - State Management & API Client with Token Interceptors                         |
|  - Tailwind CSS Styling & Lucide Icons                                            |
|  - Print-Ready Media Stylesheets (Receipts & Report Cards)                        |
+------------------------------------------^----------------------------------------+
                                           | HTTPS / JSON REST APIs
+------------------------------------------v----------------------------------------+
|                                APPLICATION TIER                                   |
|  - Node.js (v24 LTS) + Express Application Server                                 |
|  - Security & Rate-Limiting Middlewares (Helmet, CORS, Rate-Limiter)                |
|  - Authentication & RBAC Middleware (JWT Bearer Token + Role Authorization)       |
|  - Multi-Tenant Middleware (Enforces `req.schoolId` on all tenant routes)         |
|  - Domain Service Layer:                                                          |
|      * AuthService          * StudentService       * FeeService                   |
|      * AcademicService      * AttendanceService    * ExamService                  |
|      * AdmissionService     * TimetableService     * AuditService                 |
|  - External Adapter Mocks (Payment Gateway, SMS, Regulatory UDISE+ Export)        |
+------------------------------------------^----------------------------------------+
                                           | Database Transactions / Prepared Queries
+------------------------------------------v----------------------------------------+
|                                    DATA TIER                                      |
|  - High-Performance Embedded SQLite (`node:sqlite` in Node 24)                    |
|  - Write-Ahead Logging (`PRAGMA journal_mode = WAL`)                              |
|  - Foreign Key Constraints (`PRAGMA foreign_keys = ON`)                           |
|  - Automated Version-Controlled Migration Runner (`migrations/*.sql`)            |
|  - Atomic Transactions for Financial & Lifecycle Operations                       |
|  - Immutable Audit Log Table (`audit_logs`)                                       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Multi-Tenancy Strategy

### Selected Architecture: Shared Tables with Enforced Scoping
To ensure maximum operational stability, fast deployment, simplified automated testing, and zero complex database pool coordination on single-node deployments, the system adopts **Shared Tables with Strict Tenant Scoping**:
1. **Schema-Level Isolation**: Every table containing school-owned data possesses a non-nullable `school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE`.
2. **Middleware Enforcement**: The `tenantMiddleware` extracts the authenticated user's `school_id`. Any API route that attempts to query or mutate data without matching `school_id` is immediately rejected with HTTP `403 Forbidden`.
3. **Database Constraints**: Composite unique indexes are defined including `school_id` (e.g. `UNIQUE(school_id, admission_number)`, `UNIQUE(school_id, class_id, student_id, attendance_date)`).
4. **Platform Administration vs. School Administration**: The `superadmin` role has platform-wide management rights (managing schools, global settings), while `admin`, `principal`, and staff roles are locked strictly to their respective school tenant.

---

## 3. Security Architecture & Threat Model

1. **Authentication**:
   - Secure token-based session handling with cryptographic signing.
   - Password hashing with salted PBKDF2 (`crypto.pbkdf2Sync` with 100,000 iterations and 64-byte salt) or bcrypt.
   - Login rate-limiting: maximum 5 failed attempts within 15 minutes before temporary lockout.
2. **Role-Based Access Control (RBAC)**:
   - Evaluated server-side via `requireRole(['admin', 'principal'])`.
   - Never rely on frontend UI hiding of buttons for security.
3. **Audit Trail**:
   - All state transitions (Admissions approval, marks publishing, fee reversals, role updates) write an immutable record to `audit_logs` capturing `user_id`, `school_id`, `action`, `resource_type`, `resource_id`, `old_values`, `new_values`, `ip_address`, and `created_at`.
4. **Data Validation & Sanitization**:
   - Strict input validation on all API endpoints.
   - Parameterized SQL prepared statements for 100% of queries, completely eliminating SQL injection risks.
   - Cross-Site Scripting (XSS) mitigated through client-side React JSX escaping and HTTP Content-Security-Policy headers.

---

## 4. Financial & Transaction Integrity Model

1. **Double-Entry & Adjustment Invariant**:
   - Posted fee payment records are **never hard-deleted**.
   - If an error occurs, an authorized reversal/adjustment transaction is created with a mandatory reversal reason, linking back to the original receipt.
2. **Idempotency Protection**:
   - Every fee payment request may submit an `idempotency_key` or unique receipt request token.
   - Database transactions execute with `BEGIN IMMEDIATE` to prevent race conditions during concurrent payments.
3. **Receipt Sequences**:
   - Monotonically incrementing per-school receipt numbers: `REC-{YEAR}-{SCHOOL_ID}-{NUMBER:05d}`.

---

## 5. Technology Stack Decisions

| Component | Selected Technology | Technical Justification |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js v24 LTS | Native asynchronous I/O, built-in SQLite engine, fast startup, high concurrency. |
| **Backend Framework** | Express.js | Lightweight, mature middleware ecosystem, unopinionated routing, easy testability. |
| **Database** | Native `node:sqlite` | Zero C++ compilation prerequisites on Windows, WAL concurrency, atomic ACID transactions, zero external server daemon to fail or configure. |
| **Frontend Framework** | React 18 + Vite | Modern reactive component hierarchy, instant HMR, high productivity, client-side routing. |
| **Styling & Icons** | Tailwind CSS + Lucide Icons | Clean professional design, responsive flex/grid layouts, zero bloat, native print utility classes. |
| **Testing Harness** | Node.js Native Test Runner (`node:test` + `node:assert`) | Built directly into Node.js 24; zero external runner fragility, blazingly fast execution. |
