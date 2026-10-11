const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/transport/routes
 */
router.get('/routes', (req, res) => {
  const routes = query(`
    SELECT
      tr.*,
      (SELECT COUNT(*) FROM student_transport WHERE route_id = tr.id) as allocated_students
    FROM transport_routes tr
    WHERE tr.school_id = ?
    ORDER BY tr.route_name ASC
  `, [req.schoolId]);

  const result = routes.map(r => {
    const stops = query('SELECT * FROM transport_stops WHERE route_id = ? ORDER BY id ASC', [r.id]);
    return { ...r, stops };
  });

  res.json({ success: true, data: result });
});

/**
 * POST /api/transport/routes
 */
router.post('/routes', requireRole(['admin', 'principal']), (req, res) => {
  const { routeName, vehicleNumber, driverName, driverPhone, capacity = 35, stops = [] } = req.body;

  if (!routeName || !vehicleNumber || !driverName || !driverPhone) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'routeName, vehicleNumber, driverName, and driverPhone are required' }
    });
  }

  let routeId = null;
  transaction(() => {
    run(`
      INSERT INTO transport_routes (school_id, route_name, vehicle_number, driver_name, driver_phone, capacity)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.schoolId, routeName, vehicleNumber, driverName, driverPhone, Number(capacity)]);

    const created = queryOne('SELECT id FROM transport_routes WHERE school_id = ? ORDER BY id DESC LIMIT 1', [req.schoolId]);
    routeId = created.id;

    for (const stop of stops) {
      run(`
        INSERT INTO transport_stops (route_id, stop_name, pickup_time, drop_time, monthly_fare)
        VALUES (?, ?, ?, ?, ?)
      `, [routeId, stop.stopName, stop.pickupTime || '', stop.dropTime || '', Number(stop.monthlyFare || 0)]);
    }
  });

  const createdRoute = queryOne('SELECT * FROM transport_routes WHERE id = ?', [routeId]);
  logAudit(req.schoolId, req.user.id, 'CREATE_TRANSPORT_ROUTE', 'transport_routes', routeId, null, createdRoute, req);

  res.status(201).json({ success: true, data: createdRoute });
});

/**
 * POST /api/transport/allocate - Assign student to bus route with capacity enforcement
 */
router.post('/allocate', requireRole(['admin', 'principal']), (req, res) => {
  const { studentId, routeId, stopId } = req.body;

  if (!studentId || !routeId || !stopId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'studentId, routeId, and stopId are required' }
    });
  }

  const route = queryOne('SELECT * FROM transport_routes WHERE school_id = ? AND id = ?', [req.schoolId, routeId]);
  if (!route) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transport route not found' } });
  }

  // Capacity validation
  const currentCount = queryOne('SELECT COUNT(*) as count FROM student_transport WHERE route_id = ?', [routeId]).count;
  if (currentCount >= route.capacity) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BUS_CAPACITY_EXCEEDED',
        message: `Bus '${route.vehicle_number}' capacity of ${route.capacity} seats is full`
      }
    });
  }

  run(`
    INSERT OR REPLACE INTO student_transport (school_id, student_id, route_id, stop_id)
    VALUES (?, ?, ?, ?)
  `, [req.schoolId, studentId, routeId, stopId]);

  logAudit(req.schoolId, req.user.id, 'ALLOCATE_TRANSPORT', 'student_transport', `${studentId}-${routeId}`, null, { studentId, routeId, stopId }, req);

  res.json({ success: true, message: 'Student allocated to transport route successfully' });
});

module.exports = router;
