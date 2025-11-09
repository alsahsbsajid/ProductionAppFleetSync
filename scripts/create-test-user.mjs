#!/usr/bin/env node

/**
 * FleetSync Test User Creation Script
 * 
 * This script creates a test user account for development purposes.
 * Run this after setting up your Supabase database.
 * 
 * Usage: node scripts/create-test-user.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Simple .env.local parser
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          envVars[key] = value;
          process.env[key] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('Could not load .env.local file:', error.message);
    return {};
  }
}

// Load environment variables
loadEnvFile();

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

// Test user credentials
const TEST_USER = {
  email: 'dev@fleetsync.com',
  password: 'FleetSync2024!',
  firstName: 'Developer',
  lastName: 'User',
  companyName: 'FleetSync Development'
};

async function createTestUser() {
  try {
    log('🚀 Creating FleetSync Test User...', 'cyan');
    
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
    
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Check if user already exists
    log('🔍 Checking if test user already exists...', 'blue');
    
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      log('⚠️  Warning: Could not check existing users (using anon key)', 'yellow');
      log('Proceeding with user creation...', 'yellow');
    } else {
      const existingUser = existingUsers.users.find(user => user.email === TEST_USER.email);
      if (existingUser) {
        log('✅ Test user already exists!', 'green');
        log(`📧 Email: ${TEST_USER.email}`, 'cyan');
        log(`🔑 Password: ${TEST_USER.password}`, 'cyan');
        log('\n🎉 You can now login with these credentials!', 'green');
        return;
      }
    }
    
    // Create the user
    log('👤 Creating test user account...', 'blue');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: TEST_USER.firstName,
        last_name: TEST_USER.lastName,
        company_name: TEST_USER.companyName
      }
    });
    
    // If admin creation succeeds, also confirm the email explicitly
    if (!authError && authData.user) {
      await supabase.auth.admin.updateUserById(authData.user.id, {
        email_confirm: true
      });
    }
    
    if (authError) {
      // Fallback to regular signup if admin creation fails
      log('⚠️  Admin user creation failed, trying regular signup...', 'yellow');
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: TEST_USER.email,
        password: TEST_USER.password,
        options: {
          data: {
            first_name: TEST_USER.firstName,
            last_name: TEST_USER.lastName,
            company_name: TEST_USER.companyName
          }
        }
      });
      
      // Try to confirm email if user was created via signup
      if (!signupError && signupData.user && !signupData.user.email_confirmed_at) {
        try {
          await supabase.auth.admin.updateUserById(signupData.user.id, {
            email_confirm: true
          });
          log('✅ Email automatically confirmed!', 'green');
        } catch (confirmError) {
          log('⚠️  Could not auto-confirm email (using anon key)', 'yellow');
        }
      }
      
      if (signupError) {
        if (signupError.message.includes('already registered')) {
          log('✅ Test user already exists!', 'green');
        } else {
          throw signupError;
        }
      } else {
        log('✅ Test user created via signup!', 'green');
      }
    } else {
      log('✅ Test user created successfully!', 'green');
      
      // Create user profile in public.users table
      if (authData.user) {
        log('👤 Creating user profile...', 'blue');
        
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: TEST_USER.email,
            first_name: TEST_USER.firstName,
            last_name: TEST_USER.lastName,
            company_name: TEST_USER.companyName
          });
        
        if (profileError) {
          log('⚠️  Warning: Could not create user profile', 'yellow');
          log(`Error: ${profileError.message}`, 'yellow');
        } else {
          log('✅ User profile created!', 'green');
        }
      }
    }
    
    // Display credentials
    log('\n🎯 Test User Credentials:', 'magenta');
    log('========================', 'magenta');
    log(`📧 Email: ${TEST_USER.email}`, 'cyan');
    log(`🔑 Password: ${TEST_USER.password}`, 'cyan');
    log(`👤 Name: ${TEST_USER.firstName} ${TEST_USER.lastName}`, 'cyan');
    log(`🏢 Company: ${TEST_USER.companyName}`, 'cyan');
    
    log('\n🎉 Test user setup completed!', 'green');
    log('You can now login to FleetSync with these credentials.', 'green');
    
  } catch (error) {
    log('❌ Test user creation failed:', 'red');
    log(error.message, 'red');
    
    if (error.message.includes('already registered')) {
      log('\n✅ User already exists! You can use these credentials:', 'green');
      log(`📧 Email: ${TEST_USER.email}`, 'cyan');
      log(`🔑 Password: ${TEST_USER.password}`, 'cyan');
    } else {
      log('\nTroubleshooting:', 'yellow');
      log('1. Ensure your Supabase project is created and running', 'yellow');
      log('2. Check your .env.local file has correct Supabase credentials', 'yellow');
      log('3. Verify your Supabase service role key has sufficient permissions', 'yellow');
      log('4. Make sure the database schema is set up (run setup-database.js first)', 'yellow');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  log('FleetSync Test User Creation', 'magenta');
  log('============================', 'magenta');
  
  await createTestUser();
}

// Run the script
main().catch(console.error);

export { createTestUser, TEST_USER };