# Database Migrations Guide

## 1. Migration Architecture & Mechanics

The database migration subsystem uses an atomic, file-based migration runner located in `server/db/migrator.js`.

### Tracking Table
Migrations are tracked within the `schema_migrations` table:
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Execution Protocol
1. The migrator inspects `server/db/migrations/` for all `.sql` files.
2. Files are sorted lexicographically (`001_initial_schema.sql`, `002_add_field.sql`, etc.).
3. Each unapplied file is executed inside an **atomic immediate transaction** (`BEGIN IMMEDIATE ... COMMIT`).
4. If any statement encounters an error, the entire migration transaction is immediately rolled back (`ROLLBACK`), preventing partial schema corruption.
5. Successful migrations record the filename into `schema_migrations`.

---

## 2. Running Migrations

Execute the migration runner:
```bash
npm run migrate
```
Output:
```
Applying migration: 001_initial_schema.sql...
Successfully applied migration: 001_initial_schema.sql
```
Subsequent runs will report:
```
Database is up to date. No pending migrations.
```

---

## 3. Authoring New Migrations

When schema evolution is needed, adhere to the following rules:

1. **Sequential Naming**: Create a file named `00X_<descriptive_name>.sql` in `server/db/migrations/`.
2. **Additive First**: Use additive schema modifications:
   ```sql
   ALTER TABLE students ADD COLUMN national_id TEXT;
   ```
3. **Index Creation**: Always use `IF NOT EXISTS` for indexes:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
   ```
4. **No Destructive Drops**: Never use `DROP TABLE` or drop columns directly without an explicit data export or migration staging script.
5. **Foreign Key Integrity**: Ensure any new tables reference parent entities with appropriate `ON DELETE CASCADE` or `ON DELETE SET NULL` clauses.

---

## 4. Validating Migrations on Disposable Test Databases

Before applying any migration to a production database:

1. Create a temporary copy of the production database:
   ```bash
   cp ./data/school_erp.sqlite /tmp/test_migration.sqlite
   ```
2. Run the migration against the test database:
   ```bash
   DATABASE_PATH=/tmp/test_migration.sqlite node server/db/migrator.js
   ```
3. Verify integrity:
   ```bash
   node -e "
     const { DatabaseSync } = require('node:sqlite');
     const db = new DatabaseSync('/tmp/test_migration.sqlite');
     console.log('Integrity:', db.prepare('PRAGMA integrity_check').all());
     db.close();
   "
   ```
4. If integrity reports `[{ integrity_check: 'ok' }]`, the migration is verified safe for production execution.

---

## 5. Rollback & Recovery Procedures

SQLite does not support `ALTER TABLE DROP COLUMN` in older versions without table recreation. If a migration fails:
1. The migration runner automatically rolls back the transaction.
2. If an applied migration introduces unexpected bugs, restore the pre-migration snapshot taken automatically prior to running the migration:
   ```bash
   node scripts/restore.js backups/pre_migration_backup.sqlite
   ```
