const test = require('node:test');
const assert = require('node:assert/strict');
const { query, queryOne, run, transaction } = require('../server/config/database');

test('Admissions Workflow & Enrollment Lifecycle Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  const session = query('SELECT id FROM academic_sessions WHERE school_id = ? AND is_current = 1', [school.id])[0];
  const grade10 = query("SELECT id FROM classes WHERE school_id = ? AND code = 'G10'", [school.id])[0];
  const secA = query("SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = 'A'", [school.id, grade10.id])[0];

  assert.ok(school && session && grade10 && secA, 'Prerequisite seed entities must exist');

  let testAppId = null;
  const testAppNo = `APP-TEST-${Date.now()}`;

  await t.test('Submit new admission application', () => {
    run(`
      INSERT INTO admissions (
        school_id, session_id, application_no, first_name, last_name, date_of_birth, gender,
        applying_for_class_id, guardian_name, guardian_phone, guardian_email, address,
        category_caste, rte_candidate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
    `, [
      school.id, session.id, testAppNo, 'Kavya', 'Menon', '2011-12-10', 'female',
      grade10.id, 'Unni Menon', '+919847012345', 'unni@example.com', 'Kochi / Jaipur',
      'General', 0
    ]);

    const created = queryOne('SELECT * FROM admissions WHERE school_id = ? AND application_no = ?', [school.id, testAppNo]);
    assert.ok(created);
    assert.equal(created.status, 'submitted');
    testAppId = created.id;
  });

  await t.test('State transition to under_review and approved', () => {
    run("UPDATE admissions SET status = 'under_review' WHERE id = ?", [testAppId]);
    let app = queryOne('SELECT status FROM admissions WHERE id = ?', [testAppId]);
    assert.equal(app.status, 'under_review');

    run("UPDATE admissions SET status = 'approved' WHERE id = ?", [testAppId]);
    app = queryOne('SELECT status FROM admissions WHERE id = ?', [testAppId]);
    assert.equal(app.status, 'approved');
  });

  await t.test('Convert approved applicant to enrolled student atomically', () => {
    const admissionNumber = `DPMS-TEST-ADM-${Date.now()}`;
    let studentId = null;

    transaction(() => {
      const adm = queryOne('SELECT * FROM admissions WHERE id = ?', [testAppId]);
      assert.equal(adm.status, 'approved');

      // Insert student
      run(`
        INSERT INTO students (
          school_id, admission_id, admission_number, first_name, last_name, date_of_birth,
          gender, primary_phone, residential_address, emergency_contact_name, emergency_contact_phone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        school.id, testAppId, admissionNumber, adm.first_name, adm.last_name, adm.date_of_birth,
        adm.gender, adm.guardian_phone, adm.address, adm.guardian_name, adm.guardian_phone
      ]);

      const stu = queryOne('SELECT id FROM students WHERE school_id = ? AND admission_number = ?', [school.id, admissionNumber]);
      studentId = stu.id;

      // Enroll in Section A
      run(`
        INSERT INTO enrollments (school_id, student_id, session_id, class_id, section_id, roll_no, enrolled_date, status)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, 'active')
      `, [school.id, studentId, session.id, grade10.id, secA.id, 99]);

      // Update admission status
      run("UPDATE admissions SET status = 'enrolled' WHERE id = ?", [testAppId]);
    });

    const studentRecord = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
    assert.ok(studentRecord, 'Student record must exist');
    assert.equal(studentRecord.first_name, 'Kavya');

    const enrollmentRecord = queryOne('SELECT * FROM enrollments WHERE student_id = ?', [studentId]);
    assert.ok(enrollmentRecord, 'Enrollment record must exist');
    assert.equal(enrollmentRecord.roll_no, 99);

    const admissionFinal = queryOne('SELECT status FROM admissions WHERE id = ?', [testAppId]);
    assert.equal(admissionFinal.status, 'enrolled');
  });
});
