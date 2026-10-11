const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/attendance - Fetch attendance for class, section and date
 */
router.get('/', (req, res) => {
  const { classId, sectionId, date } = req.query;

  if (!classId || !sectionId || !date) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'classId, sectionId, and date (YYYY-MM-DD) are required' }
    });
  }

  // Get all active students enrolled in this section
  const students = query(`
    SELECT
      s.id as student_id,
      s.admission_number,
      s.first_name,
      s.last_name,
      e.roll_no,
      a.id as attendance_id,
      a.status as attendance_status,
      a.remarks as attendance_remarks
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = ? AND a.school_id = ?
    WHERE e.school_id = ? AND e.class_id = ? AND e.section_id = ? AND e.status = 'active'
    ORDER BY e.roll_no ASC, s.first_name ASC
  `, [date, req.schoolId, req.schoolId, classId, sectionId]);

  res.json({ success: true, data: students });
});

/**
 * POST /api/attendance/batch - Record daily attendance
 */
router.post('/batch', requireRole(['teacher', 'admin', 'principal']), (req, res) => {
  const { classId, sectionId, date, records, isCorrection = false } = req.body;

  if (!classId || !sectionId || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'classId, sectionId, date, and non-empty records array are required' }
    });
  }

  const existingCount = queryOne(`
    SELECT COUNT(*) as count
    FROM attendance
    WHERE school_id = ? AND class_id = ? AND section_id = ? AND attendance_date = ?
  `, [req.schoolId, classId, sectionId, date]).count;

  if (existingCount > 0 && !isCorrection) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `Attendance for date ${date} has already been submitted. Use correction mode to update.`
      }
    });
  }

  const activeSession = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND is_current = 1', [req.schoolId]);
  const sessionId = activeSession?.id || 1;

  transaction(() => {
    if (isCorrection && existingCount > 0) {
      // Fetch prior snapshot for audit log
      const oldRecords = query(`
        SELECT student_id, status, remarks FROM attendance
        WHERE school_id = ? AND class_id = ? AND section_id = ? AND attendance_date = ?
      `, [req.schoolId, classId, sectionId, date]);

      // Remove previous entries to apply correction cleanly
      run(`
        DELETE FROM attendance
        WHERE school_id = ? AND class_id = ? AND section_id = ? AND attendance_date = ?
      `, [req.schoolId, classId, sectionId, date]);

      logAudit(req.schoolId, req.user.id, 'ATTENDANCE_CORRECTION', 'attendance', `${classId}-${sectionId}-${date}`, oldRecords, records, req);
    }

    for (const r of records) {
      const validStatuses = ['present', 'absent', 'late', 'excused'];
      const status = validStatuses.includes(r.status) ? r.status : 'present';

      run(`
        INSERT INTO attendance (school_id, session_id, class_id, section_id, student_id, attendance_date, status, remarks, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.schoolId, sessionId, classId, sectionId, r.studentId, date, status, r.remarks || '', req.user.id
      ]);
    }
  });

  res.json({
    success: true,
    message: isCorrection ? 'Attendance corrected successfully' : 'Attendance marked successfully',
    recordedCount: records.length
  });
});

/**
 * GET /api/attendance/summary - Aggregated attendance stats
 */
router.get('/summary', (req, res) => {
  const { classId, sectionId, month } = req.query; // month format: '2026-10'

  let whereClauses = ['school_id = ?'];
  let params = [req.schoolId];

  if (classId) {
    whereClauses.push('class_id = ?');
    params.push(classId);
  }

  if (sectionId) {
    whereClauses.push('section_id = ?');
    params.push(sectionId);
  }

  if (month) {
    whereClauses.push('attendance_date LIKE ?');
    params.push(`${month}%`);
  }

  const whereSql = whereClauses.join(' AND ');

  const summary = queryOne(`
    SELECT
      COUNT(*) as total_records,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
      SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
    FROM attendance
    WHERE ${whereSql}
  `, params);

  const total = summary?.total_records || 0;
  const present = summary?.present_count || 0;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';

  res.json({
    success: true,
    data: {
      ...summary,
      attendancePercentage: Number(percentage)
    }
  });
});

module.exports = router;
