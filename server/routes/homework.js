const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/homework
 */
router.get('/', (req, res) => {
  const { classId, sectionId } = req.query;

  let whereClauses = ['h.school_id = ?'];
  let params = [req.schoolId];

  if (classId) {
    whereClauses.push('h.class_id = ?');
    params.push(classId);
  }

  if (sectionId) {
    whereClauses.push('h.section_id = ?');
    params.push(sectionId);
  }

  const whereSql = whereClauses.join(' AND ');

  const items = query(`
    SELECT
      h.*,
      c.name as class_name,
      sec.name as section_name,
      sub.name as subject_name,
      u.full_name as teacher_name,
      (SELECT COUNT(*) FROM homework_submissions WHERE homework_id = h.id) as submission_count
    FROM homework h
    JOIN classes c ON h.class_id = c.id
    JOIN sections sec ON h.section_id = sec.id
    JOIN subjects sub ON h.subject_id = sub.id
    JOIN users u ON h.teacher_id = u.id
    WHERE ${whereSql}
    ORDER BY h.due_date DESC
  `, params);

  res.json({ success: true, data: items });
});

/**
 * POST /api/homework
 */
router.post('/', requireRole(['teacher', 'admin', 'principal']), (req, res) => {
  const { classId, sectionId, subjectId, title, description, assignedDate, dueDate } = req.body;

  if (!classId || !sectionId || !subjectId || !title || !description || !dueDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'classId, sectionId, subjectId, title, description, and dueDate are required' }
    });
  }

  run(`
    INSERT INTO homework (school_id, class_id, section_id, subject_id, teacher_id, title, description, assigned_date, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.schoolId, classId, sectionId, subjectId, req.user.id, title, description, assignedDate || new Date().toISOString().split('T')[0], dueDate
  ]);

  const created = queryOne('SELECT * FROM homework WHERE school_id = ? ORDER BY id DESC LIMIT 1', [req.schoolId]);
  logAudit(req.schoolId, req.user.id, 'CREATE_HOMEWORK', 'homework', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * POST /api/homework/:id/submissions
 */
router.post('/:id/submissions', (req, res) => {
  const homeworkId = Number(req.params.id);
  const { studentId, submissionText } = req.body;

  if (!studentId || !submissionText) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'studentId and submissionText are required' }
    });
  }

  run(`
    INSERT OR REPLACE INTO homework_submissions (homework_id, student_id, submission_text, status, submitted_at)
    VALUES (?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
  `, [homeworkId, studentId, submissionText]);

  const created = queryOne('SELECT * FROM homework_submissions WHERE homework_id = ? AND student_id = ?', [homeworkId, studentId]);
  res.status(201).json({ success: true, data: created });
});

module.exports = router;
