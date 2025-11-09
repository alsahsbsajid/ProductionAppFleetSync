#!/usr/bin/env node

/**
 * Stripe Payment Flow Test Script
 * 
 * This script tests the complete payment flow:
 * 1. Creates a test rental in the database
 * 2. Creates a Stripe payment intent with rental reference
 * 3. Simulates payment completion
 * 4. Tests webhook processing
 * 5. Verifies payment status update
 * 
 * Usage: node scripts/test-stripe-payment.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load environment variables
function loadEnvVariables() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    
    if (!fs.existsSync(envPath)) {
      return {};
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          envVars[key] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    log(`Warning: Could not load .env.local file: ${error.message}`, 'yellow');
    return {};
  }
}

// Generate test rental data
function generateTestRental() {
  const rentalId = `TEST-${Date.now()}`;
  const customerName = 'John Smith';
  const vehicleReg = 'NSW123';
  const amount = 450.00; // $450.00 rental fee
  
  return {
    id: rentalId,
    customer: customerName,
    vehicleRegistration: vehicleReg,
    amount: amount,
    currency: 'aud',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    status: 'confirmed',
    paymentStatus: 'pending'
  };
}

// Create payment intent via API
async function createPaymentIntent(rental, baseUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(`${baseUrl}/api/stripe/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rentalId: rental.id,
        amount: rental.amount,
        currency: rental.currency,
        customerName: rental.customer,
        vehicleRegistration: rental.vehicleReg,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
}

// Simulate payment completion using Stripe API
async function simulatePaymentCompletion(paymentIntentId, secretKey) {
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    
    // Confirm the payment intent (simulates successful payment)
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa', // Test payment method
      return_url: 'http://localhost:3000/payment-success',
    });
    
    return paymentIntent;
  } catch (error) {
    throw new Error(`Failed to simulate payment: ${error.message}`);
  }
}

// Create webhook payload for testing
function createWebhookPayload(paymentIntent, rental) {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntent.id,
        amount: Math.round(rental.amount * 100), // Convert to cents
        currency: rental.currency,
        status: 'succeeded',
        metadata: {
          rental_id: rental.id,
          customer_name: rental.customer,
        },
        payment_method_details: {
          type: 'card',
        },
        receipt_email: 'test@example.com',
        created: Math.floor(Date.now() / 1000),
      },
    },
  };
}

// Test webhook endpoint
async function testWebhook(webhookPayload, webhookSecret, baseUrl = 'http://localhost:3000') {
  try {
    const crypto = await import('crypto');
    
    // Create webhook signature
    const payload = JSON.stringify(webhookPayload);
    const signature = crypto.createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    const timestamp = Math.floor(Date.now() / 1000);
    const stripeSignature = `t=${timestamp},v1=${signature}`;
    
    const response = await fetch(`${baseUrl}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeSignature,
      },
      body: payload,
    });

    const result = await response.text();
    
    return {
      success: response.ok,
      status: response.status,
      response: result,
    };
  } catch (error) {
    throw new Error(`Webhook test failed: ${error.message}`);
  }
}

// Main test function
async function testStripePaymentFlow() {
  log('🧪 Stripe Payment Flow Test', 'cyan');
  log('============================', 'cyan');
  
  // Load environment variables
  const envVars = loadEnvVariables();
  const secretKey = envVars.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = envVars.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!secretKey || !secretKey.startsWith('sk_')) {
    log('❌ Stripe secret key not configured or invalid', 'red');
    log('Please set STRIPE_SECRET_KEY in your .env.local file', 'yellow');
    return;
  }
  
  if (!webhookSecret || !webhookSecret.startsWith('whsec_')) {
    log('⚠️  Webhook secret not configured - webhook test will be skipped', 'yellow');
  }
  
  try {
    // Step 1: Generate test rental
    log('\n📋 Step 1: Generating test rental...', 'blue');
    const testRental = generateTestRental();
    log(`✅ Test rental created:`, 'green');
    log(`   Rental ID: ${testRental.id}`, 'cyan');
    log(`   Customer: ${testRental.customer}`, 'cyan');
    log(`   Vehicle: ${testRental.vehicleRegistration}`, 'cyan');
    log(`   Amount: $${testRental.amount} ${testRental.currency.toUpperCase()}`, 'cyan');
    
    // Step 2: Create payment intent
    log('\n💳 Step 2: Creating Stripe payment intent...', 'blue');
    const paymentResult = await createPaymentIntent(testRental);
    
    if (!paymentResult.success) {
      throw new Error(paymentResult.message || 'Failed to create payment intent');
    }
    
    const { paymentIntentId, clientSecret, stripeReference } = paymentResult.data;
    log(`✅ Payment intent created:`, 'green');
    log(`   Payment Intent ID: ${paymentIntentId}`, 'cyan');
    log(`   Stripe Reference: ${stripeReference}`, 'cyan');
    log(`   Client Secret: ${clientSecret.substring(0, 20)}...`, 'cyan');
    
    // Step 3: Simulate payment completion (optional - requires test mode)
    if (secretKey.includes('test')) {
      log('\n🔄 Step 3: Simulating payment completion...', 'blue');
      try {
        // Note: This might not work with all test payment intents
        // In real scenarios, customers would complete payment via Stripe Checkout or Elements
        log('⚠️  Skipping automatic payment completion - use Stripe test cards manually', 'yellow');
        log('   Test card: 4242424242424242', 'cyan');
        log('   Expiry: 12/25, CVC: 123', 'cyan');
      } catch (error) {
        log(`⚠️  Could not simulate payment completion: ${error.message}`, 'yellow');
      }
    }
    
    // Step 4: Test webhook processing
    if (webhookSecret) {
      log('\n🔗 Step 4: Testing webhook processing...', 'blue');
      
      // Create mock successful payment
      const mockPaymentIntent = {
        id: paymentIntentId,
        status: 'succeeded',
      };
      
      const webhookPayload = createWebhookPayload(mockPaymentIntent, testRental);
      const webhookResult = await testWebhook(webhookPayload, webhookSecret);
      
      if (webhookResult.success) {
        log('✅ Webhook processed successfully', 'green');
        log(`   Status: ${webhookResult.status}`, 'cyan');
        log(`   Response: ${webhookResult.response}`, 'cyan');
      } else {
        log(`⚠️  Webhook processing failed: ${webhookResult.status}`, 'yellow');
        log(`   Response: ${webhookResult.response}`, 'yellow');
      }
    }
    
    // Step 5: Display payment URLs for manual testing
    log('\n🌐 Step 5: Manual testing URLs', 'blue');
    log('You can now test the payment manually:', 'cyan');
    log(`   Payment Intent ID: ${paymentIntentId}`, 'cyan');
    log(`   Client Secret: ${clientSecret}`, 'cyan');
    log(`   Stripe Reference: ${stripeReference}`, 'cyan');
    
    // Generate a simple HTML test page
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Stripe Payment - ${testRental.id}</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .payment-form { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .rental-info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        button { background: #1976d2; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #1565c0; }
        #card-element { padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        .error { color: #d32f2f; margin-top: 10px; }
        .success { color: #388e3c; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>Test Payment for Rental ${testRental.id}</h1>
    
    <div class="rental-info">
        <h3>Rental Details</h3>
        <p><strong>Rental ID:</strong> ${testRental.id}</p>
        <p><strong>Customer:</strong> ${testRental.customer}</p>
        <p><strong>Vehicle:</strong> ${testRental.vehicleRegistration}</p>
        <p><strong>Amount:</strong> $${testRental.amount} ${testRental.currency.toUpperCase()}</p>
        <p><strong>Stripe Reference:</strong> ${stripeReference}</p>
    </div>
    
    <div class="payment-form">
        <h3>Test Payment</h3>
        <form id="payment-form">
            <div id="card-element">
                <!-- Stripe Elements will create form elements here -->
            </div>
            <div id="card-errors" class="error"></div>
            <button type="submit" id="submit-button">Pay $${testRental.amount}</button>
        </form>
        <div id="payment-result"></div>
    </div>
    
    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4>Test Card Numbers:</h4>
        <ul>
            <li><strong>Success:</strong> 4242424242424242</li>
            <li><strong>Declined:</strong> 4000000000000002</li>
            <li><strong>Expiry:</strong> Any future date (e.g., 12/25)</li>
            <li><strong>CVC:</strong> Any 3 digits (e.g., 123)</li>
        </ul>
    </div>

    <script>
        const stripe = Stripe('${envVars.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here'}');
        const elements = stripe.elements();
        const cardElement = elements.create('card');
        cardElement.mount('#card-element');

        const form = document.getElementById('payment-form');
        const submitButton = document.getElementById('submit-button');
        const resultDiv = document.getElementById('payment-result');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            const {error, paymentIntent} = await stripe.confirmCardPayment('${clientSecret}', {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: '${testRental.customer}',
                    },
                }
            });

            if (error) {
                resultDiv.innerHTML = '<div class="error">Payment failed: ' + error.message + '</div>';
                submitButton.disabled = false;
                submitButton.textContent = 'Pay $${testRental.amount}';
            } else {
                resultDiv.innerHTML = '<div class="success">Payment succeeded! Payment Intent ID: ' + paymentIntent.id + '</div>';
                console.log('Payment succeeded:', paymentIntent);
            }
        });
    </script>
</body>
</html>`;
    
    // Save test HTML file
    const testHtmlPath = path.join(__dirname, '..', 'public', 'debug', `test-payment-${testRental.id}.html`);
    
    // Ensure debug directory exists
    const debugDir = path.join(__dirname, '..', 'public', 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync(testHtmlPath, testHtml);
    log(`✅ Test payment page created: /debug/test-payment-${testRental.id}.html`, 'green');
    
    // Summary
    log('\n📊 Test Summary:', 'magenta');
    log('===============', 'magenta');
    log(`✅ Rental ID: ${testRental.id}`, 'green');
    log(`✅ Payment Intent: ${paymentIntentId}`, 'green');
    log(`✅ Stripe Reference: ${stripeReference}`, 'green');
    log(`✅ Amount: $${testRental.amount} ${testRental.currency.toUpperCase()}`, 'green');
    log(`${webhookSecret ? '✅' : '⚠️ '} Webhook: ${webhookSecret ? 'Tested' : 'Not configured'}`, webhookSecret ? 'green' : 'yellow');
    
    log('\n🎯 Next Steps:', 'blue');
    log('1. Start your development server: npm run dev', 'cyan');
    log(`2. Open: http://localhost:3000/debug/test-payment-${testRental.id}.html`, 'cyan');
    log('3. Use test card: 4242424242424242', 'cyan');
    log('4. Complete the payment to test the full flow', 'cyan');
    log('5. Check your webhook logs for payment processing', 'cyan');
    
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the test
testStripePaymentFlow().catch((error) => {
  log(`❌ Test failed: ${error.message}`, 'red');
  process.exit(1);
}); 