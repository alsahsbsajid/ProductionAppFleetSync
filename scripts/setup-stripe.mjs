#!/usr/bin/env node

/**
 * Stripe Setup and Verification Script
 * 
 * This script helps you set up and verify your Stripe integration.
 * Run this after configuring your Stripe API keys.
 * 
 * Usage: node scripts/setup-stripe.mjs
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

// Load environment variables from .env.local
function loadEnvVariables() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    
    if (!fs.existsSync(envPath)) {
      return null;
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
    return null;
  }
}

// Create .env.local template
function createEnvTemplate() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const template = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Other Configuration
DATABASE_URL=your_database_url_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
`;

  try {
    fs.writeFileSync(envPath, template);
    log('✅ Created .env.local template file', 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to create .env.local: ${error.message}`, 'red');
    return false;
  }
}

// Validate Stripe API keys format
function validateStripeKeys(publishableKey, secretKey) {
  const errors = [];
  
  if (!publishableKey) {
    errors.push('Publishable key is missing');
  } else if (!publishableKey.startsWith('pk_')) {
    errors.push('Publishable key should start with "pk_"');
  }
  
  if (!secretKey) {
    errors.push('Secret key is missing');
  } else if (!secretKey.startsWith('sk_')) {
    errors.push('Secret key should start with "sk_"');
  }
  
  // Check if keys match environment (test vs live)
  if (publishableKey && secretKey) {
    const pubIsTest = publishableKey.startsWith('pk_test_');
    const secIsTest = secretKey.startsWith('sk_test_');
    
    if (pubIsTest !== secIsTest) {
      errors.push('Publishable and secret keys must be from the same environment (both test or both live)');
    }
  }
  
  return errors;
}

// Test Stripe API connection
async function testStripeConnection(secretKey) {
  try {
    // Dynamic import of Stripe
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);
    
    // Test API connection by retrieving account info
    const account = await stripe.accounts.retrieve();
    
    return {
      success: true,
      data: {
        id: account.id,
        country: account.country,
        currency: account.default_currency,
        email: account.email,
        displayName: account.display_name || account.business_profile?.name || 'N/A'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test webhook endpoint
async function testWebhookEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/stripe');
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        data
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main setup function
async function setupStripe() {
  log('🚀 Stripe Setup and Verification', 'cyan');
  log('================================', 'cyan');
  
  // Check if .env.local exists
  let envVars = loadEnvVariables();
  
  if (!envVars) {
    log('📝 .env.local file not found. Creating template...', 'yellow');
    if (createEnvTemplate()) {
      log('\n📋 Next steps:', 'blue');
      log('1. Open .env.local file', 'blue');
      log('2. Replace placeholder values with your actual Stripe keys', 'blue');
      log('3. Run this script again to verify the setup', 'blue');
      log('\n💡 Get your Stripe keys from: https://dashboard.stripe.com/apikeys', 'cyan');
      return;
    } else {
      process.exit(1);
    }
  }
  
  // Check Stripe configuration
  log('🔍 Checking Stripe configuration...', 'blue');
  
  const publishableKey = envVars.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;
  const secretKey = envVars.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = envVars.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  
  // Validate key formats
  const keyErrors = validateStripeKeys(publishableKey, secretKey);
  
  if (keyErrors.length > 0) {
    log('❌ Stripe key validation failed:', 'red');
    keyErrors.forEach(error => log(`   • ${error}`, 'red'));
    log('\n💡 Get your Stripe keys from: https://dashboard.stripe.com/apikeys', 'cyan');
    return;
  }
  
  log('✅ Stripe keys format is valid', 'green');
  
  // Determine environment
  const isTestMode = publishableKey.startsWith('pk_test_');
  log(`🔧 Environment: ${isTestMode ? 'Test Mode' : 'Live Mode'}`, isTestMode ? 'yellow' : 'green');
  
  // Test Stripe API connection
  log('\n🔌 Testing Stripe API connection...', 'blue');
  const connectionTest = await testStripeConnection(secretKey);
  
  if (connectionTest.success) {
    log('✅ Successfully connected to Stripe!', 'green');
    log(`   Account ID: ${connectionTest.data.id}`, 'cyan');
    log(`   Display Name: ${connectionTest.data.displayName}`, 'cyan');
    log(`   Country: ${connectionTest.data.country}`, 'cyan');
    log(`   Default Currency: ${connectionTest.data.currency?.toUpperCase() || 'N/A'}`, 'cyan');
  } else {
    log('❌ Failed to connect to Stripe API:', 'red');
    log(`   Error: ${connectionTest.error}`, 'red');
    log('\n💡 Check your secret key and internet connection', 'yellow');
    return;
  }
  
  // Check webhook secret
  log('\n🔗 Checking webhook configuration...', 'blue');
  if (webhookSecret && webhookSecret.startsWith('whsec_')) {
    log('✅ Webhook secret is configured', 'green');
  } else {
    log('⚠️  Webhook secret is missing or invalid', 'yellow');
    log('   This is needed for processing payments automatically', 'yellow');
    log('   Get it from: https://dashboard.stripe.com/webhooks', 'cyan');
  }
  
  // Test webhook endpoint (if server is running)
  log('\n🌐 Testing webhook endpoint...', 'blue');
  const webhookTest = await testWebhookEndpoint();
  
  if (webhookTest.success) {
    log('✅ Webhook endpoint is accessible', 'green');
    log(`   Response: ${JSON.stringify(webhookTest.data, null, 2)}`, 'cyan');
  } else {
    log('⚠️  Webhook endpoint test failed:', 'yellow');
    log(`   Error: ${webhookTest.error}`, 'yellow');
    log('   This is normal if the development server is not running', 'yellow');
  }
  
  // Summary
  log('\n📊 Setup Summary:', 'magenta');
  log('================', 'magenta');
  log(`✅ Stripe API Keys: Configured (${isTestMode ? 'Test' : 'Live'} Mode)`, 'green');
  log(`✅ API Connection: Working`, 'green');
  log(`${webhookSecret ? '✅' : '⚠️ '} Webhook Secret: ${webhookSecret ? 'Configured' : 'Missing'}`, webhookSecret ? 'green' : 'yellow');
  log(`${webhookTest.success ? '✅' : '⚠️ '} Webhook Endpoint: ${webhookTest.success ? 'Accessible' : 'Not tested'}`, webhookTest.success ? 'green' : 'yellow');
  
  if (isTestMode) {
    log('\n🧪 Test Mode Instructions:', 'blue');
    log('=========================', 'blue');
    log('Use these test card numbers:', 'cyan');
    log('• 4242424242424242 (Visa - Success)', 'cyan');
    log('• 4000000000000002 (Visa - Declined)', 'cyan');
    log('• 5555555555554444 (Mastercard - Success)', 'cyan');
    log('• Any future expiry date (e.g., 12/25)', 'cyan');
    log('• Any 3-digit CVC (e.g., 123)', 'cyan');
  }
  
  log('\n🎉 Stripe setup verification complete!', 'green');
  
  if (!webhookSecret) {
    log('\n📝 Next Steps:', 'yellow');
    log('1. Set up webhooks in Stripe Dashboard', 'yellow');
    log('2. Add webhook secret to .env.local', 'yellow');
    log('3. Test payment processing', 'yellow');
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the setup
setupStripe().catch((error) => {
  log(`❌ Setup failed: ${error.message}`, 'red');
  process.exit(1);
}); 