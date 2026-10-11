const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config();

let dbInstance = null;

function getDb(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DATABASE_PATH || './data/school_erp.sqlite';
  
  if (dbPath !== ':memory:') {
    const resolvedPath = path.resolve(process.cwd(), dbPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), dbPath));

  // Enable foreign key constraints, busy timeout and WAL mode for reliability and concurrency
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 10000;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  }

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      // Ignored if already closed
    }
    dbInstance = null;
  }
}

/**
 * Execute query and return all matching rows
 */
function query(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Execute query and return first matching row or null
 */
function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute INSERT, UPDATE, DELETE statement
 * Returns { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/**
 * Execute a sequence of operations within an atomic immediate transaction
 */
function transaction(fn) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn(db);
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch (rollbackErr) {
      // ignore rollback err
    }
    throw err;
  }
}

module.exports = {
  getDb,
  closeDb,
  query,
  queryOne,
  run,
  transaction
};
