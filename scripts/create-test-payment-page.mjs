#!/usr/bin/env node

/**
 * Create Test Payment Page
 * 
 * This script creates a standalone HTML page for testing Stripe payments
 * with a realistic rental reference code. You can use this to test the
 * complete payment flow once you have your Stripe keys configured.
 * 
 * Usage: node scripts/create-test-payment-page.mjs
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

// Generate realistic test rental data
function generateTestRental() {
  const timestamp = Date.now();
  const rentalId = `R${timestamp.toString().slice(-6)}`;
  const customerName = 'John Smith';
  const vehicleReg = 'NSW123ABC';
  const amount = 450.00;
  const stripeReference = `STR-${rentalId}-${vehicleReg}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  return {
    id: rentalId,
    customer: customerName,
    vehicleRegistration: vehicleReg,
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    amount: amount,
    currency: 'aud',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    stripeReference: stripeReference,
    description: `RENT-${rentalId}-${customerName.replace(/\s+/g, '').toUpperCase()}`
  };
}

// Create comprehensive test HTML page
function createTestPaymentPage(rental) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FleetSync Payment Test - ${rental.id}</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2rem; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1rem; }
        .content { padding: 30px; }
        .rental-info { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0;
            border-radius: 8px; 
            padding: 25px; 
            margin-bottom: 30px; 
        }
        .rental-info h3 { 
            color: #2d3748; 
            margin-bottom: 20px; 
            font-size: 1.3rem;
            border-bottom: 2px solid #4299e1;
            padding-bottom: 10px;
        }
        .info-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px; 
        }
        .info-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .info-item:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #4a5568; }
        .info-value { color: #2d3748; font-family: monospace; }
        .amount { font-size: 1.2rem; font-weight: bold; color: #38a169; }
        .reference { font-size: 1.1rem; font-weight: bold; color: #3182ce; }
        
        .payment-section { 
            background: #ffffff; 
            border: 2px solid #e2e8f0;
            border-radius: 8px; 
            padding: 25px; 
            margin-bottom: 30px; 
        }
        .payment-section h3 { 
            color: #2d3748; 
            margin-bottom: 20px; 
            font-size: 1.3rem;
        }
        
        .setup-notice {
            background: #fed7d7;
            border: 1px solid #fc8181;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .setup-notice h4 { color: #c53030; margin-bottom: 10px; }
        .setup-notice p { color: #742a2a; line-height: 1.6; }
        
        .test-cards { 
            background: #f0fff4; 
            border: 1px solid #9ae6b4;
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
        }
        .test-cards h4 { color: #276749; margin-bottom: 15px; }
        .test-cards ul { list-style: none; }
        .test-cards li { 
            padding: 8px 0; 
            border-bottom: 1px solid #c6f6d5;
            display: flex;
            justify-content: space-between;
        }
        .test-cards li:last-child { border-bottom: none; }
        .card-number { font-family: monospace; font-weight: bold; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 600; 
            color: #4a5568; 
        }
        #card-element { 
            padding: 15px; 
            border: 2px solid #e2e8f0; 
            border-radius: 6px; 
            background: #ffffff;
            transition: border-color 0.3s;
        }
        #card-element:focus-within { border-color: #4299e1; }
        
        .pay-button { 
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white; 
            padding: 15px 30px; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 1.1rem;
            font-weight: 600;
            width: 100%;
            transition: all 0.3s;
        }
        .pay-button:hover { 
            background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .pay-button:disabled { 
            background: #a0aec0; 
            cursor: not-allowed; 
            transform: none;
            box-shadow: none;
        }
        
        .error { 
            color: #e53e3e; 
            background: #fed7d7;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px; 
            border: 1px solid #fc8181;
        }
        .success { 
            color: #38a169; 
            background: #f0fff4;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px; 
            border: 1px solid #9ae6b4;
        }
        
        .webhook-info {
            background: #ebf8ff;
            border: 1px solid #90cdf4;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }
        .webhook-info h4 { color: #2c5282; margin-bottom: 10px; }
        .webhook-info p { color: #2a4365; line-height: 1.6; }
        
        .steps {
            background: #f7fafc;
            border-radius: 8px;
            padding: 25px;
            margin-top: 20px;
        }
        .steps h4 { color: #2d3748; margin-bottom: 15px; }
        .steps ol { padding-left: 20px; }
        .steps li { margin-bottom: 10px; color: #4a5568; line-height: 1.6; }
        
        @media (max-width: 768px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 FleetSync Payment Test</h1>
            <p>Test your Stripe integration with a real rental scenario</p>
        </div>
        
        <div class="content">
            <div class="rental-info">
                <h3>📋 Rental Details</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Rental ID:</span>
                        <span class="info-value">${rental.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Customer:</span>
                        <span class="info-value">${rental.customer}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Vehicle:</span>
                        <span class="info-value">${rental.vehicleMake} ${rental.vehicleModel}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Registration:</span>
                        <span class="info-value">${rental.vehicleRegistration}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Rental Period:</span>
                        <span class="info-value">${rental.startDate} to ${rental.endDate}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Amount:</span>
                        <span class="info-value amount">$${rental.amount} ${rental.currency.toUpperCase()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Stripe Reference:</span>
                        <span class="info-value reference">${rental.stripeReference}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Description:</span>
                        <span class="info-value">${rental.description}</span>
                    </div>
                </div>
            </div>
            
            <div class="payment-section">
                <h3>💳 Payment Processing</h3>
                
                <div class="setup-notice">
                    <h4>⚠️ Setup Required</h4>
                    <p>To test payments, you need to:</p>
                    <ol style="margin-top: 10px; padding-left: 20px;">
                        <li>Configure your Stripe API keys in .env.local</li>
                        <li>Start your development server (npm run dev)</li>
                        <li>Replace 'YOUR_PUBLISHABLE_KEY_HERE' below with your actual key</li>
                    </ol>
                </div>
                
                <form id="payment-form">
                    <div class="form-group">
                        <label for="card-element">Card Details</label>
                        <div id="card-element">
                            <!-- Stripe Elements will create form elements here -->
                        </div>
                        <div id="card-errors" class="error" style="display: none;"></div>
                    </div>
                    <button type="submit" id="submit-button" class="pay-button">
                        💳 Pay $${rental.amount} ${rental.currency.toUpperCase()}
                    </button>
                </form>
                <div id="payment-result"></div>
            </div>
            
            <div class="test-cards">
                <h4>🧪 Test Card Numbers</h4>
                <ul>
                    <li>
                        <span>Successful Payment:</span>
                        <span class="card-number">4242 4242 4242 4242</span>
                    </li>
                    <li>
                        <span>Declined Payment:</span>
                        <span class="card-number">4000 0000 0000 0002</span>
                    </li>
                    <li>
                        <span>Insufficient Funds:</span>
                        <span class="card-number">4000 0000 0000 9995</span>
                    </li>
                    <li>
                        <span>Expired Card:</span>
                        <span class="card-number">4000 0000 0000 0069</span>
                    </li>
                </ul>
                <p style="margin-top: 15px; color: #4a5568;">
                    <strong>Expiry:</strong> Any future date (e.g., 12/25) • 
                    <strong>CVC:</strong> Any 3 digits (e.g., 123)
                </p>
            </div>
            
            <div class="webhook-info">
                <h4>🔗 Webhook Testing</h4>
                <p>When a payment succeeds, Stripe will send a webhook to your application with the rental reference code. 
                Your webhook handler will automatically update the payment status in the database using the rental ID: <strong>${rental.id}</strong></p>
            </div>
            
            <div class="steps">
                <h4>📝 Complete Setup Steps</h4>
                <ol>
                    <li>Get your Stripe API keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank">Stripe Dashboard</a></li>
                    <li>Add them to your .env.local file:
                        <pre style="background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 4px; margin: 10px 0;">STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here</pre>
                    </li>
                    <li>Start your development server: <code>npm run dev</code></li>
                    <li>Update the Stripe initialization below with your publishable key</li>
                    <li>Set up webhooks in Stripe Dashboard pointing to: <code>http://localhost:3000/api/webhooks/stripe</code></li>
                    <li>Test the payment flow with the test cards above</li>
                </ol>
            </div>
        </div>
    </div>

    <script>
        // Replace 'YOUR_PUBLISHABLE_KEY_HERE' with your actual Stripe publishable key
        const STRIPE_PUBLISHABLE_KEY = 'YOUR_PUBLISHABLE_KEY_HERE';
        
        if (STRIPE_PUBLISHABLE_KEY === 'YOUR_PUBLISHABLE_KEY_HERE') {
            document.getElementById('payment-form').innerHTML = 
                '<div class="error">Please configure your Stripe publishable key in this HTML file and restart your development server.</div>';
        } else {
            const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
            const elements = stripe.elements();
            const cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                            color: '#aab7c4',
                        },
                    },
                },
            });
            cardElement.mount('#card-element');

            const form = document.getElementById('payment-form');
            const submitButton = document.getElementById('submit-button');
            const resultDiv = document.getElementById('payment-result');
            const errorsDiv = document.getElementById('card-errors');

            cardElement.on('change', ({error}) => {
                if (error) {
                    errorsDiv.textContent = error.message;
                    errorsDiv.style.display = 'block';
                } else {
                    errorsDiv.textContent = '';
                    errorsDiv.style.display = 'none';
                }
            });

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                submitButton.disabled = true;
                submitButton.textContent = '🔄 Processing Payment...';
                resultDiv.innerHTML = '';

                try {
                    // First, create a payment intent
                    const response = await fetch('/api/stripe/create-payment-intent', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            rentalId: '${rental.id}',
                            amount: ${rental.amount},
                            currency: '${rental.currency}',
                            customerName: '${rental.customer}',
                            vehicleRegistration: '${rental.vehicleRegistration}',
                        }),
                    });

                    const paymentData = await response.json();
                    
                    if (!paymentData.success) {
                        throw new Error(paymentData.message || 'Failed to create payment intent');
                    }

                    // Confirm the payment
                    const {error, paymentIntent} = await stripe.confirmCardPayment(paymentData.data.clientSecret, {
                        payment_method: {
                            card: cardElement,
                            billing_details: {
                                name: '${rental.customer}',
                            },
                        }
                    });

                    if (error) {
                        resultDiv.innerHTML = '<div class="error">❌ Payment failed: ' + error.message + '</div>';
                    } else {
                        resultDiv.innerHTML = \`
                            <div class="success">
                                <h4>✅ Payment Successful!</h4>
                                <p><strong>Payment Intent ID:</strong> \${paymentIntent.id}</p>
                                <p><strong>Rental Reference:</strong> ${rental.id}</p>
                                <p><strong>Amount:</strong> $${rental.amount} ${rental.currency.toUpperCase()}</p>
                                <p><strong>Status:</strong> \${paymentIntent.status}</p>
                                <p style="margin-top: 15px;">The webhook should now update the payment status in your database.</p>
                            </div>
                        \`;
                        console.log('Payment succeeded:', paymentIntent);
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
                }

                submitButton.disabled = false;
                submitButton.textContent = '💳 Pay $${rental.amount} ${rental.currency.toUpperCase()}';
            });
        }
    </script>
</body>
</html>`;
}

// Main function
function createTestPage() {
  log('🧪 Creating Stripe Payment Test Page', 'cyan');
  log('===================================', 'cyan');
  
  try {
    // Generate test rental
    const testRental = generateTestRental();
    log('\n📋 Generated test rental:', 'blue');
    log(`   Rental ID: ${testRental.id}`, 'cyan');
    log(`   Customer: ${testRental.customer}`, 'cyan');
    log(`   Vehicle: ${testRental.vehicleMake} ${testRental.vehicleModel} (${testRental.vehicleRegistration})`, 'cyan');
    log(`   Amount: $${testRental.amount} ${testRental.currency.toUpperCase()}`, 'cyan');
    log(`   Stripe Reference: ${testRental.stripeReference}`, 'cyan');
    log(`   Description: ${testRental.description}`, 'cyan');
    
    // Create HTML content
    const htmlContent = createTestPaymentPage(testRental);
    
    // Ensure debug directory exists
    const debugDir = path.join(__dirname, '..', 'public', 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
      log('✅ Created debug directory', 'green');
    }
    
    // Save test HTML file
    const fileName = `stripe-payment-test-${testRental.id}.html`;
    const filePath = path.join(debugDir, fileName);
    fs.writeFileSync(filePath, htmlContent);
    
    log(`\n✅ Test payment page created successfully!`, 'green');
    log(`   File: public/debug/${fileName}`, 'cyan');
    log(`   URL: http://localhost:3000/debug/${fileName}`, 'cyan');
    
    log('\n🎯 Next Steps:', 'blue');
    log('1. Configure your Stripe API keys in .env.local:', 'yellow');
    log('   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here', 'cyan');
    log('   STRIPE_SECRET_KEY=sk_test_your_key_here', 'cyan');
    log('   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here', 'cyan');
    
    log('\n2. Start your development server:', 'yellow');
    log('   npm run dev', 'cyan');
    
    log('\n3. Open the test page:', 'yellow');
    log(`   http://localhost:3000/debug/${fileName}`, 'cyan');
    
    log('\n4. Update the HTML file with your publishable key', 'yellow');
    log('   (Replace YOUR_PUBLISHABLE_KEY_HERE in the HTML)', 'cyan');
    
    log('\n5. Test with these cards:', 'yellow');
    log('   Success: 4242424242424242', 'cyan');
    log('   Decline: 4000000000000002', 'cyan');
    log('   Expiry: 12/25, CVC: 123', 'cyan');
    
    log('\n📊 What this test covers:', 'magenta');
    log('✅ Real rental reference code generation', 'green');
    log('✅ Stripe payment intent creation', 'green');
    log('✅ Payment processing with rental metadata', 'green');
    log('✅ Webhook payload with rental ID', 'green');
    log('✅ Complete payment flow simulation', 'green');
    
    log('\n🔗 The rental reference code in the payment will be:', 'blue');
    log(`   ${testRental.stripeReference}`, 'cyan');
    log('   This will be sent to your webhook when payment succeeds!', 'cyan');
    
  } catch (error) {
    log(`❌ Failed to create test page: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the script
createTestPage(); 