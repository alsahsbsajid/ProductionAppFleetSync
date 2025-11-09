// lib/sync-service.ts
// Shared data synchronization service for FleetSync

import { SupabaseClient } from '@supabase/supabase-js';
import { VehicleService, RentalService, CustomerService, TollNoticeService } from './data-service';
import { Vehicle, Rental, Customer } from './types';

export class DataSyncService {
  private supabase: SupabaseClient;
  private vehicleService: VehicleService;
  private rentalService: RentalService;
  private customerService: CustomerService;
  private tollNoticeService: TollNoticeService;
  private subscribers: Map<string, () => void> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.vehicleService = new VehicleService(supabase);
    this.rentalService = new RentalService(supabase);
    this.customerService = new CustomerService(supabase);
    this.tollNoticeService = new TollNoticeService(supabase);
  }

  // Subscribe to data changes
  subscribe(id: string, callback: () => void) {
    this.subscribers.set(id, callback);
    return () => this.unsubscribe(id);
  }

  // Unsubscribe from data changes
  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  // Notify all subscribers of data changes
  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in data sync callback:', error);
      }
    });
  }

  // Create rental and sync all data
  async createRental(rentalData: Omit<Rental, 'id' | 'createdAt' | 'vehicle' | 'customer' | 'user_id'>) {
    try {
      const result = await this.rentalService.createRental(rentalData);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error creating rental:', error);
      throw error;
    }
  }

  // Update rental and sync all data
  async updateRental(id: string, updates: Partial<Rental>) {
    try {
      const result = await this.rentalService.updateRental(id, updates);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error updating rental:', error);
      throw error;
    }
  }

  // Delete rental and sync all data
  async deleteRental(id: string) {
    try {
      const result = await this.rentalService.deleteRental(id);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error deleting rental:', error);
      throw error;
    }
  }

  // Create vehicle and sync all data
  async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>) {
    try {
      const result = await this.vehicleService.createVehicle(vehicleData);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  // Update vehicle and sync all data
  async updateVehicle(id: string, updates: Partial<Vehicle>) {
    try {
      const result = await this.vehicleService.updateVehicle(id, updates);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }

  // Delete vehicle and sync all data
  async deleteVehicle(id: string) {
    try {
      const result = await this.vehicleService.deleteVehicle(id);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }

  // Create customer and sync all data
  async createCustomer(customerData: Omit<Customer, 'id' | 'joinDate' | 'rentals' | 'user_id'>) {
    try {
      const result = await this.customerService.createCustomer(customerData);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // Update customer and sync all data
  async updateCustomer(id: string, updates: Partial<Customer>) {
    try {
      const result = await this.customerService.updateCustomer(id, updates);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  // Delete customer and sync all data
  async deleteCustomer(id: string) {
    try {
      const result = await this.customerService.deleteCustomer(id);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Toll Notice Management
  
  // Get toll notices for a rental
  async getTollNoticesForRental(rentalId: string) {
    try {
      return await this.tollNoticeService.getTollNoticesForRental(rentalId);
    } catch (error) {
      console.error('Error fetching toll notices:', error);
      throw error;
    }
  }

  // Create toll notice and sync all data
  async createTollNotice(tollNotice: any) {
    try {
      const result = await this.tollNoticeService.createTollNotice(tollNotice);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error creating toll notice:', error);
      throw error;
    }
  }

  // Update toll notice and sync all data
  async updateTollNotice(id: string, updates: any) {
    try {
      const result = await this.tollNoticeService.updateTollNotice(id, updates);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error updating toll notice:', error);
      throw error;
    }
  }

  // Delete toll notice and sync all data
  async deleteTollNotice(id: string) {
    try {
      const result = await this.tollNoticeService.deleteTollNotice(id);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error deleting toll notice:', error);
      throw error;
    }
  }

  // Mark toll notice as paid and sync all data
  async markTollNoticePaid(id: string) {
    try {
      const result = await this.tollNoticeService.markTollNoticePaid(id);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error marking toll notice as paid:', error);
      throw error;
    }
  }

  // Bulk create toll notices and sync all data
  async bulkCreateTollNotices(tollNotices: any[]) {
    try {
      const result = await this.tollNoticeService.bulkCreateTollNotices(tollNotices);
      if (result.success) {
        // Notify all subscribers to refresh their data
        this.notifySubscribers();
      }
      return result;
    } catch (error) {
      console.error('Error bulk creating toll notices:', error);
      throw error;
    }
  }

  // Get weekly toll summary
  async getWeeklyTollSummary(rentalId: string) {
    try {
      return await this.tollNoticeService.getWeeklyTollSummary(rentalId);
    } catch (error) {
      console.error('Error fetching weekly toll summary:', error);
      throw error;
    }
  }

  // Get toll statistics
  async getTollStatistics(rentalId: string) {
    try {
      return await this.tollNoticeService.getTollStatistics(rentalId);
    } catch (error) {
      console.error('Error fetching toll statistics:', error);
      throw error;
    }
  }

  // Fetch all data (for initial loads and refreshes)
  async fetchAllData() {
    try {
      const [vehiclesResponse, rentalsResponse, customersResponse] = await Promise.all([
        this.vehicleService.getAllVehicles(),
        this.rentalService.getAllRentals(),
        this.customerService.getAllCustomers()
      ]);

      return {
        vehicles: vehiclesResponse.success ? vehiclesResponse.data : [],
        rentals: rentalsResponse.success ? rentalsResponse.data : [],
        customers: customersResponse.success ? customersResponse.data : [],
        errors: {
          vehicles: vehiclesResponse.success ? null : vehiclesResponse.message,
          rentals: rentalsResponse.success ? null : rentalsResponse.message,
          customers: customersResponse.success ? null : customersResponse.message,
        }
      };
    } catch (error) {
      console.error('Error fetching all data:', error);
      throw error;
    }
  }

  // Set up real-time subscriptions for all tables
  setupRealtimeSubscriptions(userId: string, onDataChange: () => void) {
    const vehicleChannel = this.supabase
      .channel('vehicles-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Vehicle change detected - syncing data');
          onDataChange();
        }
      )
      .subscribe();

    const rentalChannel = this.supabase
      .channel('rentals-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rentals',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Rental change detected - syncing data');
          onDataChange();
        }
      )
      .subscribe();

    const customerChannel = this.supabase
      .channel('customers-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Customer change detected - syncing data');
          onDataChange();
        }
      )
      .subscribe();

    const tollNoticeChannel = this.supabase
      .channel('toll-notices-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_toll_notices',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Toll notice change detected - syncing data');
          onDataChange();
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(vehicleChannel);
      this.supabase.removeChannel(rentalChannel);
      this.supabase.removeChannel(customerChannel);
      this.supabase.removeChannel(tollNoticeChannel);
    };
  }
}

// Global instance factory
let globalSyncService: DataSyncService | null = null;

export function getSyncService(supabase: SupabaseClient): DataSyncService {
  if (!globalSyncService || globalSyncService['supabase'] !== supabase) {
    globalSyncService = new DataSyncService(supabase);
  }
  return globalSyncService;
} 