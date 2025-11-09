// Core entity types
export interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  type: string;
  color: string;
  location: string;
  status: 'available' | 'rented' | 'maintenance' | 'out_of_service';
  odometer?: number;
  lastService?: string;
  nextService?: string;
  referenceNumber: number;
  fuelLevel?: number;
  vin?: string;
  fuelType?: string;
  transmission?: string;
  dailyRate?: number;
  purchaseDate?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  type: string;
  licenseNumber?: string;
  company?: string;
  status: 'active' | 'inactive' | 'suspended';
  joinDate?: string;
  rentals?: number;
  image?: string;
}

export interface Rental {
  id: string;
  vehicleId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled' | 'upcoming';
  totalAmount: number;
  notes?: string;
  createdAt?: string;
  vehicle?: Vehicle;
  customer?: Customer;
}

export interface TollNotice {
  id: string;
  licence_plate: string;
  state: string;
  toll_notice_number?: string;
  motorway: string;
  issued_date: string;
  trip_status: string;
  admin_fee: number;
  toll_amount: number;
  total_amount: number;
  due_date: string;
  is_paid: boolean;
  vehicle_type?: 'car' | 'motorcycle';
  search_source?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Payment related types
export interface PaymentUpdate {
  rentalId: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  paidDate: string;
  payerName?: string;
  payerAccount?: string;
}

export interface RentalPayment {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  customer: string;
  company?: string;
  revenue: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  paymentDueDate: string;
  paymentMethod: string;
  paidDate?: string | null;
  weeklyPaymentCheck: 'current' | 'pending' | 'overdue';
  transactionId?: string | null;
  payerName?: string | null;
  startDate?: string;
  endDate?: string;
  vehicleReferenceNumber: number;
  stripeReferenceNumber?: string;
  paymentIntentId?: string;
}

export interface PaymentStatistics {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
  collectionRate: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaymentResponse extends ApiResponse {
  updatedPayment?: RentalPayment;
}

export interface StripePaymentIntent {
  paymentIntentId: string;
  stripeReference: string;
  clientSecret: string;
}

// Form types
export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  location: string;
  type: string;
  licenseNumber: string;
}

export interface VehicleFormData {
  make: string;
  model: string;
  year: string;
  registration: string;
  type: string;
  color: string;
  location: string;
}

export interface RentalFormData {
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

// Dashboard types
export interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  activeRentals: number;
  totalRevenue: number;
  pendingPayments: number;
  overduePayments: number;
}

// Settings types
export interface PaymentSettings {
  stripePublishableKey: string;
  stripeSecretKey: string;
  currency: string;
  taxRate: number;
  lateFeeRate: number;
  gracePeriodDays: number;
}

// Notification types
export interface Notification {
  id: string;
  type:
    | 'payment_received'
    | 'payment_overdue'
    | 'vehicle_maintenance'
    | 'rental_completed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  details?: Record<string, any>;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  timestamp: string;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export type NotificationType = string;
export type NotificationPriority = string;

// Utility types
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'failed';
export type VehicleStatus =
  | 'available'
  | 'rented'
  | 'maintenance'
  | 'out_of_service';
export type CustomerType = 'individual' | 'business';
export type RentalStatus = 'active' | 'completed' | 'cancelled' | 'upcoming';
