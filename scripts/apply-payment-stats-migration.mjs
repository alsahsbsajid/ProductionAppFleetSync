/**
 * Apply Payment Statistics Migration
 * 
 * This script applies the get_payment_statistics function to the database.
 * 
 * Usage: node scripts/apply-payment-stats-migration.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom function to load environment variables from .env.local
function loadEnvVariables() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.warn('Warning: Could not load .env.local file:', error.message);
  }
}

// Load environment variables
loadEnvVariables();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applyMigration() {
  try {
    log('🚀 Applying Payment Statistics Migration...', 'cyan');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      log('❌ Error: Missing Supabase configuration', 'red');
      log('Please ensure you have the following in your .env.local file:', 'yellow');
      log('- NEXT_PUBLIC_SUPABASE_URL', 'yellow');
      log('- SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)', 'yellow');
      process.exit(1);
    }
    
    log('✅ Environment variables found', 'green');
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '007_add_payment_statistics_function.sql');
    
    if (!fs.existsSync(migrationPath)) {
      log('❌ Error: Migration file not found', 'red');
      log(`Expected location: ${migrationPath}`, 'yellow');
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    log('✅ Migration file loaded', 'green');
    
    // Execute the function creation using rpc
    log('🔄 Creating get_payment_statistics function...', 'blue');
    
    try {
      // Use the SQL directly via rpc
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      });
      
      if (error) {
        // If exec_sql doesn't exist, we'll show the SQL for manual execution
        log('⚠️  Cannot execute SQL directly via client', 'yellow');
        log('📝 Please copy and paste the following SQL into your Supabase SQL Editor:', 'cyan');
        log('\n' + '='.repeat(80), 'blue');
        console.log(migrationSQL);
        log('='.repeat(80), 'blue');
        log('\n📍 Go to: Supabase Dashboard > SQL Editor > New Query', 'cyan');
        log('📍 Paste the SQL above and click "Run"', 'cyan');
      } else {
        log('✅ Function created successfully', 'green');
      }
    } catch (err) {
      log('⚠️  Direct execution failed, showing SQL for manual execution', 'yellow');
      log('📝 Please copy and paste the following SQL into your Supabase SQL Editor:', 'cyan');
      log('\n' + '='.repeat(80), 'blue');
      console.log(migrationSQL);
      log('='.repeat(80), 'blue');
      log('\n📍 Go to: Supabase Dashboard > SQL Editor > New Query', 'cyan');
      log('📍 Paste the SQL above and click "Run"', 'cyan');
    }
    
    // Test the function
    log('\n🔍 Testing the function...', 'blue');
    
    try {
      const { data, error } = await supabase.rpc('get_payment_statistics');
      
      if (error) {
        if (error.message.includes('function get_payment_statistics() does not exist')) {
          log('⚠️  Function not yet created - please run the SQL manually first', 'yellow');
        } else {
          log(`❌ Function test failed: ${error.message}`, 'red');
        }
      } else {
        log('✅ Function is working correctly!', 'green');
        log('📊 Sample output:', 'cyan');
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (testError) {
      log(`⚠️  Function test error: ${testError.message}`, 'yellow');
    }
    
    log('\n🎉 Migration process completed!', 'green');
    log('Your payment statistics function should now be available.', 'green');
    
  } catch (error) {
    log('❌ Migration failed:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Main execution
async function main() {
  log('Payment Statistics Migration', 'magenta');
  log('============================', 'magenta');
  
  try {
    await applyMigration();
  } catch (error) {
    log('\n❌ Migration failed:', 'red');
    log(error.message, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('1. Ensure your Supabase project is running', 'yellow');
    log('2. Check your .env.local file has correct Supabase credentials', 'yellow');
    log('3. Verify your service role key has sufficient permissions', 'yellow');
    log('4. You can manually run the SQL in the Supabase Dashboard', 'yellow');
    process.exit(1);
  }
}

// Run main function
main();

export { applyMigration };