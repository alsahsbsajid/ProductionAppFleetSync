import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRentals() {
  console.log('🔍 Checking rentals in database...\n');

  try {
    // First, check if the table exists and get basic info
    const { data: rentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('*');

    if (rentalsError) {
      console.error('❌ Error fetching rentals:', rentalsError.message);
      return;
    }

    console.log(`📊 Total rentals in database: ${rentals?.length || 0}`);

    if (rentals && rentals.length > 0) {
      console.log('\n📋 Rental details:');
      rentals.forEach((rental, index) => {
        console.log(`\n${index + 1}. Rental ID: ${rental.id}`);
        console.log(`   Vehicle ID: ${rental.vehicle_id}`);
        console.log(`   Customer ID: ${rental.customer_id}`);
        console.log(`   Status: ${rental.status}`);
        console.log(`   Start Date: ${rental.start_date}`);
        console.log(`   End Date: ${rental.end_date}`);
        console.log(`   Total Amount: $${rental.total_amount}`);
        console.log(`   User ID: ${rental.user_id}`);
        console.log(`   Created: ${rental.created_at}`);
      });

      // Check if there are associated vehicles and customers
      console.log('\n🔗 Checking associated data...');
      
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, make, model, license_plate, user_id');

      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, user_id');

      if (vehicleError) {
        console.error('❌ Error fetching vehicles:', vehicleError.message);
      } else {
        console.log(`🚗 Total vehicles: ${vehicles?.length || 0}`);
        if (vehicles && vehicles.length > 0) {
          vehicles.forEach(vehicle => {
            console.log(`   - ${vehicle.make} ${vehicle.model} (${vehicle.license_plate}) [User: ${vehicle.user_id}]`);
          });
        }
      }

      if (customerError) {
        console.error('❌ Error fetching customers:', customerError.message);
      } else {
        console.log(`👥 Total customers: ${customers?.length || 0}`);
        if (customers && customers.length > 0) {
          customers.forEach(customer => {
            console.log(`   - ${customer.first_name} ${customer.last_name} (${customer.email}) [User: ${customer.user_id}]`);
          });
        }
      }

      // Check for potential user_id mismatches
      console.log('\n🔍 Checking user_id associations...');
      const uniqueUserIds = [...new Set([
        ...rentals.map(r => r.user_id),
        ...(vehicles || []).map(v => v.user_id),
        ...(customers || []).map(c => c.user_id)
      ])];
      
      console.log(`📋 Unique user IDs found: ${uniqueUserIds.length}`);
      uniqueUserIds.forEach(userId => {
        const userRentals = rentals.filter(r => r.user_id === userId).length;
        const userVehicles = (vehicles || []).filter(v => v.user_id === userId).length;
        const userCustomers = (customers || []).filter(c => c.user_id === userId).length;
        console.log(`   User ${userId}: ${userRentals} rentals, ${userVehicles} vehicles, ${userCustomers} customers`);
      });
    } else {
      console.log('\n📭 No rentals found in the database.');
      console.log('💡 This could mean:');
      console.log('   - No rentals have been created yet');
      console.log('   - Rentals belong to a different user_id');
      console.log('   - There was an issue with rental creation');
    }

    // Test the rental service query that the frontend uses
    console.log('\n🧪 Testing frontend-style query...');
    
    // Simulate getting the first user's ID
    const firstUserId = rentals && rentals.length > 0 ? rentals[0].user_id : 'test-user-id';
    
    const { data: frontendQuery, error: frontendError } = await supabase
      .from('rentals')
      .select(`
        id,
        vehicle_id,
        customer_id,
        start_date,
        end_date,
        status,
        total_amount,
        notes,
        created_at,
        vehicles!rentals_vehicle_id_fkey(
          id,
          make,
          model,
          year,
          license_plate,
          color,
          status
        ),
        customers!rentals_customer_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('user_id', firstUserId);

    if (frontendError) {
      console.error('❌ Frontend query error:', frontendError.message);
      console.log('💡 This could indicate a foreign key constraint issue');
    } else {
      console.log(`✅ Frontend query successful: ${frontendQuery?.length || 0} rentals returned`);
      if (frontendQuery && frontendQuery.length > 0) {
        console.log('   Sample rental with joined data:');
        const sample = frontendQuery[0];
        console.log(`   - Rental: ${sample.id}`);
        console.log(`   - Vehicle: ${sample.vehicles ? `${sample.vehicles.make} ${sample.vehicles.model}` : 'Not found'}`);
        console.log(`   - Customer: ${sample.customers ? `${sample.customers.first_name} ${sample.customers.last_name}` : 'Not found'}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRentals().then(() => {
  console.log('\n✅ Rental check completed.');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 