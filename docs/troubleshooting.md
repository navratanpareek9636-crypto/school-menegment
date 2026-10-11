# Troubleshooting Guide: School ERP System

This guide outlines common operational, configuration, database, and security issues encountered during deployment or daily operation of the School ERP System, along with concrete resolution steps.

---

## 1. Quick Diagnostics

When encountering unexpected behavior, check the following health endpoints and logs first:

### 1.1 Verify Backend Health
```bash
curl -i http://localhost:5000/api/health
```
**Expected Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-10-11T06:50:00.000Z"
}
```

### 1.2 Verify Database Schema Integrity
```bash
node -e "const { getDb } = require('./server/config/database'); console.log(getDb().prepare('PRAGMA integrity_check').all());"
```
**Expected Response:**
```javascript
[ { integrity_check: 'ok' } ]
```

---

## 2. Common Issues and Resolutions

### Issue 1: Port Already in Use (`EADDRINUSE: address already in use :::5000`)
- **Symptoms**: The server fails to start with `Error: listen EADDRINUSE: address already in use :::5000`.
- **Root Cause**: Another instance of Node.js or another service is listening on port 5000.
- **Resolution**:
  - **Find the process ID on Windows PowerShell**:
    ```powershell
    Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
    ```
  - **Terminate the process**:
    ```powershell
    Stop-Process -Id <PID> -Force
    ```
  - **Or override the port in `.env`**:
    ```env
    PORT=5001
    ```
    Then restart the server.

---

### Issue 2: Database Locked Error (`SQLITE_BUSY: database is locked`)
- **Symptoms**: API requests or automated tests fail with `SQLITE_BUSY: database is locked`.
- **Root Cause**:
  1. Multiple processes or threads attempting concurrent writes without WAL mode enabled.
  2. A previous test run or process crashed in the middle of an uncommitted transaction.
  3. Insufficient `busy_timeout`.
- **Resolution**:
  - **Verify WAL Mode & Timeout**: Ensure `server/config/database.js` has WAL mode and a generous busy timeout enabled:
    ```javascript
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA busy_timeout = 10000;'); // 10 seconds wait
    ```
  - **Flush Stale Locks**:
    If a crash left dangling lock files, terminate any hanging Node processes:
    ```powershell
    Get-Process node | Stop-Process -Force
    ```
    Then run:
    ```bash
    node -e "const { getDb } = require('./server/config/database'); getDb().exec('PRAGMA wal_checkpoint(TRUNCATE);');"
    ```

---

### Issue 3: Windows PowerShell Script Execution Policy Error
- **Symptoms**:
  ```text
  npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
  ```
- **Root Cause**: Windows PowerShell default execution policy prohibits running un-signed `.ps1` wrapper scripts.
- **Resolution**:
  - Use `npm.cmd` explicitly instead of `npm`:
    ```powershell
    npm.cmd run test
    npm.cmd run build
    ```
  - Or update PowerShell execution policy for the current user:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```

---

### Issue 4: Authentication Failures (`401 Unauthorized` or Token Expiry)
- **Symptoms**: Frontend displays "Session expired. Please log in again" or API requests return `401 Unauthorized: Invalid or expired token`.
- **Root Cause**:
  1. JWT token has passed its expiry window (`JWT_EXPIRES_IN=24h`).
  2. The server was restarted with a newly generated random `JWT_SECRET` (if not pinned in `.env`).
- **Resolution**:
  - Ensure `.env` contains a persistent, high-entropy secret:
    ```env
    JWT_SECRET=super-secure-production-secret-min-32-chars-long
    ```
  - Have the user re-authenticate via `/api/auth/login`.

---

### Issue 5: Multi-Tenant Access Blocked (`403 Forbidden: Cross-school data access prohibited`)
- **Symptoms**: A user attempts to fetch or edit a record and receives `403 Forbidden: Cross-school data access prohibited`.
- **Root Cause**:
  1. A School Admin or Teacher from School A attempted to access or modify a record belonging to School B.
  2. Tenant middleware (`requireSchool`) enforces isolation by comparing the session's `user.school_id` with the targeted entity's `school_id`.
- **Resolution**:
  - Verify user credentials and school tenancy assignment.
  - If the user is a `superadmin`, ensure the `x-school-id` header is set to the intended school context.
  - Verify in the database:
    ```sql
    SELECT id, username, role, school_id FROM users WHERE username = 'admin@dps.edu';
    ```

---

### Issue 6: Duplicate Fee Payment or Stale Request (`409 Conflict`)
- **Symptoms**: Accountant submits payment and gets an error: `Duplicate payment submission detected for idempotency key`.
- **Root Cause**: The client provided an `idempotency_key` that has already been processed by the ledger. This protects against double-billing if a user double-clicks the "Collect Fee" button.
- **Resolution**:
  - Check the existing transaction in the receipt list.
  - If a new, separate installment is being collected, generate a fresh idempotency key in the frontend client before submitting.

---

### Issue 7: Teacher Timetable Conflict (`409 Conflict: Teacher is already scheduled`)
- **Symptoms**: Creating a timetable slot fails with `Teacher is already scheduled for Grade 9-A on Monday at Period 2`.
- **Root Cause**: The timetable service prevents teacher double-booking across different classes on the same day and period.
- **Resolution**:
  - Check the existing timetable allocations for that teacher.
  - Select an alternate period or reassign an available substitute teacher.

---

### Issue 8: Static Assets Not Loading / 404 on Frontend Refresh
- **Symptoms**: Accessing `http://localhost:5000/` loads the page, but refreshing a route like `http://localhost:5000/admissions` returns 404.
- **Root Cause**: Frontend SPA bundle not built, or Express server not configured with wildcard SPA fallback.
- **Resolution**:
  - Rebuild the frontend bundle:
    ```bash
    npm.cmd run build
    ```
  - Verify that `client/dist/index.html` exists.
  - The Express server (`server/index.js`) includes a fallback handler:
    ```javascript
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
    ```

---

## 3. Database Migration & Recovery Commands

| Scenario | Command |
| :--- | :--- |
| **Run pending migrations** | `npm.cmd run migrate` |
| **Re-seed test/demo data** | `npm.cmd run seed` |
| **Take an immediate snapshot** | `npm.cmd run backup` |
| **Restore a prior snapshot** | `node scripts/restore.js ./backups/<backup-file>.sqlite` |
| **Check database integrity** | `node -e "const { getDb } = require('./server/config/database'); console.log(getDb().prepare('PRAGMA integrity_check').all());"` |
