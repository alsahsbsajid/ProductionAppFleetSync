// Application constants
export const APP_CONFIG = {
  name: 'FleetSync NSW',
  description:
    'Professional fleet management system for New South Wales businesses',
  version: '1.0.0',
  defaultCurrency: 'AUD',
  defaultTimezone: 'Australia/Sydney',
} as const;

// Payment constants
export const PAYMENT_CONFIG = {
  defaultGracePeriodDays: 7,
  defaultLateFeeRate: 0.05, // 5%
  defaultTaxRate: 0.1, // 10% GST
  maxPaymentRetries: 3,
  paymentTimeoutMs: 30000, // 30 seconds
} as const;

// Vehicle constants
export const VEHICLE_TYPES = [
  'sedan',
  'suv',
  'truck',
  'van',
  'motorcycle',
  'other',
] as const;

export const VEHICLE_STATUSES = [
  'available',
  'rented',
  'maintenance',
  'out_of_service',
] as const;

// Customer constants
export const CUSTOMER_TYPES = ['individual', 'business'] as const;

export const CUSTOMER_STATUSES = ['active', 'inactive', 'suspended'] as const;

// Payment status constants
export const PAYMENT_STATUSES = [
  'paid',
  'pending',
  'overdue',
  'failed',
] as const;

export const PAYMENT_METHODS = [
  'Credit Card',
  'Bank Transfer',
  'Cash',
  'Cheque',
  'Direct Debit',
] as const;

// Rental constants
export const RENTAL_STATUSES = ['active', 'completed', 'cancelled'] as const;

// Notification constants
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

// API constants
export const API_ENDPOINTS = {
  payments: '/api/payments',
  vehicles: '/api/vehicles',
  customers: '/api/customers',
  rentals: '/api/rentals',
  webhooks: {
    stripe: '/api/webhooks/stripe',
    commbank: '/api/webhooks/commbank',
  },
} as const;

// UI constants
export const UI_CONFIG = {
  itemsPerPage: 10,
  maxItemsPerPage: 100,
  debounceMs: 300,
  toastDuration: 5000,
  modalAnimationDuration: 200,
} as const;

// Date formats
export const DATE_FORMATS = {
  display: 'dd/MM/yyyy',
  api: 'yyyy-MM-dd',
  timestamp: 'yyyy-MM-dd HH:mm:ss',
  relative: 'relative',
} as const;

// Validation constants
export const VALIDATION = {
  minPasswordLength: 8,
  maxNameLength: 100,
  maxEmailLength: 255,
  phoneRegex: /^\+?[1-9]\d{1,14}$/,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  registrationRegex: /^[A-Z]{2,3}-\d{3}$/,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  generic: 'An unexpected error occurred. Please try again.',
  network: 'Network error. Please check your connection.',
  validation: 'Please check your input and try again.',
  unauthorized: 'You are not authorized to perform this action.',
  notFound: 'The requested resource was not found.',
  serverError: 'Server error. Please try again later.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  paymentUpdated: 'Payment updated successfully',
  vehicleAdded: 'Vehicle added successfully',
  customerAdded: 'Customer added successfully',
  rentalCreated: 'Rental created successfully',
  settingsSaved: 'Settings saved successfully',
} as const;
