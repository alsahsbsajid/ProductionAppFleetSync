#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Environment Check:');
console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVehicles() {
  try {
    console.log('\n🔍 Checking database connection...');
    
    // Test connection with a simple query
    const { data: connectionTest, error: connectionError } = await supabase
      .from('vehicles')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    console.log(`📊 Total vehicles in database: ${connectionTest || 0}`);
    
    // Get all vehicles with their daily rates
    console.log('\n📋 Fetching all vehicles...');
    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, make, model, vehicle_type, daily_rate, status')
      .order('make', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Error fetching vehicles:', fetchError.message);
      return;
    }
    
    if (!vehicles || vehicles.length === 0) {
      console.log('📝 No vehicles found in database');
      return;
    }
    
    console.log(`\n📋 Found ${vehicles.length} vehicles:`);
    console.log('==========================================');
    
    let invalidRateCount = 0;
    
    vehicles.forEach((vehicle, index) => {
      const rate = vehicle.daily_rate;
      const isInvalidRate = !rate || rate <= 0;
      
      if (isInvalidRate) {
        invalidRateCount++;
      }
      
      console.log(`${index + 1}. ${vehicle.make} ${vehicle.model}`);
      console.log(`   Type: ${vehicle.vehicle_type || 'N/A'}`);
      console.log(`   Daily Rate: $${rate || 0} ${isInvalidRate ? '❌ INVALID' : '✅'}`);
      console.log(`   Status: ${vehicle.status}`);
      console.log(`   ID: ${vehicle.id}`);
      console.log('');
    });
    
    console.log('==========================================');
    console.log(`📊 Summary:`);
    console.log(`   Total vehicles: ${vehicles.length}`);
    console.log(`   Valid rates: ${vehicles.length - invalidRateCount}`);
    console.log(`   Invalid rates: ${invalidRateCount}`);
    
    if (invalidRateCount > 0) {
      console.log('\n⚠️  Vehicles with invalid daily rates need to be fixed!');
      console.log('   Run: node scripts/fix-vehicle-daily-rates.mjs');
    } else {
      console.log('\n✅ All vehicles have valid daily rates!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

checkVehicles(); 