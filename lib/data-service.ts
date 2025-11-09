import {
  Vehicle,
  Customer,
  Rental,
  RentalPayment,
  PaymentUpdate,
  ApiResponse,
  DashboardStats,
  PaymentStatistics,
  StripePaymentIntent,
} from './types';
import {
  API_ENDPOINTS,
  PAYMENT_STATUSES,
  VEHICLE_STATUSES,
  RENTAL_STATUSES,
} from './constants';
import { dateUtils, stringUtils } from './helpers';
import { notificationService } from './notification-service';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to map DB customer record to frontend Customer type
function mapDbCustomerToCustomer(dbCustomer: any): Customer {
  if (!dbCustomer) return null as any;
  return {
    id: dbCustomer.id,
    name: `${dbCustomer.first_name || ''} ${dbCustomer.last_name || ''}`.trim(),
    email: dbCustomer.email,
    phone: dbCustomer.phone,
    location: dbCustomer.address,
    type: dbCustomer.type,
    licenseNumber: dbCustomer.license_number,
    company: dbCustomer.company,
    status: dbCustomer.status,
    joinDate: dbCustomer.created_at,
    image: dbCustomer.image,
    rentals: Array.isArray(dbCustomer.rentals)
      ? dbCustomer.rentals.length
      : 0,
  };
}

async function getAuthedUserId(supabase: SupabaseClient): Promise<string | null> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError.message);
      return null;
    }

    if (!session) {
      console.error('No active session found');
      // Use setTimeout to avoid blocking the current promise chain
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
      return null;
    }

    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      console.error('Session expired');
      // Use setTimeout to avoid blocking the current promise chain
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
      return null;
    }

    return session.user.id;
  } catch (error) {
    console.error('Error getting authenticated user ID:', error);
    return null;
  }
}

// Mock data storage
const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    registration: 'NSW-123',
    status: 'available',
    fuelLevel: 95,
    lastService: '2023-12-15',
    nextService: '2024-06-15',
    location: 'Sydney CBD',
    type: 'Sedan',
    color: 'Silver',
    image: '/placeholder.svg?height=80&width=120',
    vin: '1HGCM82633A123456',
    odometer: 15420,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    dailyRate: 89,
    purchaseDate: '2022-03-15',
    insuranceExpiry: '2024-03-15',
    registrationExpiry: '2024-03-15',
    referenceNumber: 12,
  },
  {
    id: 'v2',
    make: 'Honda',
    model: 'Civic',
    year: 2021,
    registration: 'NSW-456',
    status: 'rented',
    fuelLevel: 75,
    lastService: '2023-11-10',
    nextService: '2024-05-10',
    location: 'Parramatta',
    type: 'Sedan',
    color: 'Blue',
    image: '/placeholder.svg?height=80&width=120',
    vin: '2HGFC2F54MH123789',
    odometer: 28750,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    dailyRate: 79,
    purchaseDate: '2021-06-22',
    insuranceExpiry: '2024-06-22',
    registrationExpiry: '2024-06-22',
    referenceNumber: 25,
  },
];

const mockCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+61 2 1234 5678',
    status: 'active',
    joinDate: '2023-01-15',
    rentals: 8,
    location: 'Sydney CBD',
    type: 'Business',
    image: '/placeholder-user.jpg',
  },
  {
    id: 'c2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+61 2 8765 4321',
    status: 'inactive',
    joinDate: '2023-03-20',
    rentals: 3,
    location: 'Parramatta',
    type: 'Personal',
    image: '/placeholder-user.jpg',
  },
];

const mockRentals: Rental[] = [
  {
    id: 'r1',
    vehicleId: 'v1',
    customerId: 'c2',
    startDate: '2023-12-01',
    endDate: '2023-12-10',
    status: 'completed',
    totalAmount: 890,
  },
  {
    id: 'r2',
    vehicleId: 'v2',
    customerId: 'c1',
    startDate: '2024-01-05',
    endDate: '2024-01-15',
    status: 'active',
    totalAmount: 790,
  },
  {
    id: 'r3',
    vehicleId: 'v3',
    customerId: 'c1',
    startDate: '2023-11-20',
    endDate: '2023-11-25',
    status: 'completed',
    totalAmount: 550,
  },
];

const mockPayments: RentalPayment[] = [
  {
    id: 'p1',
    vehicleId: 'v2',
    vehicleRegistration: 'NSW-456',
    customer: 'Jane Doe',
    revenue: 450.0,
    paymentStatus: 'paid',
    paymentDueDate: '2023-12-15',
    paymentMethod: 'credit_card',
    weeklyPaymentCheck: 'current',
    vehicleReferenceNumber: 25,
  },
  {
    id: 'p2',
    vehicleId: 'v1',
    vehicleRegistration: 'NSW-123',
    customer: 'John Smith',
    company: 'Smith & Co',
    revenue: 500,
    paymentStatus: 'paid',
    paymentDueDate: '2023-12-01',
    paymentMethod: 'Credit Card',
    paidDate: '2023-11-30',
    weeklyPaymentCheck: 'current',
    vehicleReferenceNumber: 12,
    stripeReferenceNumber: 'STR-R1-NSW123-445',
  },
];

// Base API service class
class BaseApiService {
  protected baseUrl: string;
  protected defaultHeaders: Record<string, string>;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      return {
        success: true,
        data,
        message: data.message || 'Success',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }

