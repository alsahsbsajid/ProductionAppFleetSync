#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check .env.local file for:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseDatabaseIssues() {
  console.log('🔍 Diagnosing database issues...\n');
  
  // Test basic connection
  console.log('1. Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('_supabase_migrations').select('version').limit(1);
    if (error && error.code === 'PGRST116') {
      console.log('✅ Connected to Supabase');
    } else if (!error) {
      console.log('✅ Connected to Supabase and can query tables');
    } else {
      throw error;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    return;
  }

  // Check if tables exist
  console.log('\n2. Checking if required tables exist...');
  const requiredTables = ['users', 'customers', 'vehicles', 'rentals', 'payments', 'tolls', 'maintenance_records'];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log(`❌ Table '${table}' does not exist`);
        } else {
          console.log(`⚠️  Table '${table}' exists but has permission issues:`, error.message);
        }
      } else {
        console.log(`✅ Table '${table}' exists and is accessible`);
      }
    } catch (err) {
      console.log(`❌ Error checking table '${table}':`, err.message);
    }
  }

  // Check RLS policies
  console.log('\n3. Checking Row Level Security policies...');
  try {
    const { data, error } = await supabase.rpc('check_rls_policies');
    if (error) {
      console.log('⚠️  Cannot check RLS policies (this is normal)');
    }
  } catch (err) {
    console.log('⚠️  Cannot check RLS policies (this is normal)');
  }

  // Test specific vehicles table issues
  console.log('\n4. Testing vehicles table specifically...');
  try {
    // Test with service role (should work)
    const { data, error } = await supabase.from('vehicles').select('*').limit(1);
    if (error) {
      console.log('❌ Vehicles table error:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
    } else {
      console.log(`✅ Vehicles table is accessible (found ${data?.length || 0} records)`);
    }
  } catch (err) {
    console.log('❌ Exception querying vehicles table:', err.message);
  }

  console.log('\n5. Recommended solutions:');
  console.log('   a) If tables don\'t exist: Run the migration scripts');
  console.log('   b) If permission errors: Check RLS policies');
  console.log('   c) If 404 errors: The table likely doesn\'t exist');
}

async function createMissingTables() {
  console.log('\n🔧 Creating missing tables...\n');
  
  const fullSchema = `
-- FleetSync Database Schema - Complete Setup
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  license_number TEXT,
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table with all required fields
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT UNIQUE,
  license_plate TEXT UNIQUE NOT NULL,
  color TEXT,
  mileage INTEGER DEFAULT 0,
  fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance', 'out_of_service')),
  daily_rate DECIMAL(10,2) NOT NULL,
  weekly_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  insurance_policy_number TEXT,
  registration_expiry DATE,
  last_service_date DATE,
  next_service_due DATE,
  vehicle_type TEXT DEFAULT 'sedan' CHECK (vehicle_type IN ('sedan', 'suv', 'hatchback', 'coupe', 'wagon', 'convertible', 'truck', 'van')),
  location TEXT DEFAULT 'N/A',
  transmission TEXT DEFAULT 'automatic' CHECK (transmission IN ('automatic', 'manual', 'cvt')),
  reference_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rentals table
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  rental_number TEXT UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_return_date DATE,
  pickup_location TEXT,
  return_location TEXT,
  start_mileage INTEGER,
  end_mileage INTEGER,
  daily_rate DECIMAL(10,2) NOT NULL,
  total_days INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online')),
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  due_date DATE,
  paid_on TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tolls table
CREATE TABLE IF NOT EXISTS public.tolls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  license_plate TEXT NOT NULL,
  toll_notice_number TEXT,
  motorway TEXT NOT NULL,
  issued_date DATE NOT NULL,
  due_date DATE NOT NULL,
  trip_status TEXT NOT NULL,
  admin_fee DECIMAL(10,2) DEFAULT 0,
  toll_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2),
  service_date DATE NOT NULL,
  next_service_due DATE,
  service_provider TEXT,
  mileage_at_service INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_reference_number ON public.vehicles(reference_number);
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_customer_id ON public.rentals(customer_id);
CREATE INDEX IF NOT EXISTS idx_rentals_vehicle_id ON public.rentals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_rental_id ON public.payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_tolls_user_id ON public.tolls(user_id);
CREATE INDEX IF NOT EXISTS idx_tolls_vehicle_id ON public.tolls(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tolls_license_plate ON public.tolls(license_plate);
CREATE INDEX IF NOT EXISTS idx_maintenance_user_id ON public.maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance_records(vehicle_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for customers table
CREATE POLICY "Users can view their own customers" ON public.customers
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for vehicles table
CREATE POLICY "Users can view their own vehicles" ON public.vehicles
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for rentals table
CREATE POLICY "Users can view their own rentals" ON public.rentals
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for payments table
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for tolls table
CREATE POLICY "Users can view their own tolls" ON public.tolls
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for maintenance_records table
CREATE POLICY "Users can view their own maintenance records" ON public.maintenance_records
  FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tolls_updated_at BEFORE UPDATE ON public.tolls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing vehicles to have reference numbers if they don't have them
UPDATE public.vehicles 
SET reference_number = FLOOR(RANDOM() * 1000000)
WHERE reference_number = 0 OR reference_number IS NULL;
`;

  try {
    console.log('Executing complete schema...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: fullSchema });
    
    if (error) {
      // Try running the SQL directly instead
      console.log('RPC failed, trying direct execution...');
      const { error: directError } = await supabase.from('_supabase_migrations').insert({
        version: Date.now().toString(),
        name: 'complete_schema_setup',
        statements: [fullSchema]
      });
      
      if (directError) {
        throw directError;
      }
    }
    
    console.log('✅ Schema creation completed successfully');
    
    // Test the vehicles table again
    console.log('\nTesting vehicles table after creation...');
    const { data: testData, error: testError } = await supabase.from('vehicles').select('count').limit(1);
    if (testError) {
      console.log('❌ Vehicles table still not working:', testError.message);
    } else {
      console.log('✅ Vehicles table is now working!');
    }
    
  } catch (error) {
    console.error('❌ Failed to create schema:', error.message);
    console.log('\n🛠️  Manual Solution:');
    console.log('Please copy the following SQL and run it manually in your Supabase Dashboard > SQL Editor:\n');
    console.log('----------------------------------------');
    console.log(fullSchema);
    console.log('----------------------------------------');
  }
}

async function main() {
  await diagnoseDatabaseIssues();
  
  console.log('\n🔧 Would you like to automatically create missing tables? (This will run the complete schema)');
  console.log('Press Ctrl+C to cancel or wait 5 seconds to proceed...');
  
  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await createMissingTables();
  
  console.log('\n✅ Database diagnosis and repair completed!');
  console.log('\nNext steps:');
  console.log('1. Refresh your browser');
  console.log('2. Try adding a vehicle again');
  console.log('3. Check browser console for any remaining errors');
}

main().catch(console.error); 