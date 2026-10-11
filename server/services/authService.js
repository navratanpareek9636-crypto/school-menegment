const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { queryOne, run } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-change-in-production-secret-key-32chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Hash password using crypto PBKDF2 with a random 32-byte salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

/**
 * Verify password against stored salt and hash
 */
function verifyPassword(password, salt, storedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Generate signed JWT
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    schoolId: user.school_id
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT and return payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Authenticate user with username and password
 */
function authenticate(username, password) {
  const user = queryOne("SELECT * FROM users WHERE (username = ? OR email = ?) AND status = 'active'", [username, username]);
  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }

  const isValid = verifyPassword(password, user.password_salt, user.password_hash);
  if (!isValid) {
    return { success: false, message: 'Invalid username or password' };
  }

  // Update last login timestamp
  run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  const token = generateToken(user);
  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      schoolId: user.school_id
    }
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authenticate
};
