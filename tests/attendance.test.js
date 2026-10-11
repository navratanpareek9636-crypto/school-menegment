const test = require('node:test');
const assert = require('node:assert/strict');
const { query, queryOne, run } = require('../server/config/database');

test('Attendance Management & Correction Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  const grade10 = query("SELECT id FROM classes WHERE school_id = ? AND code = 'G10'", [school.id])[0];
  const secA = query("SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = 'A'", [school.id, grade10.id])[0];
  const student = query('SELECT s.id FROM students s JOIN enrollments e ON s.id = e.student_id WHERE s.school_id = ? AND e.class_id = ? LIMIT 1', [school.id, grade10.id])[0];
  const adminUser = query("SELECT id FROM users WHERE username = 'admin.dpms@schoolerp.internal'")[0];

  assert.ok(school && grade10 && secA && student && adminUser, 'Prerequisites must exist');

  const testDate = '2026-10-15';

  await t.test('Record daily attendance for student', () => {
    run(`
      INSERT OR REPLACE INTO attendance (school_id, session_id, class_id, section_id, student_id, attendance_date, status, remarks, recorded_by)
      VALUES (?, 1, ?, ?, ?, ?, 'present', 'On time', ?)
    `, [school.id, grade10.id, secA.id, student.id, testDate, adminUser.id]);

    const record = queryOne('SELECT * FROM attendance WHERE school_id = ? AND student_id = ? AND attendance_date = ?', [
      school.id, student.id, testDate
    ]);
    assert.ok(record);
    assert.equal(record.status, 'present');
  });

  await t.test('Database prevents duplicate attendance entry for same student on same date', () => {
    assert.throws(() => {
      run(`
        INSERT INTO attendance (school_id, session_id, class_id, section_id, student_id, attendance_date, status, remarks, recorded_by)
        VALUES (?, 1, ?, ?, ?, ?, 'absent', 'Duplicate attempt', ?)
      `, [school.id, grade10.id, secA.id, student.id, testDate, adminUser.id]);
    }, /UNIQUE constraint failed/);
  });

  await t.test('Attendance correction updates status to excused', () => {
    run(`
      UPDATE attendance
      SET status = 'excused', remarks = 'Medical note submitted'
      WHERE school_id = ? AND student_id = ? AND attendance_date = ?
    `, [school.id, student.id, testDate]);

    const updated = queryOne('SELECT * FROM attendance WHERE school_id = ? AND student_id = ? AND attendance_date = ?', [
      school.id, student.id, testDate
    ]);
    assert.equal(updated.status, 'excused');
    assert.equal(updated.remarks, 'Medical note submitted');
  });
});
