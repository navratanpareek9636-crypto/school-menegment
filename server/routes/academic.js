const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

// All academic endpoints require authentication and tenant scoping
router.use(requireAuth, requireSchool);

/**
 * GET /api/academic/sessions
 */
router.get('/sessions', (req, res) => {
  const sessions = query('SELECT * FROM academic_sessions WHERE school_id = ? ORDER BY start_date DESC', [req.schoolId]);
  res.json({ success: true, data: sessions });
});

/**
 * POST /api/academic/sessions
 */
router.post('/sessions', requireRole(['admin', 'principal']), (req, res) => {
  const { name, startDate, endDate, isCurrent } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Name, startDate, and endDate are required' }
    });
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATES', message: 'startDate must be before endDate' }
    });
  }

  const existing = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND name = ?', [req.schoolId, name]);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `Academic session '${name}' already exists` }
    });
  }

  transaction(() => {
    if (isCurrent) {
      run('UPDATE academic_sessions SET is_current = 0 WHERE school_id = ?', [req.schoolId]);
    }

    run(`
      INSERT INTO academic_sessions (school_id, name, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?, ?)
    `, [req.schoolId, name, startDate, endDate, isCurrent ? 1 : 0]);
  });

  const created = queryOne('SELECT * FROM academic_sessions WHERE school_id = ? AND name = ?', [req.schoolId, name]);
  logAudit(req.schoolId, req.user.id, 'CREATE_SESSION', 'academic_sessions', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * GET /api/academic/classes
 */
router.get('/classes', (req, res) => {
  const classes = query('SELECT * FROM classes WHERE school_id = ? ORDER BY numeric_level ASC', [req.schoolId]);

  // Attach sections and subjects
  const result = classes.map(cls => {
    const sections = query(`
      SELECT s.*, u.full_name as class_teacher_name
      FROM sections s
      LEFT JOIN users u ON s.class_teacher_id = u.id
      WHERE s.school_id = ? AND s.class_id = ?
      ORDER BY s.name ASC
    `, [req.schoolId, cls.id]);

    const subjects = query(`
      SELECT * FROM subjects
      WHERE school_id = ? AND class_id = ?
      ORDER BY name ASC
    `, [req.schoolId, cls.id]);

    return {
      ...cls,
      sections,
      subjects
    };
  });

  res.json({ success: true, data: result });
});

/**
 * POST /api/academic/classes
 */
router.post('/classes', requireRole(['admin', 'principal']), (req, res) => {
  const { name, code, numericLevel } = req.body;

  if (!name || !code || numericLevel === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Name, code, and numericLevel are required' }
    });
  }

  const existing = queryOne('SELECT id FROM classes WHERE school_id = ? AND code = ?', [req.schoolId, code]);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `Class code '${code}' already exists` }
    });
  }

  run('INSERT INTO classes (school_id, name, code, numeric_level) VALUES (?, ?, ?, ?)', [
    req.schoolId, name, code, Number(numericLevel)
  ]);

  const created = queryOne('SELECT * FROM classes WHERE school_id = ? AND code = ?', [req.schoolId, code]);
  logAudit(req.schoolId, req.user.id, 'CREATE_CLASS', 'classes', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * POST /api/academic/sections
 */
router.post('/sections', requireRole(['admin', 'principal']), (req, res) => {
  const { classId, name, capacity = 40, classTeacherId = null } = req.body;

  if (!classId || !name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'classId and name are required' }
    });
  }

  const cls = queryOne('SELECT id FROM classes WHERE school_id = ? AND id = ?', [req.schoolId, classId]);
  if (!cls) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' }
    });
  }

  const existing = queryOne('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [
    req.schoolId, classId, name
  ]);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `Section '${name}' already exists for this class` }
    });
  }

  run('INSERT INTO sections (school_id, class_id, name, capacity, class_teacher_id) VALUES (?, ?, ?, ?, ?)', [
    req.schoolId, classId, name, Number(capacity), classTeacherId || null
  ]);

  const created = queryOne('SELECT * FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [
    req.schoolId, classId, name
  ]);
  logAudit(req.schoolId, req.user.id, 'CREATE_SECTION', 'sections', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * GET /api/academic/subjects
 */
router.get('/subjects', (req, res) => {
  const { classId } = req.query;
  let sql = 'SELECT s.*, c.name as class_name FROM subjects s JOIN classes c ON s.class_id = c.id WHERE s.school_id = ?';
  const params = [req.schoolId];

  if (classId) {
    sql += ' AND s.class_id = ?';
    params.push(classId);
  }
  sql += ' ORDER BY s.name ASC';

  const subjects = query(sql, params);
  res.json({ success: true, data: subjects });
});

/**
 * POST /api/academic/subjects
 */
router.post('/subjects', requireRole(['admin', 'principal']), (req, res) => {
  const { classId, name, code, type = 'theory', maxMarks = 100 } = req.body;

  if (!classId || !name || !code) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'classId, name, and code are required' }
    });
  }

  const cls = queryOne('SELECT id FROM classes WHERE school_id = ? AND id = ?', [req.schoolId, classId]);
  if (!cls) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' }
    });
  }

  const existing = queryOne('SELECT id FROM subjects WHERE school_id = ? AND class_id = ? AND code = ?', [
    req.schoolId, classId, code
  ]);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `Subject code '${code}' already exists for this class` }
    });
  }

  run('INSERT INTO subjects (school_id, class_id, name, code, type, max_marks) VALUES (?, ?, ?, ?, ?, ?)', [
    req.schoolId, classId, name, code, type, Number(maxMarks)
  ]);

  const created = queryOne('SELECT * FROM subjects WHERE school_id = ? AND class_id = ? AND code = ?', [
    req.schoolId, classId, code
  ]);
  logAudit(req.schoolId, req.user.id, 'CREATE_SUBJECT', 'subjects', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

module.exports = router;
