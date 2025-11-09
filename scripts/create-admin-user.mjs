/**
 * FleetSync Admin User Creation Script
 * 
 * This script creates an admin user with elevated privileges for the FleetSync dashboard.
 * The admin user will have access to all features and administrative functions.
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

// Admin user configuration
const ADMIN_USER = {
  email: 'admin@fleetsync.com',
  password: 'FleetSyncAdmin2024!',
  firstName: 'System',
  lastName: 'Administrator',
  companyName: 'FleetSync Admin',
  role: 'admin'
};

async function createAdminUser() {
  try {
    log('🔍 Checking environment variables...', 'blue');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      log('❌ Missing required environment variables:', 'red');
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
    
    // Check if admin user already exists
    log('🔍 Checking if admin user already exists...', 'blue');
    
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      log('⚠️  Warning: Could not check existing users (using anon key)', 'yellow');
      log('Proceeding with admin user creation...', 'yellow');
    } else {
      const existingUser = existingUsers.users.find(user => user.email === ADMIN_USER.email);
      if (existingUser) {
        log('✅ Admin user already exists!', 'green');
        log(`📧 Email: ${ADMIN_USER.email}`, 'cyan');
        log(`🔑 Password: ${ADMIN_USER.password}`, 'cyan');
        log(`👑 Role: Administrator`, 'cyan');
        log('\n🎉 You can now login with admin privileges!', 'green');
        return;
      }
    }
    
    // Create the admin user
    log('👑 Creating admin user account...', 'blue');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: ADMIN_USER.firstName,
        last_name: ADMIN_USER.lastName,
        company_name: ADMIN_USER.companyName,
        role: ADMIN_USER.role
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
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
        options: {
          data: {
            first_name: ADMIN_USER.firstName,
            last_name: ADMIN_USER.lastName,
            company_name: ADMIN_USER.companyName,
            role: ADMIN_USER.role
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
          log('✅ Admin user already exists!', 'green');
        } else {
          throw signupError;
        }
      } else {
        log('✅ Admin user created via signup!', 'green');
      }
    } else {
      log('✅ Admin user created successfully!', 'green');
      
      // Create admin user profile in public.users table
      if (authData.user) {
        log('👤 Creating admin user profile...', 'blue');
        
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: ADMIN_USER.email,
            first_name: ADMIN_USER.firstName,
            last_name: ADMIN_USER.lastName,
            company_name: ADMIN_USER.companyName,
            role: ADMIN_USER.role
          });
        
        if (profileError) {
          log('⚠️  Warning: Could not create admin user profile', 'yellow');
          log(`Error: ${profileError.message}`, 'yellow');
        } else {
          log('✅ Admin user profile created!', 'green');
        }
      }
    }
    
    // Display admin credentials
    log('\n🎯 Admin User Credentials:', 'magenta');
    log('========================', 'magenta');
    log(`📧 Email: ${ADMIN_USER.email}`, 'cyan');
    log(`🔑 Password: ${ADMIN_USER.password}`, 'cyan');
    log(`👤 Name: ${ADMIN_USER.firstName} ${ADMIN_USER.lastName}`, 'cyan');
    log(`🏢 Company: ${ADMIN_USER.companyName}`, 'cyan');
    log(`👑 Role: Administrator`, 'cyan');
    
    log('\n🎉 Admin user setup completed!', 'green');
    log('You can now login to FleetSync with administrative privileges.', 'green');
    
  } catch (error) {
    log('❌ Error creating admin user:', 'red');
    log(error.message, 'red');
    
    if (error.message.includes('Invalid API key')) {
      log('\nTroubleshooting:', 'yellow');
      log('1. Ensure your Supabase project is created and running', 'yellow');
      log('2. Check your .env.local file has correct Supabase credentials', 'yellow');
      log('3. Verify your Supabase service role key has sufficient permissions', 'yellow');
      log('4. Make sure the database schema is set up (run setup-database.js first)', 'yellow');
      process.exit(1);
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
  log('FleetSync Admin User Creation', 'magenta');
  log('==============================', 'magenta');
  
  await createAdminUser();
}

// Run the script
main().catch(console.error);

export { createAdminUser, ADMIN_USER };