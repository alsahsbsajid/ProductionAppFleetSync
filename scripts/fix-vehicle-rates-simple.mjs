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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Environment Check:');
console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Instructions for manual update
console.log('📋 VEHICLE DAILY RATE FIX INSTRUCTIONS');
console.log('=====================================');
console.log('');
console.log('Since the service role key is not configured, here are the daily rates');
console.log('that should be set for each vehicle type in your fleet management UI:');
console.log('');
console.log('🚗 RECOMMENDED DAILY RATES:');
console.log('');
Object.entries(DEFAULT_RATES).forEach(([type, rate]) => {
  console.log(`   ${type.toUpperCase().padEnd(15)} = $${rate}/day`);
});
console.log('');
console.log('📌 TO FIX THE ISSUE:');
console.log('');
console.log('1. 🔑 Go to your Fleet Management page');
console.log('2. ✏️  Click "Edit" on each vehicle that shows $0/day');
console.log('3. 💰 Set the "Daily Rate ($)" field to the appropriate amount');
console.log('4. 💾 Save the changes');
console.log('5. 🔄 Refresh and try creating a rental again');
console.log('');
console.log('🎯 QUICK FIX FOR TOYOTA CAMRY:');
console.log('   - Find your Toyota Camry in the fleet list');
console.log('   - Click the edit button (pencil icon)');
console.log('   - Set Daily Rate to: $85.00');
console.log('   - Save changes');
console.log('');
console.log('✅ After fixing the daily rates, the rental creation should work!');
console.log('');

export { getDefaultRate, DEFAULT_RATES }; 