  protected async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  protected async post<T>(
    endpoint: string,
    data: any
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  protected async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Vehicle service
export class VehicleService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getAllVehicles(): Promise<ApiResponse<Vehicle[]>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      
      // Fetch all vehicles with their rental information (using left join)
      const { data, error } = await this.supabase
        .from('vehicles')
        .select(`
          *,
          rentals(
            id,
            status,
            start_date,
            end_date
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase error fetching vehicles:', error);
        if (error.message.includes('JWT')) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Authentication error. Please log in again.');
        }
        throw error;
      }

      // Process all vehicles
      const allVehicleData = data || [];
      
      // Transform database format to frontend format and sync status
      const vehicles: Vehicle[] = allVehicleData.map((dbVehicle: any) => {
        let actualStatus = dbVehicle.status;
        
        // Check if vehicle has active rentals and update status accordingly
        if (dbVehicle.rentals && Array.isArray(dbVehicle.rentals)) {
          const activeRental = dbVehicle.rentals.find((rental: any) => 
            rental.status === 'active' || rental.status === 'upcoming'
          );
          
          if (activeRental) {
            actualStatus = 'rented';
          } else if (dbVehicle.status === 'rented') {
            // If no active rental but status is rented, set to available
            actualStatus = 'available';
          }
        } else if (dbVehicle.status === 'rented') {
          // No rentals found but status is rented, set to available
          actualStatus = 'available';
        }

        return {
          id: dbVehicle.id,
          make: dbVehicle.make,
          model: dbVehicle.model,
          year: dbVehicle.year,
          registration: dbVehicle.license_plate, // Map license_plate to registration
          type: dbVehicle.vehicle_type || 'sedan', // Map vehicle_type to type
          color: dbVehicle.color,
          location: dbVehicle.location || 'N/A',
          status: actualStatus, // Use calculated status
          odometer: dbVehicle.mileage,
          lastService: dbVehicle.last_service_date,
          nextService: dbVehicle.next_service_due,
          fuelType: dbVehicle.fuel_type,
          dailyRate: dbVehicle.daily_rate,
          transmission: dbVehicle.transmission || 'automatic',
          vin: dbVehicle.vin,
          referenceNumber: dbVehicle.reference_number || Math.floor(Math.random() * 1000000),
          purchaseDate: dbVehicle.created_at,
          insuranceExpiry: dbVehicle.insurance_policy_number ? '2024-12-31' : undefined, // Default value
          registrationExpiry: dbVehicle.registration_expiry,
        };
      });

      // Update database status if there are discrepancies
      for (const vehicle of vehicles) {
        const dbVehicle = allVehicleData.find(v => v.id === vehicle.id);
        if (dbVehicle && dbVehicle.status !== vehicle.status) {
          await this.supabase
            .from('vehicles')
            .update({ status: vehicle.status })
            .eq('id', vehicle.id)
            .eq('user_id', userId);
        }
      }

      return {
        success: true,
        data: vehicles,
        message: 'Vehicles fetched successfully',
      };
    } catch (error: any) {
      console.error('Error in getAllVehicles:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to fetch vehicles: ${error.message}`,
      };
    }
  }

  async getVehicleById(id: string): Promise<ApiResponse<Vehicle>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await this.supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Vehicle not found');

      // Transform database format back to frontend format
      const frontendVehicle: Vehicle = {
        id: data.id,
        make: data.make,
        model: data.model,
        year: data.year,
        registration: data.license_plate,
        type: data.vehicle_type || 'sedan',
        color: data.color,
        location: data.location || 'N/A',
        status: data.status,
        odometer: data.mileage,
        lastService: data.last_service_date,
        nextService: data.next_service_due,
        fuelType: data.fuel_type,
        dailyRate: data.daily_rate,
        transmission: data.transmission || 'automatic',
        vin: data.vin,
        referenceNumber: data.reference_number || Math.floor(Math.random() * 1000000),
        purchaseDate: data.created_at,
        registrationExpiry: data.registration_expiry,
      };

      return { success: true, data: frontendVehicle, message: 'Vehicle fetched successfully' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch vehicle',
      };
    }
  }

  async createVehicle(
    vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>
  ): Promise<ApiResponse<Vehicle>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      
      // Transform frontend format to database format
      const dbVehicle = {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        license_plate: vehicle.registration, // Map registration to license_plate
        vehicle_type: vehicle.type || 'sedan', // Map type to vehicle_type
        color: vehicle.color,
        location: vehicle.location || 'N/A',
        mileage: vehicle.odometer || 0,
        fuel_type: vehicle.fuelType || 'gasoline', // Map fuelType to fuel_type
        transmission: vehicle.transmission || 'automatic',
        status: vehicle.status,
        daily_rate: vehicle.dailyRate || 0, // Map dailyRate to daily_rate  
        reference_number: vehicle.referenceNumber || Math.floor(Math.random() * 1000000),
        vin: vehicle.vin,
        user_id: userId,
      };
      
      const { data, error } = await this.supabase
        .from('vehicles')
        .insert([dbVehicle])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      // Transform database format back to frontend format
      const frontendVehicle: Vehicle = {
        id: data.id,
        make: data.make,
        model: data.model,
        year: data.year,
        registration: data.license_plate, // Map license_plate back to registration
        type: data.vehicle_type, // Map vehicle_type back to type
        color: data.color,
        location: data.location,
        status: data.status,
        odometer: data.mileage,
        fuelType: data.fuel_type, // Map fuel_type back to fuelType
        dailyRate: data.daily_rate, // Map daily_rate back to dailyRate
        transmission: data.transmission,
        vin: data.vin,
        referenceNumber: data.reference_number,
      };
      
      return { success: true, data: frontendVehicle, message: 'Vehicle created successfully' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create vehicle',
      };
    }
  }

  async updateVehicle(
    id: string,
    updates: Partial<Vehicle>
  ): Promise<ApiResponse<Vehicle>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      
      // Transform frontend updates to database format
      const dbUpdates: any = {};
      if (updates.make) dbUpdates.make = updates.make;
      if (updates.model) dbUpdates.model = updates.model;
      if (updates.year) dbUpdates.year = updates.year;
      if (updates.registration) dbUpdates.license_plate = updates.registration;
      if (updates.type) dbUpdates.vehicle_type = updates.type;
      if (updates.color) dbUpdates.color = updates.color;
      if (updates.location) dbUpdates.location = updates.location;
      if (updates.odometer) dbUpdates.mileage = updates.odometer;
      if (updates.fuelType) dbUpdates.fuel_type = updates.fuelType;
      if (updates.transmission) dbUpdates.transmission = updates.transmission;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.dailyRate) dbUpdates.daily_rate = updates.dailyRate;
      if (updates.referenceNumber) dbUpdates.reference_number = updates.referenceNumber;
      if (updates.vin) dbUpdates.vin = updates.vin;
      if (updates.lastService) dbUpdates.last_service_date = updates.lastService;
      if (updates.nextService) dbUpdates.next_service_due = updates.nextService;
      if (updates.registrationExpiry) dbUpdates.registration_expiry = updates.registrationExpiry;
      
      const { data, error } = await this.supabase
        .from('vehicles')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      // Transform database format back to frontend format
      const frontendVehicle: Vehicle = {
        id: data.id,
        make: data.make,
        model: data.model,
        year: data.year,
        registration: data.license_plate,
        type: data.vehicle_type || 'sedan',
        color: data.color,
        location: data.location || 'N/A',
        status: data.status,
        odometer: data.mileage,
        lastService: data.last_service_date,
        nextService: data.next_service_due,
        fuelType: data.fuel_type,
        dailyRate: data.daily_rate,
        transmission: data.transmission || 'automatic',
        vin: data.vin,
        referenceNumber: data.reference_number || Math.floor(Math.random() * 1000000),
        purchaseDate: data.created_at,
        insuranceExpiry: updates.insuranceExpiry,
        registrationExpiry: data.registration_expiry,
      };
      
      return { success: true, data: frontendVehicle, message: 'Vehicle updated successfully' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update vehicle',
      };
    }
  }

  async deleteVehicle(id: string): Promise<ApiResponse<void>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await this.supabase
        .from('vehicles')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return { success: true, message: 'Vehicle deleted successfully' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete vehicle',
      };
    }
  }

  async getAvailableVehicles(): Promise<ApiResponse<Vehicle[]>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await this.supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return {
        success: true,
        data: data || [],
        message: 'Available vehicles fetched successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch available vehicles',
      };
    }
  }

  async updateVehicleStatus(
    id: string,
    status: Vehicle['status']
  ): Promise<ApiResponse<Vehicle>> {
    return this.updateVehicle(id, { status });
  }
}

