const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const mockPaymentGateway = require('../adapters/mockPaymentGateway');
const mockSMSAdapter = require('../adapters/mockSMSAdapter');

router.use(requireAuth);

/**
 * GET /api/integrations/status - Documentation and health of configured adapters
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        name: 'Payment Gateway',
        provider: 'Razorpay / UPI Adapter',
        mode: process.env.PAYMENT_GATEWAY_PROVIDER || 'mock',
        status: 'OPERATIONAL_MOCK',
        description: 'Simulates atomic order checkout and instant payment capture verification'
      },
      {
        name: 'SMS Gateway',
        provider: 'DLT Indian SMS Gateway',
        mode: process.env.SMS_PROVIDER || 'mock',
        status: 'OPERATIONAL_MOCK',
        description: 'Delivers fee receipts, absent alerts, and urgent school circulars'
      },
      {
        name: 'UDISE+ Regulatory Sync',
        provider: 'Ministry of Education Schema Adapter',
        mode: 'standard-csv-export',
        status: 'COMPLIANT_EXPORT_READY',
        description: 'Generates standard CSV matching 11-digit school code and student demographic requirements'
      }
    ]
  });
});

/**
 * POST /api/integrations/payment/create-order
 */
router.post('/payment/create-order', (req, res) => {
  const { amount, receipt } = req.body;
  if (!amount || !receipt) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Amount and receipt are required' } });
  }

  const order = mockPaymentGateway.createOrder(amount, receipt);
  res.json({ success: true, data: order });
});

/**
 * POST /api/integrations/payment/verify
 */
router.post('/payment/verify', (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  const result = mockPaymentGateway.verifyPayment(orderId, paymentId, signature);
  res.json({ success: result.success, data: result });
});

/**
 * POST /api/integrations/sms/send
 */
router.post('/sms/send', requireRole(['admin', 'principal']), (req, res) => {
  const { phone, template, params } = req.body;
  if (!phone || !template) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Phone and template are required' } });
  }

  const result = mockSMSAdapter.sendSMS(phone, template, params || {});
  res.json({ success: true, data: result });
});

/**
 * GET /api/integrations/sms/outbox
 */
router.get('/sms/outbox', requireRole(['admin', 'principal']), (req, res) => {
  res.json({ success: true, data: mockSMSAdapter.getOutbox() });
});

module.exports = router;
