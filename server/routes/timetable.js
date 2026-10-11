const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/timetable
 */
router.get('/', (req, res) => {
  const { classId, sectionId, teacherId, dayOfWeek } = req.query;

  let whereClauses = ['t.school_id = ?'];
  let params = [req.schoolId];

  if (classId) {
    whereClauses.push('t.class_id = ?');
    params.push(classId);
  }

  if (sectionId) {
    whereClauses.push('t.section_id = ?');
    params.push(sectionId);
  }

  if (teacherId) {
    whereClauses.push('t.teacher_id = ?');
    params.push(teacherId);
  }

  if (dayOfWeek) {
    whereClauses.push('t.day_of_week = ?');
    params.push(dayOfWeek);
  }

  const whereSql = whereClauses.join(' AND ');

  const slots = query(`
    SELECT
      t.*,
      c.name as class_name,
      sec.name as section_name,
      sub.name as subject_name,
      sub.code as subject_code,
      u.full_name as teacher_name
    FROM timetable_slots t
    JOIN classes c ON t.class_id = c.id
    JOIN sections sec ON t.section_id = sec.id
    JOIN subjects sub ON t.subject_id = sub.id
    JOIN users u ON t.teacher_id = u.id
    WHERE ${whereSql}
    ORDER BY t.day_of_week ASC, t.period_number ASC
  `, params);

  res.json({ success: true, data: slots });
});

/**
 * POST /api/timetable/slots - Create scheduled period slot with conflict checks
 */
router.post('/slots', requireRole(['admin', 'principal']), (req, res) => {
  const { classId, sectionId, subjectId, teacherId, dayOfWeek, periodNumber, startTime, endTime } = req.body;

  if (!classId || !sectionId || !subjectId || !teacherId || !dayOfWeek || !periodNumber || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'All timetable slot parameters are required' }
    });
  }

  // 1. Conflict Check: Teacher double-booking
  const teacherConflict = queryOne(`
    SELECT t.*, c.name as class_name, sec.name as section_name, u.full_name as teacher_name
    FROM timetable_slots t
    JOIN classes c ON t.class_id = c.id
    JOIN sections sec ON t.section_id = sec.id
    JOIN users u ON t.teacher_id = u.id
    WHERE t.school_id = ? AND t.teacher_id = ? AND t.day_of_week = ? AND t.period_number = ?
  `, [req.schoolId, teacherId, dayOfWeek, periodNumber]);

  if (teacherConflict) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'TEACHER_CONFLICT',
        message: `Conflict: Teacher '${teacherConflict.teacher_name}' is already booked in ${teacherConflict.class_name} (${teacherConflict.section_name}) for Period ${periodNumber} on day ${dayOfWeek}`
      }
    });
  }

  // 2. Conflict Check: Class period already occupied
  const classConflict = queryOne(`
    SELECT t.*, sub.name as subject_name
    FROM timetable_slots t
    JOIN subjects sub ON t.subject_id = sub.id
    WHERE t.school_id = ? AND t.class_id = ? AND t.section_id = ? AND t.day_of_week = ? AND t.period_number = ?
  `, [req.schoolId, classId, sectionId, dayOfWeek, periodNumber]);

  if (classConflict) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'PERIOD_OCCUPIED',
        message: `Conflict: This class section already has '${classConflict.subject_name}' scheduled in Period ${periodNumber}`
      }
    });
  }

  run(`
    INSERT INTO timetable_slots (school_id, class_id, section_id, subject_id, teacher_id, day_of_week, period_number, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.schoolId, classId, sectionId, subjectId, teacherId, dayOfWeek, periodNumber, startTime, endTime
  ]);

  const created = queryOne(`
    SELECT t.*, c.name as class_name, sec.name as section_name, sub.name as subject_name, u.full_name as teacher_name
    FROM timetable_slots t
    JOIN classes c ON t.class_id = c.id
    JOIN sections sec ON t.section_id = sec.id
    JOIN subjects sub ON t.subject_id = sub.id
    JOIN users u ON t.teacher_id = u.id
    WHERE t.school_id = ? AND t.class_id = ? AND t.section_id = ? AND t.day_of_week = ? AND t.period_number = ?
  `, [req.schoolId, classId, sectionId, dayOfWeek, periodNumber]);

  logAudit(req.schoolId, req.user.id, 'CREATE_TIMETABLE_SLOT', 'timetable_slots', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * DELETE /api/timetable/slots/:id
 */
router.delete('/slots/:id', requireRole(['admin', 'principal']), (req, res) => {
  const slotId = Number(req.params.id);
  const current = queryOne('SELECT * FROM timetable_slots WHERE school_id = ? AND id = ?', [req.schoolId, slotId]);

  if (!current) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Slot not found' } });
  }

  run('DELETE FROM timetable_slots WHERE school_id = ? AND id = ?', [req.schoolId, slotId]);
  logAudit(req.schoolId, req.user.id, 'DELETE_TIMETABLE_SLOT', 'timetable_slots', slotId, current, null, req);

  res.json({ success: true, message: 'Slot deleted successfully' });
});

module.exports = router;
