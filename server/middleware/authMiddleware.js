const { verifyToken } = require('../services/authService');
const { queryOne } = require('../config/database');

/**
 * Require valid JWT Bearer token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required' }
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Invalid or expired session token' }
    });
  }

  const user = queryOne('SELECT id, school_id, username, email, full_name, role, status FROM users WHERE id = ?', [decoded.userId]);
  if (!user || user.status !== 'active') {
    return res.status(401).json({
      success: false,
      error: { code: 'ACCOUNT_DISABLED', message: 'User account is inactive or deleted' }
    });
  }

  req.user = user;
  next();
}

/**
 * Enforce role authorization
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // superadmin has platform-wide superuser privileges
    if (req.user.role === 'superadmin') {
      return next();
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `Forbidden: role '${req.user.role}' lacks permission for this resource`
      }
    });
  };
}

module.exports = {
  requireAuth,
  requireRole
};
