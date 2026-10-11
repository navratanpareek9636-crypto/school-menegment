const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/fees/heads
 */
router.get('/heads', (req, res) => {
  const heads = query('SELECT * FROM fee_heads WHERE school_id = ? ORDER BY name ASC', [req.schoolId]);
  res.json({ success: true, data: heads });
});

/**
 * POST /api/fees/heads
 */
router.post('/heads', requireRole(['admin', 'principal', 'accountant']), (req, res) => {
  const { name, code, description } = req.body;
  if (!name || !code) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Name and code are required' } });
  }

  const existing = queryOne('SELECT id FROM fee_heads WHERE school_id = ? AND code = ?', [req.schoolId, code]);
  if (existing) {
    return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: `Fee head '${code}' already exists` } });
  }

  run('INSERT INTO fee_heads (school_id, name, code, description) VALUES (?, ?, ?, ?)', [
    req.schoolId, name, code, description || ''
  ]);
  const created = queryOne('SELECT * FROM fee_heads WHERE school_id = ? AND code = ?', [req.schoolId, code]);
  res.status(201).json({ success: true, data: created });
});

/**
 * GET /api/fees/structures
 */
router.get('/structures', (req, res) => {
  const structures = query(`
    SELECT fs.*, c.name as class_name, s.name as session_name
    FROM fee_structures fs
    JOIN classes c ON fs.class_id = c.id
    JOIN academic_sessions s ON fs.session_id = s.id
    WHERE fs.school_id = ?
    ORDER BY c.numeric_level ASC
  `, [req.schoolId]);

  const result = structures.map(st => {
    const items = query(`
      SELECT fsi.*, fh.name as fee_head_name, fh.code as fee_head_code
      FROM fee_structure_items fsi
      JOIN fee_heads fh ON fsi.fee_head_id = fh.id
      WHERE fsi.structure_id = ?
    `, [st.id]);
    return { ...st, items };
  });

  res.json({ success: true, data: result });
});

/**
 * POST /api/fees/structures
 */
router.post('/structures', requireRole(['admin', 'principal', 'accountant']), (req, res) => {
  const { sessionId, classId, name, frequency = 'quarterly', items } = req.body;

  if (!sessionId || !classId || !name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'sessionId, classId, name, and fee items array are required' }
    });
  }

  const totalAmount = items.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  let structureId = null;
  transaction(() => {
    run(`
      INSERT INTO fee_structures (school_id, session_id, class_id, name, frequency, total_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.schoolId, sessionId, classId, name, frequency, totalAmount]);

    const created = queryOne('SELECT id FROM fee_structures WHERE school_id = ? AND name = ?', [req.schoolId, name]);
    structureId = created.id;

    for (const it of items) {
      run('INSERT INTO fee_structure_items (structure_id, fee_head_id, amount) VALUES (?, ?, ?)', [
        structureId, it.feeHeadId, Number(it.amount)
      ]);
    }
  });

  const createdStructure = queryOne('SELECT * FROM fee_structures WHERE id = ?', [structureId]);
  logAudit(req.schoolId, req.user.id, 'CREATE_FEE_STRUCTURE', 'fee_structures', structureId, null, createdStructure, req);

  res.status(201).json({ success: true, data: createdStructure });
});

/**
 * POST /api/fees/allocate - Allocate fee structure to class students
 */
router.post('/allocate', requireRole(['admin', 'accountant']), (req, res) => {
  const { structureId, classId, dueDate } = req.body;

  if (!structureId || !classId || !dueDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'structureId, classId, and dueDate are required' }
    });
  }

  const structure = queryOne('SELECT * FROM fee_structures WHERE school_id = ? AND id = ?', [req.schoolId, structureId]);
  if (!structure) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Fee structure not found' } });
  }

  const enrolledStudents = query(`
    SELECT s.id, s.rte_student
    FROM students s
    JOIN enrollments e ON s.id = e.student_id
    WHERE s.school_id = ? AND e.class_id = ? AND s.status = 'active'
  `, [req.schoolId, classId]);

  let allocatedCount = 0;
  transaction(() => {
    for (const stu of enrolledStudents) {
      const existing = queryOne(`
        SELECT id FROM student_fee_allocations
        WHERE school_id = ? AND student_id = ? AND structure_id = ?
      `, [req.schoolId, stu.id, structureId]);

      if (!existing) {
        const gross = structure.total_amount;
        const discount = stu.rte_student === 1 ? gross : 0.0; // 100% RTE waiver
        const net = gross - discount;
        const status = stu.rte_student === 1 ? 'paid' : 'unpaid';

        run(`
          INSERT INTO student_fee_allocations (
            school_id, student_id, session_id, structure_id, gross_amount, discount_amount, net_payable, due_date, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.schoolId, stu.id, structure.session_id, structureId, gross, discount, net, dueDate, status]);
        allocatedCount++;
      }
    }
  });

  res.json({
    success: true,
    message: `Fee structure allocated to ${allocatedCount} students`,
    allocatedCount
  });
});

