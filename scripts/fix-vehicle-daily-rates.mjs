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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default daily rates based on vehicle type and make
const DEFAULT_RATES = {
  // By vehicle type
  'sedan': 85,
  'suv': 120,
  'truck': 150,
  'van': 110,
  'convertible': 140,
  'coupe': 95,
  'hatchback': 75,
  'wagon': 90,
  
  // By make (if specific rates needed)
  'toyota': 85,
  'honda': 80,
  'ford': 90,
  'chevrolet': 85,
  'bmw': 150,
  'mercedes': 160,
  'audi': 145,
  'volkswagen': 95,
  'nissan': 80,
  'hyundai': 75,
  'mazda': 85,
  'subaru': 95,
  'lexus': 140,
  'acura': 125,
};

function getDefaultRate(vehicle) {
  const vehicleType = vehicle.vehicle_type?.toLowerCase();
  const make = vehicle.make?.toLowerCase();
  
  // First try to get rate by vehicle type
  if (vehicleType && DEFAULT_RATES[vehicleType]) {
    return DEFAULT_RATES[vehicleType];
  }
  
  // Then try by make
  if (make && DEFAULT_RATES[make]) {
    return DEFAULT_RATES[make];
  }
  
  // Default fallback rate
  return 89;
}

async function fixVehicleDailyRates() {
  try {
    console.log('🔍 Checking for vehicles with invalid daily rates...');
    
    // Get all vehicles with daily_rate = 0 or NULL
    const { data: vehiclesWithInvalidRates, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, make, model, vehicle_type, daily_rate')
      .or('daily_rate.is.null,daily_rate.eq.0');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!vehiclesWithInvalidRates || vehiclesWithInvalidRates.length === 0) {
      console.log('✅ All vehicles already have valid daily rates!');
      return;
    }
    
    console.log(`📋 Found ${vehiclesWithInvalidRates.length} vehicles with invalid daily rates:`);
    
    const updates = [];
    
    for (const vehicle of vehiclesWithInvalidRates) {
      const newRate = getDefaultRate(vehicle);
      console.log(`  - ${vehicle.make} ${vehicle.model}: $0 → $${newRate}/day`);
      
      updates.push({
        id: vehicle.id,
        daily_rate: newRate
      });
    }
    
    // Batch update all vehicles
    console.log('\n🔧 Updating vehicle daily rates...');
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ daily_rate: update.daily_rate })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`❌ Failed to update vehicle ${update.id}:`, updateError.message);
      }
    }
    
    console.log('✅ Successfully updated all vehicle daily rates!');
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('vehicles')
      .select('id, make, model, daily_rate')
      .or('daily_rate.is.null,daily_rate.eq.0');
    
    if (verifyError) {
      throw verifyError;
    }
    
    if (!verifyData || verifyData.length === 0) {
      console.log('✅ Verification successful: No vehicles with invalid daily rates found');
    } else {
      console.log(`⚠️  Warning: ${verifyData.length} vehicles still have invalid daily rates`);
      verifyData.forEach(vehicle => {
        console.log(`  - ${vehicle.make} ${vehicle.model}: $${vehicle.daily_rate}`);
      });
    }
    
    console.log('\n🎉 Vehicle daily rate fix completed!');
    console.log('\n📌 Next steps:');
    console.log('  1. Test the rental creation again');
    console.log('  2. Vehicles should now show proper daily rates');
    console.log('  3. Rental cost calculations should work correctly');
    
  } catch (error) {
    console.error('❌ Error fixing vehicle daily rates:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixVehicleDailyRates();
}

export { fixVehicleDailyRates }; 