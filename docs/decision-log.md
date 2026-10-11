# Architectural Decision Log (ADR)

## ADR-001: Technology Stack Selection
- **Status**: Accepted
- **Context**: The School ERP system requires a production-ready, highly responsive, full-stack environment that supports multi-user operations, complex relational data models (students, fees, attendance, exams), and zero fragile native build prerequisites on Windows.
- **Decision**: Adopt **Node.js (v24 LTS)** with **Express.js** for the backend API, **native `node:sqlite`** for the persistent data layer, and **React 18 with Vite and Tailwind CSS** for the frontend user interface.
- **Consequences**: Fast startup, zero external database daemon required for local development or lightweight self-hosted deployments, robust ecosystem, rapid client-side updates, and zero native compilation failures on Windows.

---

## ADR-002: Multi-Tenancy Model
- **Status**: Accepted
- **Context**: The system must support multiple independent schools while maintaining complete data isolation between schools.
- **Decision**: Implement **Shared Tables with Strict Tenant Scoping** (`school_id` foreign key on all tenant-specific tables, composite unique constraints, and server-side middleware enforcement).
- **Consequences**: Extremely high maintainability and reliability. Schema migrations apply uniformly to all schools in a single atomic transaction. Cross-tenant queries are blocked unconditionally at the middleware and query layer.

---

## ADR-003: Database Engine & ACID Transaction Protocol
- **Status**: Accepted
- **Context**: Fee payments, student admissions, attendance submissions, and examination grading require strict ACID guarantees and concurrency handling without double-submission or race conditions.
- **Decision**: Use Node.js 24's built-in `node:sqlite` in Write-Ahead Logging (`WAL`) mode with Foreign Key enforcement (`PRAGMA foreign_keys = ON`). Use `BEGIN IMMEDIATE` transactions for all mutating financial operations.
- **Consequences**: Unmatched performance (tens of thousands of queries/sec), atomic write isolation, immediate deadlock prevention, and complete portable snapshot backups by copying the single `.sqlite` file during checkpoints.

---

## ADR-004: Authentication, Password Security & RBAC
- **Status**: Accepted
- **Context**: Passwords must be protected against credential theft, and access to modules must adhere to least-privilege principles across 8+ user roles.
- **Decision**:
  - Passwords hashed using cryptographically salted PBKDF2 with 100,000 iterations (or bcrypt).
  - Stateless signed JSON Web Tokens (JWT) containing user ID, role, and authorized school ID.
  - Server-side middleware (`requireRole`, `requireSchool`) validates every protected route.
  - Brute force rate limiter on `/api/auth/login`.
- **Consequences**: Robust security posture, defense-in-depth, zero plaintext credentials, and complete server-side role enforcement independent of client UI presentation.

---

## ADR-005: Financial Integrity & Audit Trail
- **Status**: Accepted
- **Context**: School accounting requires strict compliance with auditing standards. Erroneous fee collections must never disappear without accountability.
- **Decision**:
  - Fee payment records are **immutable**; no `DELETE FROM fee_payments` is ever permitted.
  - Corrections are handled via explicit `fee_adjustments` / reversal transactions linking to the original receipt and requiring an authorized user reason.
  - All sensitive actions write an audit record to `audit_logs`.
- **Consequences**: Complete regulatory compliance, transparent financial books, and zero risk of silent ledger alterations.

---

## ADR-006: External Third-Party Integrations Policy
- **Status**: Accepted
- **Context**: Production payment gateways (e.g. Razorpay, Stripe) and SMS gateways (e.g. Twilio, MSG91) require real API credentials, merchant onboarding, and public webhook callbacks.
- **Decision**: Provide production-ready adapter architecture with fully functional **Mock Integrations** (`MockPaymentGateway`, `MockSMSAdapter`) in development/demo mode, with clean configuration hooks for live credentials. Never fabricate real transaction success against unverified endpoints.
- **Consequences**: 100% testable without cost or external internet dependencies, while enabling seamless drop-in of production credentials when provisioned.

---

## ADR-007: Indian Regulatory Framework & Compliance
- **Status**: Accepted
- **Context**: Indian schools require compatibility with UDISE+ demographic reporting, RTE (Right to Education 25% quota), and CBSE assessment schemas.
- **Decision**: Include standard Indian demographic fields (`aadhaar_enrolled`, `category_caste`, `bpl_status`, `rte_eligible`, `mother_tongue`) in student models and provide dedicated UDISE+ compliant export reports. Document verification boundaries explicitly.
- **Consequences**: Ready for Indian school workflows without making misleading claims of official government API certification.
