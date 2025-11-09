#!/usr/bin/env node

/**
 * Test Server Endpoints
 * 
 * This script tests if your development server is running and
 * if the Stripe API endpoints are accessible.
 * 
 * Usage: node scripts/test-server-endpoints.mjs
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

// Test if server is running
async function testServerHealth(baseUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Stripe webhook endpoint
async function testStripeWebhook(baseUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/stripe`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test payment intent endpoint
async function testPaymentIntentEndpoint(baseUrl = 'http://localhost:3000') {
  try {
    const testPayload = {
      rentalId: 'TEST123',
      amount: 100,
      currency: 'aud',
      customerName: 'Test Customer',
      vehicleRegistration: 'TEST123'
    };
    
    const response = await fetch(`${baseUrl}/api/stripe/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });
    
    const data = await response.json();
    return { 
      success: response.ok, 
      status: response.status,
      data 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check environment variables
function checkEnvironmentVariables() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    return { exists: false, variables: {} };
  }
  
  try {
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
    
    return { exists: true, variables: envVars };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// Main test function
async function testServerEndpoints() {
  log('🔍 Testing FleetSync Server Endpoints', 'cyan');
  log('=====================================', 'cyan');
  
  // Check environment variables
  log('\n📋 Step 1: Checking environment configuration...', 'blue');
  const envCheck = checkEnvironmentVariables();
  
  if (!envCheck.exists) {
    log('❌ .env.local file not found', 'red');
    log('   Create .env.local with your Stripe API keys', 'yellow');
  } else {
    log('✅ .env.local file exists', 'green');
    
    const requiredVars = ['STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
    const missingVars = [];
    
    requiredVars.forEach(varName => {
      const value = envCheck.variables[varName];
      if (!value || value.includes('your_') || value.includes('_here')) {
        missingVars.push(varName);
        log(`⚠️  ${varName}: Not configured`, 'yellow');
      } else {
        log(`✅ ${varName}: Configured (${value.substring(0, 20)}...)`, 'green');
      }
    });
    
    if (missingVars.length > 0) {
      log(`\n⚠️  Missing or placeholder values for: ${missingVars.join(', ')}`, 'yellow');
    }
  }
  
  // Test server health
  log('\n🏥 Step 2: Testing server health...', 'blue');
  const healthCheck = await testServerHealth();
  
  if (healthCheck.success) {
    log('✅ Development server is running', 'green');
    log(`   Response: ${JSON.stringify(healthCheck.data)}`, 'cyan');
  } else {
    log('❌ Development server is not running', 'red');
    log(`   Error: ${healthCheck.error}`, 'red');
    log('\n💡 Start your server with: npm run dev', 'yellow');
    return;
  }
  
  // Test Stripe webhook endpoint
  log('\n🔗 Step 3: Testing Stripe webhook endpoint...', 'blue');
  const webhookCheck = await testStripeWebhook();
  
  if (webhookCheck.success) {
    log('✅ Stripe webhook endpoint is accessible', 'green');
    log(`   Response: ${JSON.stringify(webhookCheck.data)}`, 'cyan');
  } else {
    log('❌ Stripe webhook endpoint failed', 'red');
    log(`   Error: ${webhookCheck.error}`, 'red');
  }
  
  // Test payment intent endpoint
  log('\n💳 Step 4: Testing payment intent endpoint...', 'blue');
  const paymentCheck = await testPaymentIntentEndpoint();
  
  if (paymentCheck.success) {
    log('✅ Payment intent endpoint is working', 'green');
    log(`   Created payment intent successfully`, 'cyan');
  } else {
    log(`⚠️  Payment intent endpoint returned ${paymentCheck.status}`, 'yellow');
    if (paymentCheck.data) {
      log(`   Response: ${JSON.stringify(paymentCheck.data)}`, 'cyan');
      
      if (paymentCheck.data.message && paymentCheck.data.message.includes('Invalid API Key')) {
        log('   This is expected if you haven\'t configured your Stripe secret key yet', 'yellow');
      }
    }
  }
  
  // Summary and next steps
  log('\n📊 Test Summary:', 'magenta');
  log('===============', 'magenta');
  
  if (healthCheck.success) {
    log('✅ Server: Running', 'green');
  } else {
    log('❌ Server: Not running', 'red');
  }
  
  if (webhookCheck.success) {
    log('✅ Webhook Endpoint: Accessible', 'green');
  } else {
    log('❌ Webhook Endpoint: Failed', 'red');
  }
  
  if (paymentCheck.success) {
    log('✅ Payment Endpoint: Working', 'green');
  } else if (paymentCheck.status === 400) {
    log('⚠️  Payment Endpoint: Needs API keys', 'yellow');
  } else {
    log('❌ Payment Endpoint: Failed', 'red');
  }
  
  log('\n🎯 Next Steps:', 'blue');
  
  if (!healthCheck.success) {
    log('1. Start your development server: npm run dev', 'cyan');
  } else if (!envCheck.exists || envCheck.variables.STRIPE_SECRET_KEY?.includes('your_')) {
    log('1. Configure your Stripe API keys in .env.local', 'cyan');
    log('2. Use the interactive test page: http://localhost:3000/debug/stripe-test-interactive.html', 'cyan');
  } else {
    log('1. Your server is ready for testing!', 'cyan');
    log('2. Open: http://localhost:3000/debug/stripe-test-interactive.html', 'cyan');
    log('3. Enter your Stripe keys and test payments', 'cyan');
  }
  
  log('\n🔧 Interactive Test Page:', 'blue');
  log('   http://localhost:3000/debug/stripe-test-interactive.html', 'cyan');
  log('   This page allows you to input API keys directly and test payments', 'cyan');
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the test
testServerEndpoints().catch((error) => {
  log(`❌ Test failed: ${error.message}`, 'red');
  process.exit(1);
}); 