// CustomerService to interact with the 'customers' table in Supabase
export class CustomerService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getAllCustomers(): Promise<ApiResponse<Customer[]>> {
    try {
      const { data, error } = await this.supabase.from('customers').select('*');

      if (error) {
        console.error('Error fetching customers:', error);
        return { success: false, message: error.message };
      }

      const customers = data.map(mapDbCustomerToCustomer);
      return {
        success: true,
        message: 'Customers fetched successfully',
        data: customers,
      };
    } catch (error) {
      console.error('Exception in getAllCustomers:', error);
      return {
        success: false,
        message: 'Failed to fetch customers',
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  async getCustomerById(id: string): Promise<ApiResponse<Customer>> {
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: 'Customer not found',
            error: 'Not found',
          };
        }
        console.error('Error fetching customer by ID:', error);
        return { success: false, message: error.message, error: error.details };
      }

      return {
        success: true,
        message: 'Customer fetched successfully',
        data: mapDbCustomerToCustomer(data),
      };
    } catch (error) {
      console.error('Exception in getCustomerById:', error);
      return {
        success: false,
        message: 'Failed to fetch customer',
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  async createCustomer(
    customer: Omit<Customer, 'id' | 'joinDate' | 'rentals' | 'user_id'>
  ): Promise<ApiResponse<Customer>> {
    try {
      const user = await getAuthedUserId(this.supabase);
      if (!user) {
        return { success: false, message: 'User not authenticated' };
      }

      const [firstName, ...lastNameParts] = customer.name.split(' ');
      const lastName = lastNameParts.join(' ');

      const customerForDb = {
        first_name: firstName,
        last_name: lastName || firstName,
        email: customer.email,
        phone: customer.phone,
        address: customer.location,
        license_number: customer.licenseNumber,
        type: customer.type,
        company: customer.company || null,
        status: customer.status,
        image: customer.image || null,
        user_id: user,
      };

      const { data, error } = await this.supabase
        .from('customers')
        .insert([customerForDb])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        return { success: false, message: error.message, error: error.details };
      }

      return {
        success: true,
        message: 'Customer created successfully',
        data: mapDbCustomerToCustomer(data),
      };
    } catch (error) {
      console.error('Exception in createCustomer:', error);
      return {
        success: false,
        message: 'Failed to create customer',
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  async updateCustomer(
    id: string,
    updates: Partial<Customer>
  ): Promise<ApiResponse<Customer>> {
    try {
      const dbUpdates: { [key: string]: any } = {};
      if (updates.name) {
        const [firstName, ...lastNameParts] = updates.name.split(' ');
        dbUpdates.first_name = firstName;
        dbUpdates.last_name = lastNameParts.join(' ') || firstName;
      }
      if (updates.location) dbUpdates.address = updates.location;
      if (updates.licenseNumber) dbUpdates.license_number = updates.licenseNumber;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.company) dbUpdates.company = updates.company;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.image) dbUpdates.image = updates.image;

      const { data, error } = await this.supabase
        .from('customers')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer:', error);
        return { success: false, message: error.message, error: error.details };
      }
      return {
        success: true,
        message: 'Customer updated successfully',
        data: mapDbCustomerToCustomer(data),
      };
    } catch (error) {
      console.error('Exception in updateCustomer:', error);
      return {
        success: false,
        message: 'Failed to update customer',
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  async deleteCustomer(id: string): Promise<ApiResponse<void>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await this.supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return { success: true, message: 'Customer deleted successfully' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete customer',
      };
    }
  }
}

// Rental service
export class RentalService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getAllRentals(): Promise<ApiResponse<Rental[]>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await this.supabase
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
        .eq('user_id', userId);

      if (error) throw error;

      const rentals = data.map((rental: any) => {
        // Map database status to frontend status
        let mappedStatus = rental.status;
        if (rental.status === 'confirmed') mappedStatus = 'upcoming';
        if (rental.status === 'pending') mappedStatus = 'upcoming';
        
        return {
        id: rental.id,
        vehicleId: rental.vehicle_id,
        customerId: rental.customer_id,
        startDate: rental.start_date,
        endDate: rental.end_date,
          status: mappedStatus,
        totalAmount: rental.total_amount,
        notes: rental.notes,
        createdAt: rental.created_at,
          vehicle: rental.vehicles ? {
            ...rental.vehicles,
            registration: rental.vehicles.license_plate
          } : null,
          customer: rental.customers ? {
            ...rental.customers,
            name: `${rental.customers.first_name} ${rental.customers.last_name}`,
            location: 'N/A', // Not available in current schema
            type: 'Individual', // Default value
            status: 'active' // Default value
          } : null,
        };
      });

      return {
        success: true,
        data: rentals,
        message: 'Rentals fetched successfully.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to fetch rentals: ${error.message}`,
        error: error.message,
      };
    }
  }

  async getRentalById(id: string): Promise<ApiResponse<Rental>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await this.supabase
        .from('rentals')
        .select(
          `
          id,
          vehicle_id,
          customer_id,
          start_date,
          end_date,
          status,
          total_amount,
          notes,
          created_at,
          vehicle:vehicles!vehicle_id(*),
          customer:customers!customer_id(*)
        `
        )
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Map vehicle data properly
      const vehicleData = Array.isArray(data.vehicle) ? data.vehicle[0] : data.vehicle;
      const mappedVehicle = vehicleData ? {
        ...vehicleData,
        registration: vehicleData.license_plate, // Map license_plate to registration
      } : null;

      const rental = {
        id: data.id,
        vehicleId: data.vehicle_id,
        customerId: data.customer_id,
        startDate: data.start_date,
        endDate: data.end_date,
        status: data.status,
        totalAmount: data.total_amount,
        notes: data.notes,
        createdAt: data.created_at,
        vehicle: mappedVehicle,
        customer: Array.isArray(data.customer)
          ? data.customer[0]
          : data.customer,
      };

      return {
        success: true,
        data: rental,
        message: 'Rental fetched successfully.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to fetch rental: ${error.message}`,
        error: error.message,
      };
    }
  }

  async createRental(rental: Omit<Rental, 'id' | 'createdAt' | 'vehicle' | 'customer' | 'user_id'>): Promise<ApiResponse<Rental>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      // Get vehicle daily rate for calculation
      const { data: vehicleData, error: vehicleError } = await this.supabase
        .from('vehicles')
        .select('daily_rate, status')
        .eq('id', rental.vehicleId)
        .single();

      if (vehicleError || !vehicleData) {
        throw new Error('Failed to fetch vehicle details');
      }

      // Check if vehicle is available for rental
      if (vehicleData.status !== 'available') {
        throw new Error('Vehicle is not available for rental');
      }

      // Calculate rental days
      const startDate = new Date(rental.startDate);
      const endDate = new Date(rental.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Generate unique rental number
      const timestamp = Date.now();
      const rentalNumber = `RNT-${timestamp.toString().slice(-8)}`;

      // Calculate amounts
      const dailyRate = vehicleData.daily_rate;
      const subtotal = totalDays * dailyRate;
      const taxAmount = 0; // Can be calculated based on business rules
      const finalTotalAmount = rental.totalAmount || subtotal + taxAmount;

      // Start a transaction to create rental and update vehicle status
      const { data, error } = await this.supabase
        .from('rentals')
        .insert([
          {
            vehicle_id: rental.vehicleId,
            customer_id: rental.customerId,
            rental_number: rentalNumber,
            start_date: rental.startDate,
            end_date: rental.endDate,
            daily_rate: dailyRate,
            total_days: totalDays,
            subtotal: subtotal,
            tax_amount: taxAmount,
            total_amount: finalTotalAmount,
            status: rental.status,
            notes: rental.notes,
            user_id: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update vehicle status to 'rented' if rental is active
      if (rental.status === 'active') {
        const { error: vehicleUpdateError } = await this.supabase
          .from('vehicles')
          .update({ status: 'rented' })
          .eq('id', rental.vehicleId)
          .eq('user_id', userId);

        if (vehicleUpdateError) {
          // If vehicle update fails, we should rollback the rental creation
          // For now, we'll log the error but still return success for the rental
          console.error('Failed to update vehicle status after rental creation:', vehicleUpdateError);
        }
      }

      return { success: true, data, message: 'Rental created successfully.' };
    } catch (error: any) {
      return { success: false, message: `Failed to create rental: ${error.message}`, error: error.message };
    }
  }

  async updateRental(id: string, updates: Partial<Rental>): Promise<ApiResponse<Rental>> {
    const updateData: any = {};
    if (updates.vehicleId) updateData.vehicle_id = updates.vehicleId;
    if (updates.customerId) updateData.customer_id = updates.customerId;
    if (updates.startDate) updateData.start_date = updates.startDate;
    if (updates.endDate) updateData.end_date = updates.endDate;
    if (updates.status) updateData.status = updates.status;
    if (updates.totalAmount) updateData.total_amount = updates.totalAmount;
    if (updates.notes) updateData.notes = updates.notes;

    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      // Get current rental data to check for status changes
      const { data: currentRental, error: fetchError } = await this.supabase
        .from('rentals')
        .select('vehicle_id, status')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await this.supabase
        .from('rentals')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update vehicle status if rental status changed
      if (updates.status && currentRental) {
        let newVehicleStatus: string | null = null;
        
        if (updates.status === 'completed' || updates.status === 'cancelled') {
          newVehicleStatus = 'available';
        } else if (updates.status === 'active' && currentRental.status !== 'active') {
          newVehicleStatus = 'rented';
        }

        if (newVehicleStatus) {
          const { error: vehicleUpdateError } = await this.supabase
            .from('vehicles')
            .update({ status: newVehicleStatus })
            .eq('id', currentRental.vehicle_id)
            .eq('user_id', userId);

          if (vehicleUpdateError) {
            console.error('Failed to update vehicle status after rental update:', vehicleUpdateError);
          }
        }
      }

      return { success: true, data, message: 'Rental updated successfully.' };
    } catch (error: any) {
      return { success: false, message: `Failed to update rental: ${error.message}`, error: error.message };
    }
  }

  async deleteRental(id: string): Promise<ApiResponse<void>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      // Get rental data before deletion to update vehicle status
      const { data: rental, error: fetchError } = await this.supabase
        .from('rentals')
        .select('vehicle_id, status')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await this.supabase
        .from('rentals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Set vehicle status back to available if rental was active
      if (rental && rental.status === 'active') {
        const { error: vehicleUpdateError } = await this.supabase
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', rental.vehicle_id)
          .eq('user_id', userId);

        if (vehicleUpdateError) {
          console.error('Failed to update vehicle status after rental deletion:', vehicleUpdateError);
        }
      }

      return { success: true, message: 'Rental deleted successfully.' };
    } catch (error: any) {
      return { success: false, message: `Failed to delete rental: ${error.message}` };
    }
  }
}

