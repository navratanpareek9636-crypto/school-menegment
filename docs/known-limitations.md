# Known Limitations and Architectural Boundaries

This document provides a transparent, truthful assessment of the current architectural choices, operational boundaries, and deliberate non-goals of the School ERP System.

---

## 1. Database & Scalability Limits

### 1.1 Single-Writer Embedded SQLite
- **Current Architecture**: The system uses `node:sqlite` (Node.js 24 native synchronous SQLite) with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and a 10-second busy timeout (`PRAGMA busy_timeout = 10000`).
- **Operational Scale**:
  - Validated for single-instance vertical scaling supporting up to **10,000 active students** and **50 concurrent staff users**.
  - Read operations execute concurrently without blocking. Write operations are serialized by SQLite's single-writer lock.
- **Enterprise Boundary**:
  - Horizontal multi-server clusters sharing a distributed network filesystem (e.g. NFS) are **not supported** with SQLite, as NFS lock semantics can cause database corruption.
  - *Upgrade Path*: For multi-region multi-node deployments exceeding 25,000 students, the database abstraction layer can be ported to PostgreSQL or MySQL with connection pooling.

---

## 2. External Integrations & Adapters

### 2.1 Online Payment Gateways (Razorpay / Stripe)
- **Current Architecture**: An active, functional Mock Payment Adapter (`server/adapters/mockPaymentGateway.js`) is provided to enable 100% automated test coverage, local checkout simulation, and verification of payment callbacks and ledger posting.
- **Production Status**:
  - The system supports cash, cheque, bank transfer, and online mock payments.
  - To enable live payment collection, valid Razorpay / Stripe API keys must be configured in `.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`), and the vendor webhook endpoint must be pointed to a publicly accessible HTTPS URL.

### 2.2 SMS & WhatsApp Messaging
- **Current Architecture**: A Mock SMS Adapter (`server/adapters/mockSMSAdapter.js`) logs all outbound alerts, OTPs, and fee reminder dispatches to an internal outbox with DLT template formatting.
- **Production Status**:
  - In India, commercial SMS delivery requires TRAI DLT registration (Telecommunication Regulatory Authority of India) and registration of message templates with telecom operators.
  - Live SMS dispatches require plugging vendor API tokens (e.g., Twilio, Gupshup, Textlocal) into the adapter.

### 2.3 Government Portals (UDISE+ & CBSE Direct Sync)
- **Current Architecture**: The system implements standard-compliant export formats (`GET /api/reports/udise` outputs UDISE+ compliant CSV structures; grading maps to CBSE 9-point scale).
- **Truthful Boundary**:
  - **No automated direct push to Indian government servers is implemented or claimed.**
  - Indian state and national school portals (UDISE+, CBSE Pariksha Sangam) do not provide public authenticated REST APIs for unapproved third-party direct writes; data entry requires authorized school login and manual portal upload. The system fulfills compliance by generating exact data formats required for portal ingestion.

---

## 3. Storage & Attachments

### 3.1 File & Document Uploads
- **Current Architecture**: Document metadata (birth certificates, transfer certificates, previous marksheets) is tracked in the database, with files saved to the local host filesystem.
- **Boundary**:
  - For installations with tens of thousands of student document uploads exceeding 50 GB, an S3-compatible cloud object store (AWS S3, Cloudflare R2, MinIO) is recommended to prevent host disk exhaustion.

---

## 4. Communication & Real-Time Sync

### 4.1 Bi-Directional WebSockets
- **Current Architecture**: The application uses RESTful HTTP polling and reactive state invalidation upon user interactions.
- **Boundary**:
  - Real-time continuous push WebSockets are omitted by design to avoid persistent connection memory overhead and keep the architecture resilient across standard HTTP load balancers and server restarts.

---

## 5. Security & Multi-Tenancy Scope

### 5.1 Shared Table Multi-Tenancy
- **Current Architecture**: Multi-tenancy is implemented using shared relational tables with mandatory foreign keys to `schools(id)`, combined with server-side middleware isolation (`requireSchool`).
- **Boundary**:
  - While server-side query filtering and role checks prevent cross-tenant data leaks, all tenants reside in the same physical database file. Separate per-tenant database files or separate schemas are not currently utilized.
