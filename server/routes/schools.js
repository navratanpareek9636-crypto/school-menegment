const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

/**
 * GET /api/schools/profile
 */
router.get('/profile', requireAuth, requireSchool, (req, res) => {
  const school = queryOne('SELECT * FROM schools WHERE id = ?', [req.schoolId]);
  if (!school) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'School not found' } });
  }
  res.json({ success: true, data: school });
});

/**
 * PUT /api/schools/profile
 */
router.put('/profile', requireAuth, requireSchool, requireRole(['admin', 'principal']), (req, res) => {
  const { name, phone, email, address, city, state, postalCode, udiseCode, affiliationNumber } = req.body;

  const current = queryOne('SELECT * FROM schools WHERE id = ?', [req.schoolId]);
  if (!current) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'School not found' } });
  }

  run(`
    UPDATE schools
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        postal_code = COALESCE(?, postal_code),
        udise_code = COALESCE(?, udise_code),
        affiliation_number = COALESCE(?, affiliation_number)
    WHERE id = ?
  `, [
    name, phone, email, address, city, state, postalCode, udiseCode, affiliationNumber, req.schoolId
  ]);

  const updated = queryOne('SELECT * FROM schools WHERE id = ?', [req.schoolId]);
  logAudit(req.schoolId, req.user.id, 'UPDATE_SCHOOL_PROFILE', 'schools', req.schoolId, current, updated, req);

  res.json({ success: true, data: updated });
});

/**
 * GET /api/schools (Superadmin only)
 */
router.get('/', requireAuth, requireRole('superadmin'), (req, res) => {
  const schools = query('SELECT * FROM schools ORDER BY id ASC');
  res.json({ success: true, data: schools });
});

/**
 * POST /api/schools (Superadmin provisions a new school tenant)
 */
router.post('/', requireAuth, requireRole('superadmin'), (req, res) => {
  const { code, name, email, phone, address, city, state, postalCode, udiseCode, affiliationNumber } = req.body;

  if (!code || !name || !email || !phone || !address || !city || !state || !postalCode) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'All primary school address and contact fields are required' }
    });
  }

  const existing = queryOne('SELECT id FROM schools WHERE code = ?', [code]);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `School code '${code}' already exists` }
    });
  }

  let newSchoolId = null;
  transaction(() => {
    run(`
      INSERT INTO schools (code, name, email, phone, address, city, state, postal_code, udise_code, affiliation_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [code, name, email, phone, address, city, state, postalCode, udiseCode || null, affiliationNumber || null]);

    const created = queryOne('SELECT id FROM schools WHERE code = ?', [code]);
    newSchoolId = created.id;

    // Default academic session 2026-2027
    run(`
      INSERT INTO academic_sessions (school_id, name, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?, 1)
    `, [newSchoolId, '2026-2027', '2026-04-01', '2027-03-31']);
  });

  const createdSchool = queryOne('SELECT * FROM schools WHERE id = ?', [newSchoolId]);
  logAudit(newSchoolId, req.user.id, 'PROVISION_SCHOOL', 'schools', newSchoolId, null, createdSchool, req);

  res.status(201).json({ success: true, data: createdSchool });
});

module.exports = router;
