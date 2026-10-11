const express = require('express');
const router = express.Router();
const { queryOne } = require('../config/database');

/**
 * GET /api/health
 */
router.get('/', (req, res) => {
  try {
    const dbCheck = queryOne('PRAGMA integrity_check');
    const isDbOk = dbCheck && dbCheck.integrity_check === 'ok';

    res.json({
      status: isDbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: isDbOk ? 'connected' : 'error',
        integrity: dbCheck?.integrity_check || 'unknown'
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

module.exports = router;