/**
 * GET /api/fees/allocations - List student fee allocations
 */
router.get('/allocations', (req, res) => {
  const { classId, studentId, status, search, page = 1, limit = 25 } = req.query;
  const offset = (page - 1) * limit;

  let whereClauses = ['sfa.school_id = ?'];
  let params = [req.schoolId];

  if (classId) {
    whereClauses.push('fs.class_id = ?');
    params.push(classId);
  }

  if (studentId) {
    whereClauses.push('sfa.student_id = ?');
    params.push(studentId);
  }

  if (status) {
    whereClauses.push('sfa.status = ?');
    params.push(status);
  }

  if (search) {
    whereClauses.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  const total = query(`
    SELECT COUNT(*) as count
    FROM student_fee_allocations sfa
    JOIN students s ON sfa.student_id = s.id
    JOIN fee_structures fs ON sfa.structure_id = fs.id
    WHERE ${whereSql}
  `, params)[0].count;

  const allocations = query(`
    SELECT
      sfa.*,
      s.first_name,
      s.last_name,
      s.admission_number,
      s.rte_student,
      fs.name as structure_name,
      c.name as class_name,
      COALESCE((
        SELECT SUM(amount_paid) FROM fee_payments
        WHERE allocation_id = sfa.id AND is_reversed = 0
      ), 0) as paid_amount
    FROM student_fee_allocations sfa
    JOIN students s ON sfa.student_id = s.id
    JOIN fee_structures fs ON sfa.structure_id = fs.id
    JOIN classes c ON fs.class_id = c.id
    WHERE ${whereSql}
    ORDER BY sfa.id DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), Number(offset)]);

  // Compute outstanding balance
  const data = allocations.map(a => ({
    ...a,
    balance: Math.max(0, a.net_payable - a.paid_amount)
  }));

  res.json({
    success: true,
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * POST /api/fees/pay - Collect fee payment with idempotency protection & receipts
 */
router.post('/pay', requireRole(['admin', 'accountant']), (req, res) => {
  const { allocationId, amountPaid, paymentMode = 'cash', transactionReference, idempotencyKey, notes } = req.body;

  if (!allocationId || amountPaid === undefined || Number(amountPaid) <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'allocationId and positive amountPaid are required' }
    });
  }

  // 1. Idempotency protection check
  if (idempotencyKey) {
    const existingPayment = queryOne('SELECT * FROM fee_payments WHERE idempotency_key = ?', [idempotencyKey]);
    if (existingPayment) {
      return res.status(200).json({
        success: true,
        data: existingPayment,
        isIdempotentReplay: true,
        message: 'Payment already processed with this idempotency key'
      });
    }
  }

  const alloc = queryOne('SELECT * FROM student_fee_allocations WHERE school_id = ? AND id = ?', [req.schoolId, allocationId]);
  if (!alloc) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Fee allocation not found' } });
  }

  const priorPaid = queryOne(`
    SELECT COALESCE(SUM(amount_paid), 0) as total
    FROM fee_payments
    WHERE allocation_id = ? AND is_reversed = 0
  `, [allocationId]).total;

  const currentOutstanding = alloc.net_payable - priorPaid;
  const payAmount = Number(amountPaid);

  if (payAmount > currentOutstanding + 0.01) { // 1 cent grace for floating point
    return res.status(400).json({
      success: false,
      error: {
        code: 'OVERPAYMENT_NOT_ALLOWED',
        message: `Payment amount ₹${payAmount} exceeds outstanding balance of ₹${currentOutstanding.toFixed(2)}`
      }
    });
  }

  // Generate unique receipt sequence
  const receiptCount = queryOne('SELECT COUNT(*) as count FROM fee_payments WHERE school_id = ?', [req.schoolId]).count + 1;
  const year = new Date().getFullYear();
  const receiptNumber = `REC-${year}-SCH${req.schoolId}-${String(receiptCount).padStart(5, '0')}`;

  let paymentRecord = null;
  transaction(() => {
    run(`
      INSERT INTO fee_payments (
        school_id, allocation_id, receipt_number, idempotency_key, payment_date,
        amount_paid, payment_mode, transaction_reference, collected_by, notes
      ) VALUES (?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?)
    `, [
      req.schoolId, allocationId, receiptNumber, idempotencyKey || null,
      payAmount, paymentMode, transactionReference || null, req.user.id, notes || ''
    ]);

    paymentRecord = queryOne('SELECT * FROM fee_payments WHERE school_id = ? AND receipt_number = ?', [req.schoolId, receiptNumber]);

    // Update allocation status
    const newTotalPaid = priorPaid + payAmount;
    const newStatus = (newTotalPaid >= alloc.net_payable - 0.01) ? 'paid' : 'partial';
    run('UPDATE student_fee_allocations SET status = ? WHERE id = ?', [newStatus, allocationId]);
  });

  logAudit(req.schoolId, req.user.id, 'FEE_PAYMENT_COLLECTED', 'fee_payments', paymentRecord.id, null, paymentRecord, req);

  res.status(201).json({
    success: true,
    data: paymentRecord,
    updatedBalance: Math.max(0, currentOutstanding - payAmount)
  });
});

/**
 * POST /api/fees/adjustments/reverse - Controlled reversal of payment
 */
router.post('/adjustments/reverse', requireRole(['admin', 'accountant']), (req, res) => {
  const { paymentId, reason } = req.body;

  if (!paymentId || !reason || reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'paymentId and justification reason are required' }
    });
  }

  const payment = queryOne('SELECT * FROM fee_payments WHERE school_id = ? AND id = ?', [req.schoolId, paymentId]);
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment record not found' } });
  }

  if (payment.is_reversed === 1) {
    return res.status(400).json({
      success: false,
      error: { code: 'ALREADY_REVERSED', message: 'This transaction has already been reversed' }
    });
  }

  const reversalCount = queryOne('SELECT COUNT(*) as count FROM fee_adjustments WHERE school_id = ?', [req.schoolId]).count + 1;
  const reversalReceiptNo = `REV-${new Date().getFullYear()}-${String(reversalCount).padStart(5, '0')}`;

  transaction(() => {
    // 1. Mark payment as reversed (never delete)
    run('UPDATE fee_payments SET is_reversed = 1 WHERE id = ?', [paymentId]);

    // 2. Record adjustment entry
    run(`
      INSERT INTO fee_adjustments (school_id, payment_id, reversal_receipt_no, amount, reason, authorized_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.schoolId, paymentId, reversalReceiptNo, payment.amount_paid, reason, req.user.id]);

    // 3. Re-calculate and update student allocation status
    const remainingPaid = queryOne(`
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM fee_payments
      WHERE allocation_id = ? AND is_reversed = 0
    `, [payment.allocation_id]).total;

    const alloc = queryOne('SELECT net_payable FROM student_fee_allocations WHERE id = ?', [payment.allocation_id]);
    const newStatus = remainingPaid <= 0 ? 'unpaid' : (remainingPaid >= alloc.net_payable - 0.01) ? 'paid' : 'partial';

    run('UPDATE student_fee_allocations SET status = ? WHERE id = ?', [newStatus, payment.allocation_id]);
  });

  const adjustment = queryOne('SELECT * FROM fee_adjustments WHERE reversal_receipt_no = ?', [reversalReceiptNo]);
  logAudit(req.schoolId, req.user.id, 'FEE_PAYMENT_REVERSED', 'fee_adjustments', adjustment.id, payment, adjustment, req);

  res.json({
    success: true,
    message: 'Payment reversed successfully with audit entry',
    data: adjustment
  });
});

/**
 * GET /api/fees/receipts/:id - Receipt print details
 */
router.get('/receipts/:id', (req, res) => {
  const receiptId = Number(req.params.id);

  const receipt = queryOne(`
    SELECT
      fp.*,
      sfa.gross_amount,
      sfa.discount_amount,
      sfa.net_payable,
      s.first_name,
      s.last_name,
      s.admission_number,
      c.name as class_name,
      sec.name as section_name,
      sch.name as school_name,
      sch.affiliation_number,
      sch.address as school_address,
      sch.phone as school_phone,
      u.full_name as cashier_name
    FROM fee_payments fp
    JOIN student_fee_allocations sfa ON fp.allocation_id = sfa.id
    JOIN students s ON sfa.student_id = s.id
    JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
    JOIN classes c ON e.class_id = c.id
    JOIN sections sec ON e.section_id = sec.id
    JOIN schools sch ON fp.school_id = sch.id
    JOIN users u ON fp.collected_by = u.id
    WHERE fp.school_id = ? AND fp.id = ?
  `, [req.schoolId, receiptId]);

  if (!receipt) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Receipt not found' } });
  }

  res.json({ success: true, data: receipt });
});

module.exports = router;
