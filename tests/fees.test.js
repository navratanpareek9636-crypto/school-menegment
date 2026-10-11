const test = require('node:test');
const assert = require('node:assert/strict');
const { query, queryOne, run, transaction } = require('../server/config/database');

test('Financial Accounting & Fee Controls Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  const adminUser = query("SELECT id FROM users WHERE username = 'admin.dpms@schoolerp.internal'")[0];

  assert.ok(school && adminUser, 'Prerequisites must exist');

  // Find or create test allocation
  let alloc = queryOne(`
    SELECT sfa.* FROM student_fee_allocations sfa
    WHERE sfa.school_id = ? AND sfa.net_payable > 0 AND sfa.status = 'unpaid'
    LIMIT 1
  `, [school.id]);

  if (!alloc) {
    // Pick an existing student and structure
    const stu = queryOne('SELECT id FROM students WHERE school_id = ? LIMIT 1', [school.id]);
    const struct = queryOne('SELECT id, session_id FROM fee_structures WHERE school_id = ? LIMIT 1', [school.id]);
    run(`
      INSERT INTO student_fee_allocations (school_id, student_id, session_id, structure_id, gross_amount, discount_amount, net_payable, due_date, status)
      VALUES (?, ?, ?, ?, 10000.0, 0.0, 10000.0, '2026-11-30', 'unpaid')
    `, [school.id, stu.id, struct.session_id, struct.id]);
    alloc = queryOne('SELECT * FROM student_fee_allocations WHERE school_id = ? ORDER BY id DESC LIMIT 1', [school.id]);
  }

  const testIdempotencyKey = `IDEMP-${Date.now()}`;
  let paymentId = null;

  await t.test('Partial fee payment records receipt and updates status to partial', () => {
    const payAmount = 4000.00;
    const receiptNo = `REC-TEST-${Date.now()}`;

    run(`
      INSERT INTO fee_payments (
        school_id, allocation_id, receipt_number, idempotency_key, payment_date,
        amount_paid, payment_mode, collected_by, notes
      ) VALUES (?, ?, ?, ?, CURRENT_DATE, ?, 'upi', ?, 'Partial test payment')
    `, [school.id, alloc.id, receiptNo, testIdempotencyKey, payAmount, adminUser.id]);

    const payment = queryOne('SELECT * FROM fee_payments WHERE receipt_number = ?', [receiptNo]);
    assert.ok(payment);
    assert.equal(payment.amount_paid, 4000.00);
    paymentId = payment.id;

    // Update allocation to partial
    run("UPDATE student_fee_allocations SET status = 'partial' WHERE id = ?", [alloc.id]);
    const updatedAlloc = queryOne('SELECT * FROM student_fee_allocations WHERE id = ?', [alloc.id]);
    assert.equal(updatedAlloc.status, 'partial');
  });

  await t.test('Idempotency key prevents duplicate transaction submission', () => {
    // Attempting to insert another payment with the identical idempotency key must fail
    assert.throws(() => {
      run(`
        INSERT INTO fee_payments (
          school_id, allocation_id, receipt_number, idempotency_key, payment_date,
          amount_paid, payment_mode, collected_by, notes
        ) VALUES (?, ?, 'REC-DUP-ATTEMPT', ?, CURRENT_DATE, 4000.0, 'upi', ?, 'Duplicate')
      `, [school.id, alloc.id, testIdempotencyKey, adminUser.id]);
    }, /UNIQUE constraint failed/);
  });

  await t.test('Controlled reversal creates adjustment without deleting original payment', () => {
    const reversalReceiptNo = `REV-TEST-${Date.now()}`;

    transaction(() => {
      // Mark original payment as reversed
      run('UPDATE fee_payments SET is_reversed = 1 WHERE id = ?', [paymentId]);

      // Insert adjustment record
      run(`
        INSERT INTO fee_adjustments (school_id, payment_id, reversal_receipt_no, amount, reason, authorized_by)
        VALUES (?, ?, ?, 4000.0, 'Test reversal reason verified', ?)
      `, [school.id, paymentId, reversalReceiptNo, adminUser.id]);

      // Restore allocation status
      run("UPDATE student_fee_allocations SET status = 'unpaid' WHERE id = ?", [alloc.id]);
    });

    // Check payment still exists in database (NOT deleted)
    const payment = queryOne('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
    assert.ok(payment, 'Original payment record must remain in database');
    assert.equal(payment.is_reversed, 1, 'Payment must be marked as reversed');

    // Check adjustment record
    const adjustment = queryOne('SELECT * FROM fee_adjustments WHERE reversal_receipt_no = ?', [reversalReceiptNo]);
    assert.ok(adjustment, 'Compensating adjustment record must exist');
    assert.equal(adjustment.amount, 4000.0);

    // Check allocation restored
    const restoredAlloc = queryOne('SELECT * FROM student_fee_allocations WHERE id = ?', [alloc.id]);
    assert.equal(restoredAlloc.status, 'unpaid');
  });
});
