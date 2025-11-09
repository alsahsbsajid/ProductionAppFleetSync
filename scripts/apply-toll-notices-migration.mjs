#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Applying toll notices migration...');

try {
  // Check if Docker is running and Supabase is available
  console.log('📋 Checking Supabase connection...');
  
  try {
    execSync('docker compose ps supabase-db', { 
      cwd: projectRoot,
      stdio: 'pipe'
    });
    console.log('✅ Supabase container is running');
  } catch (error) {
    console.log('🚀 Starting Supabase services...');
    execSync('docker compose up -d supabase-db', { 
      cwd: projectRoot,
      stdio: 'inherit'
    });
    
    // Wait a moment for the database to be ready
    console.log('⏳ Waiting for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Read the migration file
  const migrationPath = join(projectRoot, 'supabase', 'migrations', '012_create_toll_notices_table.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');
  
  console.log('📝 Applying migration: 012_create_toll_notices_table.sql');
  
  // Apply the migration using docker compose exec
  const tempFile = '/tmp/migration.sql';
  execSync(`echo "${migrationSQL.replace(/"/g, '\\"')}" > ${tempFile}`, { stdio: 'inherit' });
  
  execSync(`docker compose exec -T supabase-db psql -U postgres -d postgres -f ${tempFile}`, {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  
  console.log('✅ Migration applied successfully!');
  console.log('');
  console.log('📊 Toll notices table created with:');
  console.log('  - User-scoped toll notices');
  console.log('  - Duplicate prevention constraints');
  console.log('  - Performance indexes');
  console.log('  - RLS policies for security');
  console.log('  - Statistics function for reporting');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('  1. Start your Next.js development server');
  console.log('  2. Use the "Check Toll Notices" button to search for toll notices');
  console.log('  3. Real toll data will be saved to the database automatically');
  console.log('  4. Use sorting and filtering features in the toll notices page');

} catch (error) {
  console.error('❌ Error applying migration:', error.message);
  console.error('');
  console.error('🔧 Manual setup instructions:');
  console.error('1. Make sure Docker is running');
  console.error('2. Start Supabase: docker compose up -d');
  console.error('3. Connect to database: docker compose exec supabase-db psql -U postgres -d postgres');
  console.error('4. Run the SQL from: supabase/migrations/012_create_toll_notices_table.sql');
  process.exit(1);
} 