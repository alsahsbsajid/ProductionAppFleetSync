#!/usr/bin/env node

/**
 * Script to apply the toll notices database migration
 * Run this after starting Docker and Supabase local development
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 FleetSync Toll Notices Migration Script');
console.log('==========================================');

try {
  console.log('\n📊 Checking Docker status...');
  
  try {
    execSync('docker --version', { stdio: 'ignore' });
    console.log('✅ Docker is installed');
  } catch (error) {
    console.error('❌ Docker is not installed or not accessible');
    console.error('Please install Docker Desktop: https://docs.docker.com/desktop');
    process.exit(1);
  }

  console.log('\n🔄 Checking if Supabase is running...');
  
  try {
    execSync('npx supabase status', { 
      cwd: join(projectRoot, 'supabase'),
      stdio: 'ignore' 
    });
    console.log('✅ Supabase is running');
  } catch (error) {
    console.log('⚠️  Supabase is not running. Starting Supabase...');
    
    try {
      execSync('npx supabase start', { 
        cwd: join(projectRoot, 'supabase'),
        stdio: 'inherit' 
      });
      console.log('✅ Supabase started successfully');
    } catch (startError) {
      console.error('❌ Failed to start Supabase');
      console.error('Please run "cd supabase && npx supabase start" manually');
      process.exit(1);
    }
  }

  console.log('\n🗄️  Applying toll notices migration...');
  
  try {
    execSync('npx supabase db reset', { 
      cwd: join(projectRoot, 'supabase'),
      stdio: 'inherit' 
    });
    console.log('✅ Database migration applied successfully');
  } catch (migrationError) {
    console.error('❌ Failed to apply migration');
    console.error('Please run "cd supabase && npx supabase db reset" manually');
    process.exit(1);
  }

  console.log('\n🎉 Migration completed successfully!');
  console.log('\n📋 What was added:');
  console.log('   • rental_toll_notices table');
  console.log('   • rental_toll_weekly_summary view');
  console.log('   • get_rental_toll_statistics() function');
  console.log('   • Row Level Security policies');
  console.log('   • Performance indexes');
  
  console.log('\n🚀 You can now:');
  console.log('   • View rental details with toll data');
  console.log('   • Search for toll notices by vehicle');
  console.log('   • Track weekly toll summaries');
  console.log('   • Mark toll notices as paid');
  console.log('   • Get toll statistics per rental');

  console.log('\n🔗 Navigate to: http://localhost:3000/rentals');
  console.log('   Click "View Details" on any rental to see toll data');

} catch (error) {
  console.error('\n❌ An unexpected error occurred:');
  console.error(error.message);
  process.exit(1);
} 