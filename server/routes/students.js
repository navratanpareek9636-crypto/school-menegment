const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/students - List students with class/section/status filters & search
 */
router.get('/', (req, res) => {
  const { classId, sectionId, status = 'active', search, page = 1, limit = 25 } = req.query;
  const offset = (page - 1) * limit;

  let whereClauses = ['s.school_id = ?'];
  let params = [req.schoolId];

  if (status) {
    whereClauses.push('s.status = ?');
    params.push(status);
  }

  if (classId) {
    whereClauses.push('e.class_id = ?');
    params.push(classId);
  }

  if (sectionId) {
    whereClauses.push('e.section_id = ?');
    params.push(sectionId);
  }

  if (search) {
    whereClauses.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ? OR s.primary_phone LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.join(' AND ');

  const total = query(`
    SELECT COUNT(DISTINCT s.id) as count
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
    WHERE ${whereSql}
  `, params)[0].count;

  const students = query(`
    SELECT
      s.*,
      c.name as class_name,
      c.id as class_id,
      sec.name as section_name,
      sec.id as section_id,
      e.roll_no
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
    LEFT JOIN classes c ON e.class_id = c.id
    LEFT JOIN sections sec ON e.section_id = sec.id
    WHERE ${whereSql}
    ORDER BY c.numeric_level ASC, sec.name ASC, e.roll_no ASC, s.first_name ASC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), Number(offset)]);

  res.json({
    success: true,
    data: students,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * GET /api/students/:id - 360-degree Student Profile
 */
router.get('/:id', (req, res) => {
  const studentId = Number(req.params.id);

  const student = queryOne(`
    SELECT
      s.*,
      c.name as class_name,
      c.id as class_id,
      sec.name as section_name,
      sec.id as section_id,
      e.roll_no,
      e.session_id
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
    LEFT JOIN classes c ON e.class_id = c.id
    LEFT JOIN sections sec ON e.section_id = sec.id
    WHERE s.school_id = ? AND s.id = ?
  `, [req.schoolId, studentId]);

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
  }

  // Guardians
  const guardians = query(`
    SELECT g.*, sg.is_primary
    FROM guardians g
    JOIN student_guardians sg ON g.id = sg.guardian_id
    WHERE sg.student_id = ?
  `, [studentId]);

  // Attendance stats
  const attStats = queryOne(`
    SELECT
      COUNT(*) as total_days,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
    FROM attendance
    WHERE school_id = ? AND student_id = ?
  `, [req.schoolId, studentId]);

  const totalDays = attStats?.total_days || 0;
  const presentDays = attStats?.present_days || 0;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  // Fee dues and payments
  const feeSummary = queryOne(`
    SELECT
      COALESCE(SUM(net_payable), 0) as total_billed,
      COALESCE((
        SELECT SUM(fp.amount_paid)
        FROM fee_payments fp
        JOIN student_fee_allocations sfa ON fp.allocation_id = sfa.id
        WHERE sfa.student_id = ? AND fp.is_reversed = 0
      ), 0) as total_paid
    FROM student_fee_allocations
    WHERE school_id = ? AND student_id = ?
  `, [studentId, req.schoolId, studentId]);

  const totalBilled = feeSummary?.total_billed || 0;
  const totalPaid = feeSummary?.total_paid || 0;
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

  res.json({
    success: true,
    data: {
      ...student,
      guardians,
      stats: {
        totalDays,
        presentDays,
        absentDays: attStats?.absent_days || 0,
        lateDays: attStats?.late_days || 0,
        attendanceRate
      },
      finance: {
        totalBilled,
        totalPaid,
        outstandingBalance
      }
    }
  });
});

/**
 * POST /api/students - Direct Student Registration & Enrollment
 */
router.post('/', requireRole(['admin', 'principal', 'admission_staff']), (req, res) => {
  const {
    admissionNumber, firstName, lastName, dateOfBirth, gender, bloodGroup,
    primaryPhone, primaryEmail, address, emergencyContactName, emergencyContactPhone,
    rteStudent = 0, classId, sectionId, rollNo, sessionId
  } = req.body;

  if (!firstName || !lastName || !dateOfBirth || !gender || !primaryPhone || !classId || !sectionId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Name, DOB, gender, phone, class, and section are required' }
    });
  }

  let finalAdm = admissionNumber;
  if (!finalAdm) {
    const studentCount = queryOne('SELECT COUNT(*) as count FROM students WHERE school_id = ?', [req.schoolId]).count + 1;
    finalAdm = `ADM-${new Date().getFullYear()}-${String(studentCount).padStart(4, '0')}`;
  }

  const existing = queryOne('SELECT id FROM students WHERE school_id = ? AND admission_number = ?', [req.schoolId, finalAdm]);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `Admission number '${finalAdm}' is already registered` }
    });
  }

  let studentId = null;
  transaction(() => {
    run(`
      INSERT INTO students (
        school_id, admission_number, first_name, last_name, date_of_birth, gender, blood_group,
        primary_phone, primary_email, residential_address, emergency_contact_name, emergency_contact_phone,
        rte_student, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      req.schoolId, finalAdm, firstName, lastName, dateOfBirth, gender, bloodGroup || null,
      primaryPhone, primaryEmail || null, address || 'Default Address',
      emergencyContactName || `${firstName}'s Guardian`, emergencyContactPhone || primaryPhone,
      rteStudent ? 1 : 0
    ]);

    const created = queryOne('SELECT id FROM students WHERE school_id = ? AND admission_number = ?', [req.schoolId, finalAdm]);
    studentId = created.id;

    // Resolve session
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const activeSession = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND is_current = 1', [req.schoolId]);
      targetSessionId = activeSession?.id;
    }

    if (targetSessionId) {
      run(`
        INSERT INTO enrollments (school_id, student_id, session_id, class_id, section_id, roll_no, enrolled_date, status)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, 'active')
      `, [req.schoolId, studentId, targetSessionId, classId, sectionId, rollNo || null]);
    }
  });

  const createdStudent = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
  logAudit(req.schoolId, req.user.id, 'CREATE_STUDENT', 'students', studentId, null, createdStudent, req);

  res.status(201).json({ success: true, data: createdStudent });
});

