const fs = require('node:fs');
const path = require('node:path');
const { getDb, transaction } = require('../config/database');

function runMigrations(customDb = null) {
  const db = customDb || getDb();

  // Ensure migration tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found at', migrationsDir);
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const appliedMigrationsStmt = db.prepare('SELECT version FROM schema_migrations');
  const appliedRows = appliedMigrationsStmt.all();
  const appliedSet = new Set(appliedRows.map(r => r.version));

  const newlyApplied = [];

  for (const file of files) {
    if (!appliedSet.has(file)) {
      console.log(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute migration inside atomic transaction
      db.exec('BEGIN IMMEDIATE;');
      try {
        db.exec(sql);
        const recordStmt = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');
        recordStmt.run(file);
        db.exec('COMMIT;');
        console.log(`Successfully applied migration: ${file}`);
        newlyApplied.push(file);
      } catch (err) {
        db.exec('ROLLBACK;');
        console.error(`Error applying migration ${file}:`, err);
        throw err;
      }
    }
  }

  if (newlyApplied.length === 0) {
    console.log('Database is up to date. No pending migrations.');
  }

  return newlyApplied;
}

if (require.main === module) {
  try {
    runMigrations();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

module.exports = { runMigrations };
