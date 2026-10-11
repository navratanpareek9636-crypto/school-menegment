const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, authenticate, generateToken, verifyToken } = require('../server/services/authService');
const { requireRole } = require('../server/middleware/authMiddleware');

test('Authentication & Cryptography Security Suite', async (t) => {
  await t.test('PBKDF2 Password Hashing produces unique salt and verifiable hash', () => {
    const rawPassword = 'SecureAdminSecret!2026';
    const { salt, hash } = hashPassword(rawPassword);

    assert.ok(salt && salt.length >= 32, 'Salt must be at least 32 bytes hex');
    assert.ok(hash && hash.length === 128, 'PBKDF2 64-byte hash must be 128 hex chars');

    const isValid = verifyPassword(rawPassword, salt, hash);
    assert.equal(isValid, true, 'Original password must verify successfully');

    const isInvalid = verifyPassword('WrongPassword123', salt, hash);
    assert.equal(isInvalid, false, 'Incorrect password must be rejected');
  });

  await t.test('Authenticate succeeds for seeded admin credentials', () => {
    const result = authenticate('admin.dpms@schoolerp.internal', 'Admin@2026');
    assert.equal(result.success, true);
    assert.ok(result.token, 'Must return JWT token');
    assert.equal(result.user.role, 'admin');
    assert.equal(result.user.schoolId, 1);

    // Verify token can be decoded
    const decoded = verifyToken(result.token);
    assert.ok(decoded);
    assert.equal(decoded.userId, result.user.id);
    assert.equal(decoded.role, 'admin');
    assert.equal(decoded.schoolId, 1);
  });

  await t.test('Authenticate fails gracefully on invalid credentials', () => {
    const resultBadPass = authenticate('admin.dpms@schoolerp.internal', 'CompletelyWrongPass');
    assert.equal(resultBadPass.success, false);
    assert.equal(resultBadPass.message, 'Invalid username or password');

    const resultBadUser = authenticate('nonexistent.user@fake.com', 'Admin@2026');
    assert.equal(resultBadUser.success, false);
    assert.equal(resultBadUser.message, 'Invalid username or password');
  });

  await t.test('Tampered or expired token verification returns null', () => {
    assert.equal(verifyToken('malformed.jwt.token'), null);
    assert.equal(verifyToken(''), null);
  });

  await t.test('RBAC Middleware enforcement unit validation', () => {
    const adminReq = { user: { id: 1, role: 'admin', school_id: 1 } };
    const teacherReq = { user: { id: 2, role: 'teacher', school_id: 1 } };
    const superAdminReq = { user: { id: 9, role: 'superadmin', school_id: null } };

    let passed = false;
    const nextMock = () => { passed = true; };

    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      }
    };

    const adminOnlyMiddleware = requireRole(['admin', 'principal']);

    // Admin should pass
    passed = false;
    adminOnlyMiddleware(adminReq, mockRes, nextMock);
    assert.equal(passed, true, 'Admin should have access');

    // Superadmin should pass
    passed = false;
    adminOnlyMiddleware(superAdminReq, mockRes, nextMock);
    assert.equal(passed, true, 'Superadmin should bypass school role check');

    // Teacher should be rejected with 403
    passed = false;
    adminOnlyMiddleware(teacherReq, mockRes, nextMock);
    assert.equal(passed, false, 'Teacher should NOT have admin access');
    assert.equal(mockRes.statusCode, 403);
    assert.equal(mockRes.responseData.error.code, 'FORBIDDEN');
  });
});
