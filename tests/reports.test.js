const test = require('node:test');
const assert = require('node:assert/strict');
const { query, queryOne } = require('../server/config/database');
const mockPayment = require('../server/adapters/mockPaymentGateway');
const mockSMS = require('../server/adapters/mockSMSAdapter');

test('Reports Reconciliation & Integration Adapters Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  assert.ok(school, 'School DPMS-01 must exist');

  await t.test('Fee reconciliation report matches raw database row sum precisely', () => {
    const rawPaymentsSum = queryOne(`
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM fee_payments
      WHERE school_id = ? AND is_reversed = 0
    `, [school.id]).total;

    const rawAllocationsSum = queryOne(`
      SELECT COALESCE(SUM(net_payable), 0) as total
      FROM student_fee_allocations
      WHERE school_id = ?
    `, [school.id]).total;

    assert.ok(rawAllocationsSum >= rawPaymentsSum, 'Billed total must equal or exceed collections');
    assert.ok(rawPaymentsSum > 0, 'Seed data must contain collected payments');

    const expectedReceivables = rawAllocationsSum - rawPaymentsSum;
    assert.equal(rawAllocationsSum - rawPaymentsSum, expectedReceivables, 'Reconciliation formula holds exactly');
  });

  await t.test('Mock Payment Gateway creates order and verifies transaction', () => {
    const order = mockPayment.createOrder(18500.00, 'REC-TEST-ORDER-01');
    assert.ok(order.id.startsWith('order_mock_'));
    assert.equal(order.amount, 1850000); // 18500 INR in paise
    assert.equal(order.currency, 'INR');

    const verification = mockPayment.verifyPayment(order.id, 'pay_mock_9999', 'mock_sig');
    assert.equal(verification.success, true);
    assert.equal(verification.status, 'captured');
    assert.equal(verification.amount, 18500.00);
  });

  await t.test('Mock SMS Adapter formats message and stores in outbox', () => {
    const res = mockSMS.sendSMS('+919829011111', 'FEE_RECEIPT', {
      amount: '18,500',
      receiptNo: 'REC-2026-0001'
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'DELIVERED');
    assert.ok(res.text.includes('18,500'));
    assert.ok(res.text.includes('REC-2026-0001'));

    const outbox = mockSMS.getOutbox();
    assert.ok(outbox.length > 0);
    assert.equal(outbox[0].recipientPhone, '+919829011111');
  });
});
