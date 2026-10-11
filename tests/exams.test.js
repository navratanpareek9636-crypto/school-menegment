const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateGrade, calculateDivision } = require('../server/services/examService');
const { query, queryOne, run } = require('../server/config/database');

test('Examinations & Report Card Calculations Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  const exam = query('SELECT * FROM exams WHERE school_id = ? LIMIT 1', [school.id])[0];
  const student = query('SELECT s.id FROM students s JOIN enrollments e ON s.id = e.student_id WHERE s.school_id = ? LIMIT 1', [school.id])[0];

  assert.ok(school && exam && student, 'Prerequisites must exist');

  await t.test('CBSE 9-Point Grading Scale conversion accuracy', () => {
    assert.equal(calculateGrade(95.5).grade, 'A1');
    assert.equal(calculateGrade(91.0).grade, 'A1');
    assert.equal(calculateGrade(89.0).grade, 'A2');
    assert.equal(calculateGrade(75.0).grade, 'B1');
    assert.equal(calculateGrade(65.0).grade, 'B2');
    assert.equal(calculateGrade(55.0).grade, 'C1');
    assert.equal(calculateGrade(45.0).grade, 'C2');
    assert.equal(calculateGrade(35.0).grade, 'D');
    assert.equal(calculateGrade(25.0).grade, 'E1');
    assert.equal(calculateGrade(12.0).grade, 'E2');
  });

  await t.test('Division calculation correctly classifies distinction and repeat', () => {
    assert.equal(calculateDivision(85.0, true), 'First Division with Distinction');
    assert.equal(calculateDivision(65.0, true), 'First Division');
    assert.equal(calculateDivision(52.0, true), 'Second Division');
    assert.equal(calculateDivision(85.0, false), 'Essential Repeat'); // Failed in a subject
  });

  await t.test('Entered marks persistence and grade assignment', () => {
    const examSubject = queryOne('SELECT * FROM exam_subjects WHERE exam_id = ? LIMIT 1', [exam.id]);
    assert.ok(examSubject);

    const testScore = 88.5;
    const computedGrade = calculateGrade((testScore / examSubject.max_marks) * 100).grade;

    run(`
      INSERT OR REPLACE INTO marks (school_id, exam_subject_id, student_id, marks_obtained, is_absent, grade, entered_by)
      VALUES (?, ?, ?, ?, 0, ?, 1)
    `, [school.id, examSubject.id, student.id, testScore, computedGrade]);

    const mark = queryOne('SELECT * FROM marks WHERE exam_subject_id = ? AND student_id = ?', [examSubject.id, student.id]);
    assert.ok(mark);
    assert.equal(mark.marks_obtained, 88.5);
    assert.equal(mark.grade, 'A2');
  });
});
