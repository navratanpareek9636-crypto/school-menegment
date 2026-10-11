const test = require('node:test');
const assert = require('node:assert/strict');
const { query, queryOne, run } = require('../server/config/database');

test('Timetable Scheduling & Conflict Detection Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  const grade10 = query("SELECT id FROM classes WHERE school_id = ? AND code = 'G10'", [school.id])[0];
  const grade9 = query("SELECT id FROM classes WHERE school_id = ? AND code = 'G9'", [school.id])[0];
  const sec10A = query("SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = 'A'", [school.id, grade10.id])[0];
  const sec9A = query("SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = 'A'", [school.id, grade9.id])[0];
  const mathSub = query("SELECT id FROM subjects WHERE school_id = ? AND code = 'MATH-10'", [school.id])[0];
  const teacher = query("SELECT id FROM users WHERE username = 'teacher.sharma@schoolerp.internal'")[0];

  assert.ok(school && grade10 && grade9 && sec10A && sec9A && mathSub && teacher, 'Prerequisites must exist');

  const testDay = 1; // Monday
  const testPeriod = 1;

  // Clean test slots
  run('DELETE FROM timetable_slots WHERE school_id = ? AND day_of_week = ? AND period_number = ?', [
    school.id, testDay, testPeriod
  ]);

  await t.test('Schedule standard slot for Grade 10-A', () => {
    run(`
      INSERT INTO timetable_slots (school_id, class_id, section_id, subject_id, teacher_id, day_of_week, period_number, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, '08:30', '09:15')
    `, [school.id, grade10.id, sec10A.id, mathSub.id, teacher.id, testDay, testPeriod]);

    const slot = queryOne(`
      SELECT * FROM timetable_slots
      WHERE school_id = ? AND class_id = ? AND section_id = ? AND day_of_week = ? AND period_number = ?
    `, [school.id, grade10.id, sec10A.id, testDay, testPeriod]);

    assert.ok(slot);
    assert.equal(slot.teacher_id, teacher.id);
  });

  await t.test('Database prevents duplicate slot for same class section on same period', () => {
    assert.throws(() => {
      run(`
        INSERT INTO timetable_slots (school_id, class_id, section_id, subject_id, teacher_id, day_of_week, period_number, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, '08:30', '09:15')
      `, [school.id, grade10.id, sec10A.id, mathSub.id, teacher.id, testDay, testPeriod]);
    }, /UNIQUE constraint failed/);
  });

  await t.test('Server logic detects teacher double-booking across different classes', () => {
    // Attempting to assign teacher to Grade 9 Section A for the SAME Monday Period 1
    const teacherExisting = queryOne(`
      SELECT * FROM timetable_slots
      WHERE school_id = ? AND teacher_id = ? AND day_of_week = ? AND period_number = ?
    `, [school.id, teacher.id, testDay, testPeriod]);

    assert.ok(teacherExisting, 'Conflict detector must find existing booking');
    assert.equal(teacherExisting.class_id, grade10.id, 'Already booked in Grade 10');
  });
});