/**
 * PUT /api/students/:id - Update student demographic profile
 */
router.put('/:id', requireRole(['admin', 'principal', 'admission_staff']), (req, res) => {
  const studentId = Number(req.params.id);
  const current = queryOne('SELECT * FROM students WHERE school_id = ? AND id = ?', [req.schoolId, studentId]);

  if (!current) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
  }

  const {
    firstName, lastName, dateOfBirth, gender, bloodGroup, primaryPhone,
    primaryEmail, residentialAddress, emergencyContactName, emergencyContactPhone, categoryCaste
  } = req.body;

  run(`
    UPDATE students
    SET first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        blood_group = COALESCE(?, blood_group),
        primary_phone = COALESCE(?, primary_phone),
        primary_email = COALESCE(?, primary_email),
        residential_address = COALESCE(?, residential_address),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        category_caste = COALESCE(?, category_caste)
    WHERE school_id = ? AND id = ?
  `, [
    firstName, lastName, dateOfBirth, gender, bloodGroup, primaryPhone,
    primaryEmail, residentialAddress, emergencyContactName, emergencyContactPhone, categoryCaste,
    req.schoolId, studentId
  ]);

  const updated = queryOne('SELECT * FROM students WHERE school_id = ? AND id = ?', [req.schoolId, studentId]);
  logAudit(req.schoolId, req.user.id, 'UPDATE_STUDENT', 'students', studentId, current, updated, req);

  res.json({ success: true, data: updated });
});

/**
 * PATCH /api/students/:id/status - Student Lifecycle (active -> transferred / withdrawn / graduated)
 */
router.patch('/:id/status', requireRole(['admin', 'principal']), (req, res) => {
  const studentId = Number(req.params.id);
  const { status, reason } = req.body;

  const validStatuses = ['active', 'transferred', 'withdrawn', 'graduated'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` }
    });
  }

  if (status !== 'active' && (!reason || reason.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: { code: 'REASON_REQUIRED', message: 'Reason is required for status changes away from active' }
    });
  }

  const current = queryOne('SELECT * FROM students WHERE school_id = ? AND id = ?', [req.schoolId, studentId]);
  if (!current) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
  }

  run('UPDATE students SET status = ? WHERE school_id = ? AND id = ?', [status, req.schoolId, studentId]);
  const updated = queryOne('SELECT * FROM students WHERE school_id = ? AND id = ?', [req.schoolId, studentId]);

  logAudit(req.schoolId, req.user.id, 'STUDENT_LIFECYCLE_STATUS', 'students', studentId, current, { ...updated, reason }, req);

  res.json({ success: true, data: updated });
});

module.exports = router;
