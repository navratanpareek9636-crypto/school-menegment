const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/notices
 */
router.get('/', (req, res) => {
  const { audience } = req.query;

  let whereClauses = ['n.school_id = ?'];
  let params = [req.schoolId];

  // If specific audience requested, or default filter based on role
  if (audience) {
    whereClauses.push('(n.target_audience = ? OR n.target_audience = "all")');
    params.push(audience);
  } else if (!['admin', 'principal'].includes(req.user.role)) {
    // Ordinary users see 'all' and notices aimed at their role
    whereClauses.push('(n.target_audience = "all" OR n.target_audience = ?)');
    const roleTarget = req.user.role === 'teacher' ? 'teachers' : req.user.role === 'student' ? 'students' : 'parents';
    params.push(roleTarget);
  }

  const whereSql = whereClauses.join(' AND ');

  const notices = query(`
    SELECT n.*, u.full_name as author_name
    FROM notices n
    JOIN users u ON n.posted_by = u.id
    WHERE ${whereSql}
    ORDER BY n.is_urgent DESC, n.publish_date DESC
  `, params);

  res.json({ success: true, data: notices });
});

/**
 * POST /api/notices
 */
router.post('/', requireRole(['admin', 'principal', 'teacher']), (req, res) => {
  const { title, content, targetAudience = 'all', publishDate, expiryDate, isUrgent = 0 } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Title and content are required' }
    });
  }

  run(`
    INSERT INTO notices (school_id, title, content, target_audience, posted_by, publish_date, expiry_date, is_urgent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.schoolId, title, content, targetAudience, req.user.id,
    publishDate || new Date().toISOString().split('T')[0], expiryDate || null, isUrgent ? 1 : 0
  ]);

  const created = queryOne('SELECT * FROM notices WHERE school_id = ? ORDER BY id DESC LIMIT 1', [req.schoolId]);
  logAudit(req.schoolId, req.user.id, 'CREATE_NOTICE', 'notices', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * DELETE /api/notices/:id
 */
router.delete('/:id', requireRole(['admin', 'principal']), (req, res) => {
  const noticeId = Number(req.params.id);
  const current = queryOne('SELECT * FROM notices WHERE school_id = ? AND id = ?', [req.schoolId, noticeId]);

  if (!current) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notice not found' } });
  }

  run('DELETE FROM notices WHERE school_id = ? AND id = ?', [req.schoolId, noticeId]);
  logAudit(req.schoolId, req.user.id, 'DELETE_NOTICE', 'notices', noticeId, current, null, req);

  res.json({ success: true, message: 'Notice deleted successfully' });
});

module.exports = router;
