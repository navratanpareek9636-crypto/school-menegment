const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getDb } = require('../server/config/database');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

function createBackup() {
  const dbPath = process.env.DATABASE_PATH || './data/school_erp.sqlite';
  const resolvedDbPath = path.resolve(process.cwd(), dbPath);

  if (!fs.existsSync(resolvedDbPath)) {
    throw new Error(`Database file not found at ${resolvedDbPath}`);
  }

  // 1. Force WAL checkpoint to flush all data from WAL into main database
  const activeDb = getDb();
  console.log('Flushing WAL log to database...');
  activeDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');

  // 2. Prepare backups directory
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `school_erp_backup_${timestamp}.sqlite`;
  const backupFilePath = path.join(backupsDir, backupFileName);

  // 3. Copy file
  fs.copyFileSync(resolvedDbPath, backupFilePath);
  console.log(`Copied database to ${backupFilePath}`);

  // 4. Calculate SHA-256 checksum
  const fileBuffer = fs.readFileSync(backupFilePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 5. Test integrity of the backup file
  const testDb = new DatabaseSync(backupFilePath);
  const check = testDb.prepare('PRAGMA integrity_check').all();
  testDb.close();

  if (!check || check[0]?.integrity_check !== 'ok') {
    throw new Error('Integrity check on backup snapshot failed!');
  }

  const meta = {
    backupFile: backupFileName,
    timestamp: new Date().toISOString(),
    sizeBytes: fileBuffer.length,
    sha256: hash,
    integrityCheck: 'ok'
  };

  fs.writeFileSync(
    path.join(backupsDir, `school_erp_backup_${timestamp}.json`),
    JSON.stringify(meta, null, 2)
  );

  console.log('Backup verified successfully:', meta);
  return meta;
}

if (require.main === module) {
  try {
    createBackup();
    process.exit(0);
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
}

module.exports = { createBackup };
