const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { closeDb } = require('../server/config/database');
require('dotenv').config();

function restoreBackup(backupFilePath) {
  if (!backupFilePath) {
    throw new Error('Please specify the backup file to restore.');
  }

  const resolvedBackup = path.resolve(process.cwd(), backupFilePath);
  if (!fs.existsSync(resolvedBackup)) {
    throw new Error(`Backup file does not exist at ${resolvedBackup}`);
  }

  console.log(`Verifying backup snapshot integrity before restoration: ${resolvedBackup}...`);
  const verifyDb = new DatabaseSync(resolvedBackup);
  const check = verifyDb.prepare('PRAGMA integrity_check').all();
  verifyDb.close();

  if (!check || check[0]?.integrity_check !== 'ok') {
    throw new Error('Backup file failed PRAGMA integrity_check! Aborting restore.');
  }

  const targetDbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/school_erp.sqlite');

  console.log('Closing any active database connections...');
  closeDb();

  console.log(`Restoring database from snapshot to ${targetDbPath}...`);
  fs.copyFileSync(resolvedBackup, targetDbPath);

  // Remove stale WAL files if any exist
  const walPath = `${targetDbPath}-wal`;
  const shmPath = `${targetDbPath}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  console.log('Database restored and verified successfully!');
}

if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node scripts/restore.js <path-to-backup-file>');
    process.exit(1);
  }
  try {
    restoreBackup(fileArg);
    process.exit(0);
  } catch (err) {
    console.error('Restore failed:', err);
    process.exit(1);
  }
}

module.exports = { restoreBackup };
