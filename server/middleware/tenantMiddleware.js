/**
 * Middleware to enforce strict multi-tenant school isolation
 */
function requireSchool(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  // Superadmin can act across schools or switch tenant context via header
  if (req.user.role === 'superadmin') {
    const targetSchoolId = req.headers?.['x-school-id'] || req.query?.schoolId || req.body?.schoolId || req.user.school_id || 1;
    req.schoolId = Number(targetSchoolId);
    return next();
  }

  // Standard school user must have an assigned school_id
  if (!req.user.school_id) {
    return res.status(403).json({
      success: false,
      error: { code: 'NO_TENANT_ASSIGNED', message: 'User is not assigned to any school tenant' }
    });
  }

  // Guard against cross-tenant hijacking attempts in query or body
  const requestedSchoolId = req.query?.schoolId || req.body?.schoolId || req.headers?.['x-school-id'];
  if (requestedSchoolId && Number(requestedSchoolId) !== Number(req.user.school_id)) {
    return res.status(403).json({
      success: false,
      error: { code: 'CROSS_TENANT_ACCESS_DENIED', message: 'Access to data from another school is prohibited' }
    });
  }

  req.schoolId = Number(req.user.school_id);
  next();
}

module.exports = {
  requireSchool
};