// Payment service
export class PaymentService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getAllPayments(): Promise<ApiResponse<RentalPayment[]>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data: paymentsData, error: paymentsError } = await this.supabase
        .from('payments')
        .select('id, amount, status, payment_date, payment_method, transaction_id, rental_id')
        .eq('user_id', userId);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        return { success: false, message: 'Failed to fetch payments.' };
      }

      if (!paymentsData) return { success: true, data: [], message: 'No payments found.' };

      const rentalIds = [...new Set(paymentsData.map((p) => p.rental_id).filter(Boolean))];
      if (rentalIds.length === 0) {
        // This case can happen if there are payments not associated with rentals.
        // We'll map them without rental-specific data.
        const payments: RentalPayment[] = paymentsData.map(p => {
          // Map database status to interface status
          let paymentStatus: 'paid' | 'pending' | 'overdue';
          if (p.status === 'completed') {
            paymentStatus = 'paid';
          } else if (p.status === 'failed' || p.status === 'cancelled') {
            paymentStatus = 'overdue';
          } else {
            paymentStatus = 'pending';
          }

          return {
            id: p.id,
            vehicleId: 'N/A',
            vehicleRegistration: 'N/A',
            vehicleMake: 'Unknown',
            vehicleModel: 'Unknown',
            customer: 'Unknown Customer',
            revenue: p.amount,
            paymentStatus,
            paymentDueDate: p.payment_date,
            paymentMethod: p.payment_method,
            paidDate: p.status === 'completed' ? p.payment_date : null,
            weeklyPaymentCheck: 'pending',
            vehicleReferenceNumber: 0,
            transactionId: p.transaction_id,
          };
        });
        return { success: true, data: payments, message: "Payments without rentals fetched." };
      }

      const { data: rentalsData, error: rentalsError } = await this.supabase
        .from('rentals')
        .select('id, vehicle_id, customer_id, start_date, end_date')
        .in('id', rentalIds);

      if (rentalsError) {
        return { success: false, message: 'Failed to fetch rental details for payments.' };
      }

      const vehicleIds = [...new Set(rentalsData?.map((r) => r.vehicle_id).filter(Boolean))];
      const customerIds = [...new Set(rentalsData?.map((r) => r.customer_id).filter(Boolean))];

      const { data: vehiclesData, error: vehiclesError } = await this.supabase
        .from('vehicles')
        .select('id, registration_plate, make, model, reference_number')
        .in('id', vehicleIds);

      const { data: customersData, error: customersError } = await this.supabase
        .from('customers')
        .select('id, name, company_name')
        .in('id', customerIds);

      if (vehiclesError || customersError) {
        return { success: false, message: 'Failed to fetch vehicle or customer details.' };
      }

      const vehiclesMap = new Map(vehiclesData?.map((v) => [v.id, v]));
      const customersMap = new Map(customersData?.map((c) => [c.id, c]));
      const rentalsMap = new Map(rentalsData?.map((r) => [r.id, r]));

      const payments: RentalPayment[] = paymentsData
        .map((p: any) => {
          const rental = rentalsMap.get(p.rental_id);
          if (!rental) return null;
          
          const vehicle = vehiclesMap.get(rental.vehicle_id);
          const customer = customersMap.get(rental.customer_id);

          // Map database status to interface status
          let paymentStatus: 'paid' | 'pending' | 'overdue';
          if (p.status === 'completed') {
            paymentStatus = 'paid';
          } else if (p.status === 'failed' || p.status === 'cancelled') {
            paymentStatus = 'overdue';
          } else {
            paymentStatus = 'pending';
          }

          let weeklyPaymentCheck: 'current' | 'pending' | 'overdue' = 'pending';
          if (p.status === 'completed') {
            weeklyPaymentCheck = 'current';
          } else if (p.status === 'failed' || (p.payment_date && new Date(p.payment_date) < new Date() && p.status !== 'completed')) {
            weeklyPaymentCheck = 'overdue';
          }

          const rentalPayment: RentalPayment = {
            id: p.id,
            vehicleId: vehicle?.id || 'N/A',
            vehicleRegistration: vehicle?.registration_plate || 'N/A',
            vehicleMake: vehicle?.make,
            vehicleModel: vehicle?.model,
            customer: customer?.name || 'Unknown Customer',
            company: customer?.company_name,
            revenue: p.amount,
            paymentStatus,
            paymentDueDate: p.payment_date,
            paymentMethod: p.payment_method,
            paidDate: p.status === 'completed' ? p.payment_date : null,
            weeklyPaymentCheck,
            transactionId: p.transaction_id,
            startDate: rental.start_date,
            endDate: rental.end_date,
            vehicleReferenceNumber: vehicle?.reference_number || 0
          };
          return rentalPayment;
        })
        .filter((p): p is RentalPayment => p !== null);

      return { success: true, data: payments, message: "Payments fetched successfully." };
    } catch (error: any) {
      console.error('Error in getAllPayments:', error);
      return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
  }

  async getPaymentByRentalId(rentalId: string): Promise<ApiResponse<RentalPayment | null>> {
    console.warn('getPaymentByRentalId is not implemented');
    return { success: false, message: 'Not implemented' };
  }
  
  async updatePaymentFromCommBank(update: PaymentUpdate): Promise<ApiResponse<any>> {
    try {
        const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
            .select('id')
            .eq('rental_id', update.rentalId)
        .single();

        if (paymentError || !payment) {
            throw new Error(`Payment for rental ${update.rentalId} not found.`);
        }

        const { error: updateError } = await this.supabase
            .from('payments')
            .update({
                status: 'paid',
                paid_on: update.paidDate,
                transaction_id: update.transactionId,
                payment_method: update.paymentMethod,
                amount: update.amount,
            })
            .eq('id', payment.id);

        if (updateError) throw updateError;

        return { success: true, message: 'Payment updated successfully from CommBank webhook.' };

    } catch(error: any) {
        return { success: false, message: `Failed to update from CommBank webhook: ${error.message}` };
    }
  }

  async updatePaymentStatus(paymentId: string, status: 'paid' | 'pending' | 'overdue'): Promise<ApiResponse<void>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { error } = await this.supabase
        .from('payments')
        .update({ status: status, paid_on: status === 'paid' ? new Date().toISOString() : null })
        .eq('id', paymentId);
      
      if (error) throw error;

      return { success: true, message: 'Payment status updated.' };
    } catch (error: any) {
      return { success: false, message: `Failed to update payment status: ${error.message}` };
    }
  }

  async getOverduePayments(): Promise<ApiResponse<RentalPayment[]>> {
    console.warn('getOverduePayments is not implemented');
    return { success: false, message: 'Not implemented' };
  }

  async sendPaymentNotification(payment: RentalPayment, update?: PaymentUpdate): Promise<void> {
    console.warn('sendPaymentNotification is not implemented');
  }

  async getPaymentStatistics(): Promise<ApiResponse<PaymentStatistics>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      // Try to use the RPC function first
      const { data: rpcData, error: rpcError } = await this.supabase.rpc('get_payment_statistics');

      if (!rpcError && rpcData) {
        const stats: PaymentStatistics = {
          total: rpcData.total_payments,
          paid: rpcData.paid_payments,
          pending: rpcData.pending_payments,
          overdue: rpcData.overdue_payments,
          totalAmount: rpcData.total_amount,
          paidAmount: rpcData.paid_amount,
          overdueAmount: rpcData.overdue_amount,
          collectionRate: rpcData.collection_rate
        };
        return { success: true, data: stats, message: "Statistics fetched successfully." };
      }

      // Fallback: Calculate statistics directly from tables
      console.warn('RPC function not available, calculating statistics directly:', rpcError?.message);
      
      // Get payment statistics from payments table
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payments')
        .select('amount, status, payment_date')
        .eq('user_id', userId);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        return { success: false, message: 'Failed to fetch payment data.' };
      }

      // Get rental payment statistics
      const { data: rentals, error: rentalsError } = await this.supabase
        .from('rentals')
        .select('total_amount, payment_status')
        .eq('user_id', userId);

      if (rentalsError) {
        console.error('Error fetching rentals:', rentalsError);
        return { success: false, message: 'Failed to fetch rental data.' };
      }

      // Calculate statistics
      let totalPayments = 0;
      let paidPayments = 0;
      let pendingPayments = 0;
      let overduePayments = 0;
      let totalAmount = 0;
      let paidAmount = 0;
      let overdueAmount = 0;

      // Process payments
      payments?.forEach(payment => {
        totalPayments++;
        totalAmount += Number(payment.amount) || 0;
        
        if (payment.status === 'completed') {
          paidPayments++;
          paidAmount += Number(payment.amount) || 0;
        } else if (payment.status === 'pending') {
          pendingPayments++;
        } else if (payment.status === 'failed' || 
                  (payment.payment_date && new Date(payment.payment_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) {
          overduePayments++;
          overdueAmount += Number(payment.amount) || 0;
        }
      });

      // Process rentals
      rentals?.forEach(rental => {
        totalPayments++;
        totalAmount += Number(rental.total_amount) || 0;
        
        if (rental.payment_status === 'paid') {
          paidPayments++;
          paidAmount += Number(rental.total_amount) || 0;
        } else if (rental.payment_status === 'pending') {
          pendingPayments++;
        } else if (rental.payment_status === 'overdue') {
          overduePayments++;
          overdueAmount += Number(rental.total_amount) || 0;
        }
      });

      // Calculate collection rate
      const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100 * 100) / 100 : 0;

      const stats: PaymentStatistics = {
        total: totalPayments,
        paid: paidPayments,
        pending: pendingPayments,
        overdue: overduePayments,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        collectionRate
      };

      return { success: true, data: stats, message: "Statistics calculated successfully." };
    } catch (error: any) {
      console.error('Error in getPaymentStatistics:', error);
      return { success: false, message: `Error fetching payment statistics: ${error.message}` };
    }
  }

  checkOverduePayments(): Promise<ApiResponse<RentalPayment[]>> {
    console.warn('checkOverduePayments is not implemented');
    return Promise.resolve({ success: true, data: [], message: 'Not implemented' });
  }

  getPendingPaymentsForFollowUp(): Promise<ApiResponse<RentalPayment[]>> {
    console.warn('getPendingPaymentsForFollowUp is not implemented');
    return Promise.resolve({ success: true, data: [], message: 'Not implemented' });
  }

  async createPayment(payment: Omit<RentalPayment, 'id' | 'user_id'>): Promise<ApiResponse<RentalPayment>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data, error } = await this.supabase.from('payments').insert([{ ...payment, user_id: userId }]).select();
      if (error) throw error;
      return { success: true, message: 'Payment created.', data: data[0] };
    } catch (error: any) {
      return { success: false, message: `Failed to create payment: ${error.message}` };
    }
  }

  async deletePayment(paymentId: string): Promise<ApiResponse<void>> {
    console.warn('deletePayment is not implemented');
    return { success: false, message: 'Not implemented' };
  }

  async getPaymentsByStatus(status: 'paid' | 'pending' | 'overdue'): Promise<ApiResponse<RentalPayment[]>> {
    console.warn('getPaymentsByStatus is not implemented');
    return { success: false, message: 'Not implemented' };
  }

  async getPaymentsByDateRange(startDate: string, endDate: string): Promise<ApiResponse<RentalPayment[]>> {
    console.warn('getPaymentsByDateRange is not implemented');
    return { success: false, message: 'Not implemented' };
  }

  // The following methods are for payment gateway webhooks and automation
  // They do not use getAuthedUserId and can be used in serverless functions.

  generatePaymentReference(rentalId: string, customerName: string): string {
    const safeCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `RENT-${rentalId}-${safeCustomerName}-${Date.now()}`;
  }

  validatePaymentReference(reference: string): { valid: boolean; rentalId: string | null } {
    const parts = reference.split('-');
    if (parts[0] === 'RENT' && parts.length >= 2) {
      return { valid: true, rentalId: parts[1] };
    }
    return { valid: false, rentalId: null };
  }
  
  async updatePaymentFromExternal(update: { referenceNumber: number, status: string, amount?: number, currency?: string, paymentMethod?: string }): Promise<ApiResponse<any>> {
    try {
      const { data: vehicle, error: vehicleError } = await this.supabase
        .from('vehicles')
        .select('id')
        .eq('reference_number', update.referenceNumber)
        .single();
      
      if (vehicleError || !vehicle) {
        throw new Error(`Vehicle with reference ${update.referenceNumber} not found.`);
      }

      // Find the latest rental for this vehicle
      const { data: rental, error: rentalError } = await this.supabase
        .from('rentals')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

      if (rentalError || !rental) {
        throw new Error(`No rental found for vehicle reference ${update.referenceNumber}`);
      }
      
      // Find payment for this rental
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .select('id')
        .eq('rental_id', rental.id)
        .single();
        
      if (paymentError || !payment) {
          // Here we might need to create a payment if one doesn't exist
          console.warn(`No payment found for rental ${rental.id}. A new payment might need to be created.`);
          return { success: true, message: "No payment found, but webhook acknowledged."};
      }
      
      const { error: updateError } = await this.supabase
        .from('payments')
        .update({
            status: update.status === 'succeeded' ? 'paid' : update.status,
            paid_on: update.status === 'succeeded' ? new Date().toISOString() : null,
            amount: update.amount ? update.amount : undefined,
            payment_method: update.paymentMethod
        })
        .eq('id', payment.id)

      if (updateError) throw updateError;

      return { success: true, message: 'Payment updated successfully from external source.' };

    } catch(error: any) {
        return { success: false, message: `Failed to update from external source: ${error.message}` };
    }
  }

  async createStripePaymentIntent(details: { id: string; vehicleRegistration: string; customer: string; amount: number; currency: string; }): Promise<ApiResponse<StripePaymentIntent>> {
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rentalId: details.id,
          amount: details.amount,
          currency: details.currency,
          customerName: details.customer,
          vehicleRegistration: details.vehicleRegistration,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to create payment intent',
          error: result.error,
        };
      }

      return {
        success: true,
        data: {
          paymentIntentId: result.data.paymentIntentId,
          stripeReference: result.data.stripeReference,
          clientSecret: result.data.clientSecret,
        },
        message: result.message,
      };
    } catch (error) {
      console.error('Error creating Stripe payment intent:', error);
      return {
        success: false,
        message: 'Failed to create payment intent',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Dashboard service
export class TollNoticeService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getTollNoticesForRental(rentalId: string): Promise<ApiResponse<any[]>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data, error } = await this.supabase
        .from('rental_toll_notices')
        .select('*')
        .eq('rental_id', rentalId)
        .eq('user_id', userId)
        .order('issued_date', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Toll notices fetched successfully',
      };
    } catch (error: any) {
      console.error('Error fetching toll notices:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to fetch toll notices: ${error.message}`,
      };
    }
  }

  async createTollNotice(tollNotice: any): Promise<ApiResponse<any>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data, error } = await this.supabase
        .from('rental_toll_notices')
        .insert([{ ...tollNotice, user_id: userId }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Toll notice created successfully',
      };
    } catch (error: any) {
      console.error('Error creating toll notice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create toll notice: ${error.message}`,
      };
    }
  }

  async updateTollNotice(id: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data, error } = await this.supabase
        .from('rental_toll_notices')
        .update({ ...updates, synced_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Toll notice updated successfully',
      };
    } catch (error: any) {
      console.error('Error updating toll notice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update toll notice: ${error.message}`,
      };
    }
  }

  async deleteTollNotice(id: string): Promise<ApiResponse<void>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { error } = await this.supabase
        .from('rental_toll_notices')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        message: 'Toll notice deleted successfully',
      };
    } catch (error: any) {
      console.error('Error deleting toll notice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to delete toll notice: ${error.message}`,
      };
    }
  }

  async markTollNoticePaid(id: string): Promise<ApiResponse<any>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data, error } = await this.supabase
        .from('rental_toll_notices')
        .update({ 
          is_paid: true, 
          trip_status: 'Paid',
          synced_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Toll notice marked as paid successfully',
      };
    } catch (error: any) {
      console.error('Error marking toll notice as paid:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to mark toll notice as paid: ${error.message}`,
      };
    }
  }

  async getWeeklyTollSummary(rentalId: string): Promise<ApiResponse<any[]>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data, error } = await this.supabase
        .from('rental_toll_weekly_summary')
        .select('*')
        .eq('rental_id', rentalId)
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Weekly toll summary fetched successfully',
      };
    } catch (error: any) {
      console.error('Error fetching weekly toll summary:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to fetch weekly toll summary: ${error.message}`,
      };
    }
  }

  async getTollStatistics(rentalId: string): Promise<ApiResponse<any>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const { data, error } = await this.supabase
        .rpc('get_rental_toll_statistics', { rental_uuid: rentalId });

      if (error) throw error;

      return {
        success: true,
        data: data || {},
        message: 'Toll statistics fetched successfully',
      };
    } catch (error: any) {
      console.error('Error fetching toll statistics:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to fetch toll statistics: ${error.message}`,
      };
    }
  }

  async bulkCreateTollNotices(tollNotices: any[]): Promise<ApiResponse<any[]>> {
    try {
      const userId = await getAuthedUserId(this.supabase);
      if (!userId) throw new Error('User not authenticated.');

      const noticesWithUserId = tollNotices.map(notice => ({ ...notice, user_id: userId }));

      const { data, error } = await this.supabase
        .from('rental_toll_notices')
        .upsert(noticesWithUserId, {
          onConflict: 'toll_notice_number,rental_id',
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `${data?.length || 0} toll notices synced successfully`,
      };
    } catch (error: any) {
      console.error('Error bulk creating toll notices:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to sync toll notices: ${error.message}`,
      };
    }
  }
}

