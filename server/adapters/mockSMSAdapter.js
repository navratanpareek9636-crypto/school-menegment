const crypto = require('node:crypto');

class MockSMSAdapter {
  constructor() {
    this.provider = 'DLT-SMS-Mock-Adapter';
    this.outbox = [];
  }

  sendSMS(recipientPhone, templateName, templateParams = {}) {
    const messageId = `sms_mock_${crypto.randomBytes(6).toString('hex')}`;
    let text = `[School Alert] `;

    if (templateName === 'FEE_RECEIPT') {
      text += `Dear Parent, fee payment of Rs.${templateParams.amount} received vide receipt ${templateParams.receiptNo}. Thank you.`;
    } else if (templateName === 'ABSENCE_ALERT') {
      text += `Dear Parent, your ward ${templateParams.studentName} was marked ABSENT today (${templateParams.date}).`;
    } else {
      text += templateParams.message || 'School notification circular released.';
    }

    const logEntry = {
      messageId,
      recipientPhone,
      templateName,
      text,
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    };

    this.outbox.unshift(logEntry);
    if (this.outbox.length > 100) this.outbox.pop();

    return {
      success: true,
      messageId,
      status: 'DELIVERED',
      text
    };
  }

  getOutbox() {
    return this.outbox;
  }
}

module.exports = new MockSMSAdapter();
