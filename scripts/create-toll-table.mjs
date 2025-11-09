/**
 * Script to create the toll_notices table in Supabase
 * This script applies the migration by executing the SQL directly
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
function loadEnvVariables() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
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
      console.log('✅ Loaded environment variables');
    }
  } catch (error) {
    console.log('⚠️  Warning: Could not load .env.local file:', error.message);
  }
}

async function createTollTable() {
  try {
    console.log('🚀 Creating toll_notices table...');
    
    // Load environment variables
    loadEnvVariables();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '012_create_toll_notices_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} failed:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} completed`);
          }
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    // Test if the table was created
    console.log('🔍 Testing table creation...');
    const { data, error } = await supabase
      .from('toll_notices')
      .select('count()')
      .limit(1);
    
    if (error) {
      console.log('❌ Table creation may have failed:', error.message);
      console.log('\n📋 Manual setup required:');
      console.log('1. Go to your Supabase Dashboard SQL Editor');
      console.log('2. Copy and paste the SQL from: supabase/migrations/012_create_toll_notices_table.sql');
      console.log('3. Execute the SQL manually');
    } else {
      console.log('✅ toll_notices table created successfully!');
      console.log('🎉 Toll data can now be saved to Supabase!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Manual setup required:');
    console.log('1. Go to your Supabase Dashboard SQL Editor');
    console.log('2. Copy and paste the SQL from: supabase/migrations/012_create_toll_notices_table.sql');
    console.log('3. Execute the SQL manually');
  }
}

// Run the script
createTollTable();