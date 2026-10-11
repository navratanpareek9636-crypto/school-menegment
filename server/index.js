const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
require('dotenv').config();

const { getDb } = require('./config/database');
const { runMigrations } = require('./db/migrator');

// Ensure DB and migrations are ready
const db = getDb();
runMigrations(db);

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts for modern SPA dev/prod preview
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Generous limit for development & pairing tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts. Please try again later.' }
  }
});

// Route Imports
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const schoolsRouter = require('./routes/schools');
const academicRouter = require('./routes/academic');
const admissionsRouter = require('./routes/admissions');
const studentsRouter = require('./routes/students');
const attendanceRouter = require('./routes/attendance');
const feesRouter = require('./routes/fees');
const examsRouter = require('./routes/exams');
const staffRouter = require('./routes/staff');
const timetableRouter = require('./routes/timetable');
const homeworkRouter = require('./routes/homework');
const libraryRouter = require('./routes/library');
const transportRouter = require('./routes/transport');
const noticesRouter = require('./routes/notices');
const reportsRouter = require('./routes/reports');
const integrationsRouter = require('./routes/integrations');

// Mount API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/schools', schoolsRouter);
app.use('/api/academic', academicRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/fees', feesRouter);
app.use('/api/exams', examsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/library', libraryRouter);
app.use('/api/transport', transportRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/integrations', integrationsRouter);

// Audit logs endpoint
const { requireAuth, requireRole } = require('./middleware/authMiddleware');
const { requireSchool } = require('./middleware/tenantMiddleware');
const { getAuditLogs } = require('./services/auditService');

app.get('/api/audit', requireAuth, requireSchool, requireRole(['admin', 'principal']), (req, res) => {
  const result = getAuditLogs(req.schoolId, req.query);
  res.json({ success: true, data: result.logs, pagination: result.pagination });
});

// Serve frontend build if exists
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>School ERP API</title><meta charset="utf-8"></head>
          <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; line-height: 1.6; color: #1e293b;">
            <h2>Enterprise School ERP API Server</h2>
            <p>API Server is running in active operational state.</p>
            <ul>
              <li>Health Check: <a href="/api/health">/api/health</a></li>
              <li>Authentication: <code>POST /api/auth/login</code></li>
            </ul>
          </body>
        </html>
      `);
    }
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected internal error occurred on the server',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[School ERP Server] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
