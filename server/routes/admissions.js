const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/admissions
 */
router.get('/', requireRole(['admin', 'principal', 'admission_staff']), (req, res) => {
  const { status, classId, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let whereClauses = ['a.school_id = ?'];
  let params = [req.schoolId];

  if (status) {
    whereClauses.push('a.status = ?');
    params.push(status);
  }

  if (classId) {
    whereClauses.push('a.applying_for_class_id = ?');
    params.push(classId);
  }

  if (search) {
    whereClauses.push('(a.first_name LIKE ? OR a.last_name LIKE ? OR a.application_no LIKE ? OR a.guardian_phone LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.join(' AND ');
  const total = query(`SELECT COUNT(*) as count FROM admissions a WHERE ${whereSql}`, params)[0].count;

  const admissions = query(`
    SELECT a.*, c.name as class_name, u.full_name as reviewer_name
    FROM admissions a
    JOIN classes c ON a.applying_for_class_id = c.id
    LEFT JOIN users u ON a.reviewed_by = u.id
    WHERE ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), Number(offset)]);

  res.json({
    success: true,
    data: admissions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * POST /api/admissions - Submit application form
 */
router.post('/', requireRole(['admin', 'principal', 'admission_staff']), (req, res) => {
  const {
    sessionId, firstName, lastName, dateOfBirth, gender, applyingForClassId,
    guardianName, guardianPhone, guardianEmail, address, categoryCaste = 'General', rteCandidate = 0
  } = req.body;

  if (!firstName || !lastName || !dateOfBirth || !gender || !applyingForClassId || !guardianName || !guardianPhone || !address) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'All required student and guardian fields must be filled' }
    });
  }

  // Active session fallback
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const activeSession = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND is_current = 1', [req.schoolId]);
    if (!activeSession) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_ACTIVE_SESSION', message: 'No active academic session found for school' }
      });
    }
    targetSessionId = activeSession.id;
  }

  // Generate sequence-based application number
  const count = queryOne('SELECT COUNT(*) as count FROM admissions WHERE school_id = ?', [req.schoolId]).count + 1;
  const currentYear = new Date().getFullYear();
  const applicationNo = `APP-${currentYear}-${String(count).padStart(4, '0')}`;

  run(`
    INSERT INTO admissions (
      school_id, session_id, application_no, first_name, last_name, date_of_birth, gender,
      applying_for_class_id, guardian_name, guardian_phone, guardian_email, address,
      category_caste, rte_candidate, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
  `, [
    req.schoolId, targetSessionId, applicationNo, firstName, lastName, dateOfBirth, gender,
    applyingForClassId, guardianName, guardianPhone, guardianEmail || null, address,
    categoryCaste, rteCandidate ? 1 : 0
  ]);

  const created = queryOne('SELECT * FROM admissions WHERE school_id = ? AND application_no = ?', [req.schoolId, applicationNo]);
  logAudit(req.schoolId, req.user.id, 'SUBMIT_ADMISSION', 'admissions', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * PATCH /api/admissions/:id/status - State transition (under_review, approved, rejected)
 */
router.patch('/:id/status', requireRole(['admin', 'principal', 'admission_staff']), (req, res) => {
  const { status, rejectionReason } = req.body;
  const admissionId = Number(req.params.id);

  const allowedStatuses = ['under_review', 'approved', 'rejected'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: `Status must be one of: ${allowedStatuses.join(', ')}` }
    });
  }

  if (status === 'rejected' && (!rejectionReason || rejectionReason.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: { code: 'REASON_REQUIRED', message: 'Rejection reason is mandatory when rejecting an application' }
    });
  }

  const current = queryOne('SELECT * FROM admissions WHERE school_id = ? AND id = ?', [req.schoolId, admissionId]);
  if (!current) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
  }

  if (current.status === 'enrolled') {
    return res.status(400).json({
      success: false,
      error: { code: 'ALREADY_ENROLLED', message: 'Application has already been converted to an enrolled student' }
    });
  }

  run(`
    UPDATE admissions
    SET status = ?, rejection_reason = ?, reviewed_by = ?
    WHERE school_id = ? AND id = ?
  `, [
    status, status === 'rejected' ? rejectionReason : null, req.user.id, req.schoolId, admissionId
  ]);

  const updated = queryOne('SELECT * FROM admissions WHERE school_id = ? AND id = ?', [req.schoolId, admissionId]);
  logAudit(req.schoolId, req.user.id, 'ADMISSION_STATUS_CHANGE', 'admissions', admissionId, current, updated, req);

  res.json({ success: true, data: updated });
});

/**
 * POST /api/admissions/:id/enroll - Convert approved applicant into enrolled student
 */
router.post('/:id/enroll', requireRole(['admin', 'principal', 'admission_staff']), (req, res) => {
  const admissionId = Number(req.params.id);
  const { sectionId, rollNo, admissionNumber } = req.body;

  if (!sectionId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Section allocation is required to enroll student' }
    });
  }

  const admission = queryOne('SELECT * FROM admissions WHERE school_id = ? AND id = ?', [req.schoolId, admissionId]);
  if (!admission) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
  }

  if (admission.status !== 'approved') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: 'Only approved applications can be enrolled' }
    });
  }

  const section = queryOne('SELECT * FROM sections WHERE school_id = ? AND id = ? AND class_id = ?', [
    req.schoolId, sectionId, admission.applying_for_class_id
  ]);
  if (!section) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SECTION', message: 'Specified section does not belong to the applied class' }
    });
  }

  // Generate admission number if not provided
  let finalAdmNumber = admissionNumber;
  if (!finalAdmNumber) {
    const studentCount = queryOne('SELECT COUNT(*) as count FROM students WHERE school_id = ?', [req.schoolId]).count + 1;
    const year = new Date().getFullYear();
    finalAdmNumber = `ADM-${year}-${String(studentCount).padStart(4, '0')}`;
  }

  let studentId = null;
  transaction(() => {
    // 1. Create Student Master Record
    run(`
      INSERT INTO students (
        school_id, admission_id, admission_number, first_name, last_name, date_of_birth,
        gender, category_caste, rte_student, primary_phone, primary_email,
        residential_address, emergency_contact_name, emergency_contact_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      req.schoolId, admissionId, finalAdmNumber, admission.first_name, admission.last_name, admission.date_of_birth,
      admission.gender, admission.category_caste, admission.rte_candidate, admission.guardian_phone,
      admission.guardian_email, admission.address, admission.guardian_name, admission.guardian_phone
    ]);

    const createdStudent = queryOne('SELECT id FROM students WHERE school_id = ? AND admission_number = ?', [
      req.schoolId, finalAdmNumber
    ]);
    studentId = createdStudent.id;

    // 2. Create Guardian Record and Link
    run(`
      INSERT INTO guardians (school_id, name, relationship, phone, email, address)
      VALUES (?, ?, 'Guardian', ?, ?, ?)
    `, [req.schoolId, admission.guardian_name, admission.guardian_phone, admission.guardian_email || null, admission.address]);

    const guardian = queryOne('SELECT id FROM guardians WHERE school_id = ? AND phone = ? ORDER BY id DESC LIMIT 1', [
      req.schoolId, admission.guardian_phone
    ]);
    if (guardian) {
      run(`
        INSERT INTO student_guardians (student_id, guardian_id, is_primary)
        VALUES (?, ?, 1)
      `, [studentId, guardian.id]);
    }

    // 3. Create Enrollment in Class & Section
    run(`
      INSERT INTO enrollments (school_id, student_id, session_id, class_id, section_id, roll_no, enrolled_date, status)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, 'active')
    `, [req.schoolId, studentId, admission.session_id, admission.applying_for_class_id, sectionId, rollNo || null]);

    // 4. Update Admission Status to 'enrolled'
    run('UPDATE admissions SET status = "enrolled" WHERE school_id = ? AND id = ?', [req.schoolId, admissionId]);
  });

  const student = queryOne(`
    SELECT s.*, e.class_id, e.section_id, e.roll_no, c.name as class_name, sec.name as section_name
    FROM students s
    JOIN enrollments e ON s.id = e.student_id
    JOIN classes c ON e.class_id = c.id
    JOIN sections sec ON e.section_id = sec.id
    WHERE s.school_id = ? AND s.id = ?
  `, [req.schoolId, studentId]);

  logAudit(req.schoolId, req.user.id, 'ENROLL_STUDENT', 'students', studentId, null, student, req);

  res.status(201).json({ success: true, data: student });
});

module.exports = router;
