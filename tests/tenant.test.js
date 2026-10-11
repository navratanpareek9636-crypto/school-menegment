const test = require('node:test');
const assert = require('node:assert/strict');
const { requireSchool } = require('../server/middleware/tenantMiddleware');
const { query } = require('../server/config/database');

test('Multi-Tenant Isolation & Security Suite', async (t) => {
  await t.test('Tenant middleware assigns schoolId from authenticated user', () => {
    const userReq = {
      user: { id: 10, role: 'teacher', school_id: 1 }
    };
    let passed = false;
    const next = () => { passed = true; };
    const res = {};

    requireSchool(userReq, res, next);
    assert.equal(passed, true);
    assert.equal(userReq.schoolId, 1);
  });

  await t.test('Cross-tenant data access attempt is blocked with 403 Forbidden', () => {
    // School A user attempting to request data from School B (schoolId: 2)
    const maliciousReq = {
      user: { id: 10, role: 'teacher', school_id: 1 },
      query: { schoolId: 2 }
    };
    let passed = false;
    const next = () => { passed = true; };

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

    requireSchool(maliciousReq, mockRes, next);
    assert.equal(passed, false, 'Cross-tenant request must NOT reach handler');
    assert.equal(mockRes.statusCode, 403);
    assert.equal(mockRes.responseData.error.code, 'CROSS_TENANT_ACCESS_DENIED');
  });

  await t.test('Database query isolation between School A and School B', () => {
    // Fetch School A ID and School B ID
    const schoolA = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
    const schoolB = query("SELECT id FROM schools WHERE code = 'SXIA-02'")[0];

    assert.ok(schoolA && schoolB, 'Both schools must exist');

    // Query students scoped to School A
    const schoolAStudents = query('SELECT id, admission_number FROM students WHERE school_id = ?', [schoolA.id]);
    assert.ok(schoolAStudents.length > 0, 'School A must have students');

    // Query students scoped to School B
    const schoolBStudents = query('SELECT id, admission_number FROM students WHERE school_id = ?', [schoolB.id]);

    // Ensure no ID overlap
    const setA = new Set(schoolAStudents.map(s => s.id));
    for (const bStudent of schoolBStudents) {
      assert.equal(setA.has(bStudent.id), false, 'School B student must never belong to School A');
    }
  });
});
