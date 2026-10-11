const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server/index');

test('End-to-End HTTP API Server Integration Suite', async (t) => {
  let server;
  let baseUrl;
  let authToken;

  // Start server on dynamic port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  t.after(() => {
    if (server) server.close();
  });

  await t.test('GET /api/health returns 200 OK with healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.equal(data.database.status, 'connected');
  });

  await t.test('POST /api/auth/login succeeds and returns JWT for Admin', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin.dpms@schoolerp.internal',
        password: 'Admin@2026'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.token);
    assert.equal(body.data.user.role, 'admin');
    authToken = body.data.token;
  });

  await t.test('GET /api/students returns seeded students list', async () => {
    const res = await fetch(`${baseUrl}/api/students`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0, 'Must return seeded students');
  });

  await t.test('GET /api/reports/reconciliation returns reconciled financials', async () => {
    const res = await fetch(`${baseUrl}/api/reports/reconciliation`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.isReconciled, true);
    assert.ok(body.data.totalCollected > 0);
  });

  await t.test('Unauthorized request without token is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/academic/classes`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });
});
