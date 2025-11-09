#!/usr/bin/env node

/**
 * Test script to simulate CommBank payment notifications
 * This script sends test webhook requests to the local development server
 * to verify that automatic payment updates are working correctly.
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/commbank';
const WEBHOOK_SECRET = 'your-webhook-secret'; // Should match your environment variable

// Sample payment notifications for testing
const testPayments = [
  {
    transactionId: 'TXN-001-' + Date.now(),
    amount: 623.0,
    currency: 'AUD',
    paymentMethod: 'Bank Transfer',
    paymentReference: 'FLEET-r2-MICHAELCHEN', // This should match rental ID r2
    payerName: 'Michael Chen',
    payerAccount: '123-456-789012',
    timestamp: new Date().toISOString(),
    status: 'completed',
  },
  {
    transactionId: 'TXN-002-' + Date.now(),
    amount: 267.0,
    currency: 'AUD',
    paymentMethod: 'Bank Transfer',
    paymentReference: 'FLEET-r3-EMMAWILSON', // This should match rental ID r3
    payerName: 'Emma Wilson',
    payerAccount: '987-654-321098',
    timestamp: new Date().toISOString(),
    status: 'completed',
  },
  {
    transactionId: 'TXN-003-' + Date.now(),
    amount: 534.0,
    currency: 'AUD',
    paymentMethod: 'Credit Card',
    paymentReference: 'FLEET-r4-DAVIDBROWN', // This should match rental ID r4
    payerName: 'David Brown',
    payerAccount: '456-789-123456',
    timestamp: new Date().toISOString(),
    status: 'completed',
  },
];

// Function to generate webhook signature
function generateSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Function to send webhook request
function sendWebhookRequest(paymentData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(paymentData);
    const signature = generateSignature(payload, WEBHOOK_SECRET);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/webhooks/commbank',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-commbank-signature': signature,
        'User-Agent': 'CommBank-Webhook/1.0',
      },
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: response,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Function to test all payments
async function testAllPayments() {
  console.log('🚀 Starting CommBank webhook tests...');
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔐 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
  console.log('');

  for (let i = 0; i < testPayments.length; i++) {
    const payment = testPayments[i];
    console.log(
      `📤 Test ${i + 1}/${testPayments.length}: Sending payment notification`
    );
    console.log(`   Transaction ID: ${payment.transactionId}`);
    console.log(`   Amount: $${payment.amount}`);
    console.log(`   Reference: ${payment.paymentReference}`);
    console.log(`   Payer: ${payment.payerName}`);

    try {
      const response = await sendWebhookRequest(payment);

      if (response.statusCode === 200) {
        console.log(
          `   ✅ Success: ${response.body.message || 'Payment processed'}`
        );
        if (response.body.updatedPayment) {
          console.log(
            `   📋 Updated rental: ${response.body.updatedPayment.customer}`
          );
        }
      } else {
        console.log(`   ❌ Failed: HTTP ${response.statusCode}`);
        console.log(
          `   📄 Response: ${JSON.stringify(response.body, null, 2)}`
        );
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }

    console.log('');

    // Wait 1 second between requests
    if (i < testPayments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('🎉 All webhook tests completed!');
  console.log('');
  console.log('💡 Next steps:');
  console.log(
    '   1. Check your browser at http://localhost:3000/fleet/payments'
  );
  console.log('   2. Verify that payment statuses have been updated');
  console.log('   3. Check the browser console for payment notifications');
}

// Function to test a single payment
async function testSinglePayment(rentalId, customerName, amount) {
  const payment = {
    transactionId: 'TXN-MANUAL-' + Date.now(),
    amount: parseFloat(amount),
    currency: 'AUD',
    paymentMethod: 'Bank Transfer',
    paymentReference: `FLEET-${rentalId}-${customerName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 10)
      .toUpperCase()}`,
    payerName: customerName,
    payerAccount: '123-456-789012',
    timestamp: new Date().toISOString(),
    status: 'completed',
  };

  console.log('📤 Sending manual payment notification:');
  console.log(`   Rental ID: ${rentalId}`);
  console.log(`   Customer: ${customerName}`);
  console.log(`   Amount: $${amount}`);
  console.log(`   Reference: ${payment.paymentReference}`);

  try {
    const response = await sendWebhookRequest(payment);

    if (response.statusCode === 200) {
      console.log(
        `   ✅ Success: ${response.body.message || 'Payment processed'}`
      );
    } else {
      console.log(`   ❌ Failed: HTTP ${response.statusCode}`);
      console.log(`   📄 Response: ${JSON.stringify(response.body, null, 2)}`);
    }
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run all test payments
    testAllPayments().catch(console.error);
  } else if (args.length === 3) {
    // Run single payment test
    const [rentalId, customerName, amount] = args;
    testSinglePayment(rentalId, customerName, amount).catch(console.error);
  } else {
    console.log('Usage:');
    console.log(
      '  node test-commbank-webhook.js                    # Run all test payments'
    );
    console.log(
      '  node test-commbank-webhook.js <rentalId> <customerName> <amount>  # Test single payment'
    );
    console.log('');
    console.log('Examples:');
    console.log('  node test-commbank-webhook.js');
    console.log('  node test-commbank-webhook.js r2 "Michael Chen" 623.00');
  }
}

module.exports = {
  testAllPayments,
  testSinglePayment,
  generateSignature,
  sendWebhookRequest,
};
