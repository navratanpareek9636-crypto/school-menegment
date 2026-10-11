# Backup and Disaster Recovery Guide: School ERP System

This document outlines the backup, verification, retention, and disaster recovery procedures for the School ERP System.

---

## 1. Overview of Backup Architecture

The School ERP System relies on an embedded relational SQLite database running with **Write-Ahead Logging (WAL)** enabled (`PRAGMA journal_mode = WAL`).

In WAL mode, changes are written to a companion `-wal` file before being committed to the main database file (`school_erp.sqlite`). Therefore, simple raw file copying without database coordination can result in a corrupted or inconsistent snapshot.

The system provides dedicated backup and restore tooling (`scripts/backup.js` and `scripts/restore.js`) that ensures:
1. **WAL Checkpoint Flushes**: Forces `PRAGMA wal_checkpoint(TRUNCATE)` so all pending transactions are synchronized into the primary database file.
2. **Point-in-Time Snapshotting**: Atomically copies the primary database to an isolated, timestamped snapshot.
3. **SHA-256 Cryptographic Checksumming**: Computes a unique digest stored in a companion `.json` manifest for tamper detection.
4. **Automated SQLite PRAGMA Integrity Check**: Verifies internal B-tree structures, index consistency, and page integrity prior to declaring the backup successful.

---

## 2. Running Backups

### 2.1 Automated Script Execution

Run the backup script directly from the project root:

```bash
# Using npm script:
npm run backup

# Or directly with Node.js:
node scripts/backup.js
```

> **Note on Windows PowerShell**: If script execution policy restrictions apply, run using `npm.cmd run backup` or `node scripts/backup.js`.

### 2.2 Expected Backup Output

```text
Flushing WAL log to database...
Copied database to C:\Users\user\OneDrive\Desktop\school digram\backups\school_erp_backup_2026-10-11T06-44-31-000Z.sqlite
Backup verified successfully: {
  backupFile: 'school_erp_backup_2026-10-11T06-44-31-000Z.sqlite',
  timestamp: '2026-10-11T06:44:31.000Z',
  sizeBytes: 159744,
  sha256: 'a1b2c3d4...',
  integrityCheck: 'ok'
}
```

### 2.3 Artifacts Generated

Each backup run produces two files in the `./backups/` directory:
1. `school_erp_backup_<TIMESTAMP>.sqlite` – The full verified relational database snapshot.
2. `school_erp_backup_<TIMESTAMP>.json` – Metadata manifest containing:
   - File name and path
   - Timestamp (ISO 8601)
   - Exact size in bytes
   - SHA-256 hash
   - Status of `PRAGMA integrity_check`

---

## 3. Disaster Recovery & Restoration

The restoration procedure is designed to recover from host failure, accidental data loss, or corrupt disk states.

### 3.1 Pre-Restoration Safeguards

Before replacing the active database:
- The target database connection pool is cleanly closed.
- The snapshot is opened in an isolated read-only check to run `PRAGMA integrity_check`.
- Any existing stale `-wal` or `-shm` files are removed to prevent WAL replay conflicts with the new database file.

### 3.2 Running the Restore Command

```bash
# Specify the path to the backup file to restore:
node scripts/restore.js ./backups/school_erp_backup_2026-10-11T06-44-31-000Z.sqlite
```

### 3.3 Expected Restore Output

```text
Verifying backup snapshot integrity before restoration: ./backups/school_erp_backup_2026-10-11T06-44-31-000Z.sqlite...
Closing any active database connections...
Restoring database from snapshot to C:\Users\user\OneDrive\Desktop\school digram\data\school_erp.sqlite...
Database restored and verified successfully!
```

### 3.4 Post-Restoration Verification Steps

1. **Verify Integrity via Node CLI**:
   ```bash
   node -e "const { getDb } = require('./server/config/database'); console.log(getDb().prepare('PRAGMA integrity_check').all());"
   ```
   *Expected output: `[ { integrity_check: 'ok' } ]`*

2. **Verify Migrations**:
   ```bash
   npm run migrate
   ```
   *Ensures the restored snapshot schema is aligned with the latest migration level.*

3. **Run Application Health Check**:
   ```bash
   curl -s http://localhost:5000/api/health
   ```
   *Expected output: `{"status":"healthy","database":"connected","timestamp":"..."}`*

---

## 4. Backup Retention Policy & Offsite Archival

### 4.1 Recommended Retention Schedule

| Backup Tier | Frequency | Retention Window | Destination |
| :--- | :--- | :--- | :--- |
| **Hourly Snapshots** | Every hour during school hours (07:00 – 18:00) | 48 hours | Local disk (`./backups`) |
| **Daily Snapshots** | Daily at 23:00 | 30 days | Encrypted offsite S3 / Azure Blob |
| **Weekly Snapshots** | Sundays at 00:00 | 12 weeks | Cold storage / Cloud Vault |
| **Monthly Archive** | Last day of month | 7 years (Tax & Audit Compliance) | Immutable WORM Cloud Archive |

### 4.2 Automated Scheduling Examples

#### Linux / macOS (Crontab)
```cron
# Run backup every day at 02:00 AM
0 2 * * * cd /opt/school-erp && /usr/bin/npm run backup >> /var/log/school-erp-backup.log 2>&1
```

#### Windows Task Scheduler (PowerShell)
```powershell
$Action = New-ScheduledTaskAction -Execute "npm.cmd" -Argument "run backup" -WorkingDirectory "C:\Users\user\OneDrive\Desktop\school digram"
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "SchoolERP_DailyBackup" -Description "Daily snapshot of School ERP SQLite database"
```

---

## 5. Tenant-Scoped Data Exports vs Full Backups

- **Full System Backup**: Captures all system tables, credentials, cross-school data, fee transactions, and system settings. Intended strictly for system administrators and disaster recovery.
- **Tenant-Scoped Export**: School Admins and Accountants can download tenant-scoped data without full database access:
  - **UDISE+ Export**: `GET /api/reports/udise` returns tenant-filtered student profiles formatted for state reporting.
  - **Fee Collection & Reconciliation**: `GET /api/reports/reconciliation` returns an audited financial report strictly scoped to `req.schoolId`.
  - **Defaulters Report**: `GET /api/reports/defaulters` lists overdue balances for the specific tenant.
