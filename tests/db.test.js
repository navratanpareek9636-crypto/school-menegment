const test = require('node:test');
const assert = require('node:assert/strict');
const { getDb, transaction, query, run } = require('../server/config/database');
const { runMigrations } = require('../server/db/migrator');

test('Database Setup & Migrations Verification', async (t) => {
  await t.test('Migration runner runs idempotently without error', () => {
    const newlyApplied = runMigrations();
    assert.equal(Array.isArray(newlyApplied), true);
    assert.equal(newlyApplied.length, 0); // Already applied
  });

  await t.test('Core tables exist in database', () => {
    const expectedTables = [
      'schools', 'academic_sessions', 'users', 'audit_logs',
      'classes', 'sections', 'subjects', 'admissions', 'students',
      'enrollments', 'attendance', 'fee_heads', 'fee_structures',
      'student_fee_allocations', 'fee_payments', 'fee_adjustments',
      'exams', 'exam_subjects', 'marks', 'staff', 'timetable_slots',
      'homework', 'books', 'transport_routes', 'notices'
    ];

    const rows = query("SELECT name FROM sqlite_master WHERE type='table'");
    const existingTables = new Set(rows.map(r => r.name));

    for (const table of expectedTables) {
      assert.ok(existingTables.has(table), `Table ${table} should exist in DB`);
    }
  });

  await t.test('Foreign Key constraints are strictly enforced', () => {
    // Inserting a class for a non-existent school_id = 999999 should throw FOREIGN KEY constraint failed
    assert.throws(() => {
      run(`INSERT INTO classes (school_id, name, code, numeric_level) VALUES (?, ?, ?, ?)`, [
        999999, 'Invalid Grade', 'INV-99', 99
      ]);
    }, /FOREIGN KEY constraint failed/);
  });

  await t.test('Transactions rollback atomically on failure', () => {
    const initialSchools = query('SELECT COUNT(*) as count FROM schools')[0].count;

    assert.throws(() => {
      transaction(() => {
        run(`INSERT INTO schools (code, name, email, phone, address, city, state, postal_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
          'TEST-TX-FAIL', 'Tx Failure School', 'tx@fail.com', '1234567890', 'Road', 'City', 'State', '123456'
        ]);
        // Simulate forced failure
        throw new Error('Simulated atomic failure');
      });
    }, /Simulated atomic failure/);

    const postSchools = query('SELECT COUNT(*) as count FROM schools')[0].count;
    assert.equal(postSchools, initialSchools, 'Table count must remain unchanged after aborted transaction');
  });
});
