const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/staff
 */
router.get('/', (req, res) => {
  const { department, search } = req.query;

  let whereClauses = ['st.school_id = ?'];
  let params = [req.schoolId];

  if (department) {
    whereClauses.push('st.department = ?');
    params.push(department);
  }

  if (search) {
    whereClauses.push('(u.full_name LIKE ? OR st.employee_code LIKE ? OR u.email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  const staffList = query(`
    SELECT
      st.*,
      u.full_name,
      u.email,
      u.phone,
      u.role
    FROM staff st
    JOIN users u ON st.user_id = u.id
    WHERE ${whereSql}
    ORDER BY u.full_name ASC
  `, params);

  res.json({ success: true, data: staffList });
});

/**
 * POST /api/staff
 */
router.post('/', requireRole(['admin', 'principal']), (req, res) => {
  const { userId, employeeCode, department, designation, joiningDate, qualification, salaryAmount = 0 } = req.body;

  if (!userId || !employeeCode || !department || !designation || !joiningDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'userId, employeeCode, department, designation, joiningDate are required' }
    });
  }

  const existing = queryOne('SELECT id FROM staff WHERE school_id = ? AND employee_code = ?', [req.schoolId, employeeCode]);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `Employee code '${employeeCode}' already exists` }
    });
  }

  run(`
    INSERT INTO staff (school_id, user_id, employee_code, department, designation, joining_date, qualification, salary_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.schoolId, userId, employeeCode, department, designation, joiningDate, qualification || '', Number(salaryAmount)
  ]);

  const created = queryOne('SELECT * FROM staff WHERE school_id = ? AND employee_code = ?', [req.schoolId, employeeCode]);
  logAudit(req.schoolId, req.user.id, 'CREATE_STAFF', 'staff', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

module.exports = router;
