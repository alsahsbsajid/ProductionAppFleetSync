/**
 * Apply Security Fix Migration
 * 
 * This script applies the security fix for the update_updated_at_column function.
 * 
 * Usage: node scripts/apply-security-fix-migration.mjs
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

async function applySecurityFix() {
  try {
    log('🔒 Applying Security Fix for update_updated_at_column function...', 'cyan');
    
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
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_fix_update_function_security.sql');
    
    if (!fs.existsSync(migrationPath)) {
      log('❌ Error: Migration file not found', 'red');
      log(`Expected location: ${migrationPath}`, 'yellow');
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    log('✅ Migration file loaded', 'green');
    
    // Show the SQL for manual execution
    log('🔄 Security fix SQL ready for execution...', 'blue');
    log('📝 Please copy and paste the following SQL into your Supabase SQL Editor:', 'cyan');
    log('\n' + '='.repeat(80), 'blue');
    console.log(migrationSQL);
    log('='.repeat(80), 'blue');
    log('\n📍 Go to: Supabase Dashboard > SQL Editor > New Query', 'cyan');
    log('📍 Paste the SQL above and click "Run"', 'cyan');
    
    // Test if the function exists and check its properties
    log('\n🔍 Checking current function status...', 'blue');
    
    try {
      const { data, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name, security_type')
        .eq('routine_name', 'update_updated_at_column')
        .eq('routine_schema', 'public');
      
      if (error) {
        log(`⚠️  Could not check function status: ${error.message}`, 'yellow');
      } else if (data && data.length > 0) {
        const func = data[0];
        log(`📊 Current function security type: ${func.security_type || 'INVOKER'}`, 'cyan');
        if (func.security_type === 'DEFINER') {
          log('✅ Function already has SECURITY DEFINER', 'green');
        } else {
          log('⚠️  Function needs security update', 'yellow');
        }
      } else {
        log('❌ Function not found', 'red');
      }
    } catch (checkError) {
      log(`⚠️  Function check error: ${checkError.message}`, 'yellow');
    }
    
    log('\n🎉 Security fix migration prepared!', 'green');
    log('After applying the SQL, the function will be secure against search_path attacks.', 'green');
    
  } catch (error) {
    log('❌ Security fix preparation failed:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Main execution
async function main() {
  log('Security Fix Migration', 'magenta');
  log('=====================', 'magenta');
  
  try {
    await applySecurityFix();
  } catch (error) {
    log('\n❌ Security fix failed:', 'red');
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

export { applySecurityFix };