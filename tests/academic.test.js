const test = require('node:test');
const assert = require('node:assert/strict');
const { query, queryOne, run } = require('../server/config/database');

test('Academic Setup & Structure Validation Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  assert.ok(school, 'School DPMS-01 must exist');

  await t.test('Fetch academic sessions returns valid date windows', () => {
    const sessions = query('SELECT * FROM academic_sessions WHERE school_id = ?', [school.id]);
    assert.ok(sessions.length > 0, 'Must have at least one session');
    const curr = sessions.find(s => s.is_current === 1);
    assert.ok(curr, 'Must have a current active session');
    assert.ok(new Date(curr.start_date) < new Date(curr.end_date), 'Start date must be before end date');
  });

  await t.test('Class and section hierarchy integrity', () => {
    const grade10 = queryOne('SELECT * FROM classes WHERE school_id = ? AND code = ?', [school.id, 'G10']);
    assert.ok(grade10, 'Grade 10 must exist');

    const sections = query('SELECT * FROM sections WHERE school_id = ? AND class_id = ?', [school.id, grade10.id]);
    assert.ok(sections.length >= 2, 'Grade 10 should have Section A and B');

    // Duplicate section name for same class violates UNIQUE constraint
    assert.throws(() => {
      run('INSERT INTO sections (school_id, class_id, name, capacity) VALUES (?, ?, ?, ?)', [
        school.id, grade10.id, 'A', 40
      ]);
    }, /UNIQUE constraint failed/);
  });

  await t.test('Subject creation and max marks validation', () => {
    const grade10 = queryOne('SELECT * FROM classes WHERE school_id = ? AND code = ?', [school.id, 'G10']);
    const subjects = query('SELECT * FROM subjects WHERE school_id = ? AND class_id = ?', [school.id, grade10.id]);
    assert.ok(subjects.length >= 5, 'Grade 10 should have 5 core subjects');

    const math = subjects.find(s => s.code === 'MATH-10');
    assert.ok(math);
    assert.equal(math.max_marks, 100);
  });
});
