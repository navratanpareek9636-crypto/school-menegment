const express = require('express');
const router = express.Router();
const { authenticate, hashPassword, verifyPassword } = require('../services/authService');
const { requireAuth } = require('../middleware/authMiddleware');
const { logAudit } = require('../services/auditService');
const { queryOne, run } = require('../config/database');

/**
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Username and password are required' }
    });
  }

  const result = authenticate(username, password);
  if (!result.success) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: result.message }
    });
  }

  // Fetch school details if user belongs to a school
  let school = null;
  if (result.user.schoolId) {
    school = queryOne('SELECT id, code, name, udise_code FROM schools WHERE id = ?', [result.user.schoolId]);
  }

  logAudit(result.user.schoolId, result.user.id, 'USER_LOGIN', 'users', result.user.id, null, { username }, req);

  res.json({
    success: true,
    data: {
      token: result.token,
      user: {
        ...result.user,
        school
      }
    }
  });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res) => {
  let school = null;
  if (req.user.school_id) {
    school = queryOne('SELECT id, code, name, udise_code, address, phone, email FROM schools WHERE id = ?', [req.user.school_id]);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.full_name,
        role: req.user.role,
        schoolId: req.user.school_id,
        school
      }
    }
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, (req, res) => {
  logAudit(req.user.school_id, req.user.id, 'USER_LOGOUT', 'users', req.user.id, null, null, req);
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'New password must be at least 8 characters long' }
    });
  }

  const user = queryOne('SELECT password_hash, password_salt FROM users WHERE id = ?', [req.user.id]);
  const isMatch = verifyPassword(oldPassword, user.password_salt, user.password_hash);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Current password does not match' }
    });
  }

  const { salt, hash } = hashPassword(newPassword);
  run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [hash, salt, req.user.id]);

  logAudit(req.user.school_id, req.user.id, 'PASSWORD_CHANGED', 'users', req.user.id, null, null, req);

  res.json({ success: true, message: 'Password updated successfully' });
});

module.exports = router;
