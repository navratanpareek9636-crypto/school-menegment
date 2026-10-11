const { run, query } = require('../config/database');

/**
 * Log an audit event
 */
function logAudit(schoolId, userId, action, resourceType, resourceId, oldValues = null, newValues = null, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown') : 'system';
    const userAgent = req ? (req.headers['user-agent'] || 'unknown') : 'system';

    const oldStr = oldValues ? JSON.stringify(oldValues) : null;
    const newStr = newValues ? JSON.stringify(newValues) : null;

    run(`
      INSERT INTO audit_logs (school_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      schoolId || null,
      userId || null,
      action,
      resourceType,
      resourceId ? String(resourceId) : null,
      oldStr,
      newStr,
      ip,
      userAgent
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Fetch audit logs with filtering and pagination
 */
function getAuditLogs(schoolId, options = {}) {
  const { page = 1, limit = 50, action, resourceType } = options;
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let params = [];

  if (schoolId) {
    whereClauses.push('a.school_id = ?');
    params.push(schoolId);
  }

  if (action) {
    whereClauses.push('a.action = ?');
    params.push(action);
  }

  if (resourceType) {
    whereClauses.push('a.resource_type = ?');
    params.push(resourceType);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const total = query(`SELECT COUNT(*) as count FROM audit_logs a ${whereSql}`, params)[0].count;

  const logs = query(`
    SELECT a.*, u.username as actor_username, u.full_name as actor_name
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return {
    logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  logAudit,
  getAuditLogs
};
