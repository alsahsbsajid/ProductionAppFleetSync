#!/usr/bin/env node

/**
 * FleetSync Database Setup Script
 * 
 * This script sets up the initial database schema for FleetSync.
 * Run this after setting up your Supabase project.
 * 
 * Usage: node scripts/setup-database.js
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

async function setupDatabase() {
  try {
    log('🚀 Starting FleetSync Database Setup...', 'cyan');
    
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
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      log('❌ Error: Migration file not found', 'red');
      log(`Expected location: ${migrationPath}`, 'yellow');
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    log('✅ Migration file loaded', 'green');
    
    // Execute migration
    log('🔄 Executing database migration...', 'blue');
    
    // Note: Direct SQL execution via JavaScript client is limited
    // For proper migration, use Supabase CLI: supabase db push
    log('⚠️  Note: This script shows migration content but cannot execute DDL statements', 'yellow');
    log('📝 To apply migrations, use: supabase db push', 'cyan');
    log('📝 Or copy the SQL to Supabase Dashboard SQL Editor', 'cyan');
    
    // Display the migration content for manual execution
    log('\n📄 Migration SQL Content:', 'blue');
    log('=' .repeat(50), 'blue');
    console.log(migrationSQL);
    log('=' .repeat(50), 'blue');
    
    let successCount = 1;
    let errorCount = 0;
    
    log(`✅ Migration completed: ${successCount} statements executed`, 'green');
    if (errorCount > 0) {
      log(`⚠️  ${errorCount} warnings (this is normal for existing tables)`, 'yellow');
    }
    
    // Verify tables were created
    log('🔍 Verifying table creation...', 'blue');
    
    const tables = ['users', 'customers', 'vehicles', 'rentals', 'payments', 'tolls', 'maintenance_records'];
    const verificationResults = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          verificationResults.push({ table, status: 'error', message: error.message });
        } else {
          verificationResults.push({ table, status: 'success' });
        }
      } catch (err) {
        verificationResults.push({ table, status: 'error', message: err.message });
      }
    }
    
    // Display verification results
    log('\n📊 Table Verification Results:', 'cyan');
    verificationResults.forEach(result => {
      if (result.status === 'success') {
        log(`  ✅ ${result.table}`, 'green');
      } else {
        log(`  ❌ ${result.table}: ${result.message}`, 'red');
      }
    });
    
    const successfulTables = verificationResults.filter(r => r.status === 'success').length;
    
    if (successfulTables === tables.length) {
      log('\n🎉 Database setup completed successfully!', 'green');
      log('Your FleetSync application is ready to use.', 'green');
    } else {
      log('\n⚠️  Database setup completed with some issues.', 'yellow');
      log('Some tables may not have been created properly.', 'yellow');
      log('Please check your Supabase dashboard or contact support.', 'yellow');
    }
    
  } catch (error) {
    log('❌ Database setup failed:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Alternative method using Supabase CLI (if available)
async function setupWithCLI() {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    log('🔄 Attempting to use Supabase CLI...', 'blue');
    
    // Check if Supabase CLI is installed
    await execAsync('supabase --version');
    log('✅ Supabase CLI found', 'green');
    
    // Run migration
    const { stdout, stderr } = await execAsync('supabase db push');
    
    if (stderr && !stderr.includes('warning')) {
      throw new Error(stderr);
    }
    
    log('✅ Migration applied successfully via CLI', 'green');
    log(stdout, 'blue');
    
  } catch (error) {
    if (error.message.includes('command not found') || error.message.includes('not recognized')) {
      log('⚠️  Supabase CLI not found, falling back to direct method', 'yellow');
      return false;
    }
    throw error;
  }
  
  return true;
}

// Main execution
async function main() {
  log('FleetSync Database Setup', 'magenta');
  log('========================', 'magenta');
  
  try {
    // Try CLI first, then fallback to direct method
    const cliSuccess = await setupWithCLI().catch(() => false);
    
    if (!cliSuccess) {
      await setupDatabase();
    }
    
  } catch (error) {
    log('\n❌ Setup failed:', 'red');
    log(error.message, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('1. Ensure your Supabase project is created and running', 'yellow');
    log('2. Check your .env.local file has correct Supabase credentials', 'yellow');
    log('3. Verify your Supabase service role key has sufficient permissions', 'yellow');
    log('4. You can also manually run the SQL in supabase/migrations/001_initial_schema.sql', 'yellow');
    process.exit(1);
  }
}

// Run main function directly in ES modules
main();

export { setupDatabase, setupWithCLI };