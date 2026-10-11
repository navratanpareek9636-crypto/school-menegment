const crypto = require('node:crypto');

class MockPaymentGateway {
  constructor() {
    this.provider = 'Razorpay-Mock-Adapter';
    this.simulatedOrders = new Map();
  }

  createOrder(amount, receipt, notes = {}) {
    const orderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    const order = {
      id: orderId,
      amount: Math.round(Number(amount) * 100), // in paise
      currency: 'INR',
      receipt,
      status: 'created',
      notes,
      createdAt: new Date().toISOString()
    };
    this.simulatedOrders.set(orderId, order);
    return order;
  }

  verifyPayment(orderId, paymentId, signature) {
    const order = this.simulatedOrders.get(orderId);
    if (!order) {
      return { success: false, error: 'Order not found in mock gateway' };
    }

    // In mock mode, any non-empty signature is verified successfully
    return {
      success: true,
      orderId,
      paymentId: paymentId || `pay_mock_${crypto.randomBytes(8).toString('hex')}`,
      status: 'captured',
      amount: order.amount / 100,
      verifiedAt: new Date().toISOString()
    };
  }
}

module.exports = new MockPaymentGateway();