export class DashboardService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const baseStats: DashboardStats = {
      totalVehicles: 15,
      availableVehicles: 8,
      activeRentals: 6,
      totalRevenue: 45000,
      pendingPayments: 5,
      overduePayments: 2,
    };

    try {
      // In a real scenario, you'd fetch this data from your database
      const detailedStats = {
        ...baseStats,
        revenueByMonth: [
          { month: 'Jan', revenue: 5000 },
          { month: 'Feb', revenue: 7500 },
          { month: 'Mar', revenue: 6200 },
        ],
        vehicleStatusDistribution: {
          available: 8,
          rented: 6,
          maintenance: 1,
        },
        rentalDurationDistribution: {
          '1-3 days': 10,
          '4-7 days': 8,
          '8+ days': 5,
        },
        upcomingServices: mockVehicles
          .filter(
            v =>
              v.nextService &&
              new Date(v.nextService) > new Date() &&
              new Date(v.nextService).getTime() - new Date().getTime() <
                30 * 24 * 60 * 60 * 1000
          )
          .map(v => ({
            vehicleId: v.id,
            make: v.make,
            model: v.model,
            nextServiceDue: v.nextService,
          })),
      };

      return {
        success: true,
        data: detailedStats,
        message: 'Dashboard stats retrieved successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch dashboard stats';
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }
}

