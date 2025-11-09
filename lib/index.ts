// Core utilities
export { cn } from './utils';
export * from './types';
export * from './constants';
export * from './helpers';
export * from './validation';

// Services
export { PaymentService } from './payment-service';
export {
  vehicleService,
  customerService,
  rentalService,
  dashboardService,
  paymentService,
  dataService,
  VehicleService,
  CustomerService,
  RentalService,
  DashboardService,
  PaymentService as DataPaymentService,
} from './data-service';

export {
  notificationService,
  notify,
  NotificationService,
  type NotificationOptions,
} from './notification-service';

// Re-export commonly used types for convenience
export type {
  Vehicle,
  Customer,
  Rental,
  RentalPayment,
  PaymentUpdate,
  PaymentStatistics,
  DashboardStats,
  ApiResponse,
  NotificationData,
  CustomerFormData,
  VehicleFormData,
  RentalFormData,
} from './types';

// Re-export commonly used constants
export {
  VEHICLE_STATUSES,
  CUSTOMER_STATUSES,
  RENTAL_STATUSES,
  PAYMENT_STATUSES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  DATE_FORMATS,
} from './constants';

// Re-export commonly used helpers
export {
  dateUtils,
  currencyUtils,
  stringUtils,
  arrayUtils,
  statusUtils,
  storageUtils,
  debounce,
  throttle,
} from './helpers';

// Re-export validation functions
export {
  validators,
  validationMessages,
  validateCustomerForm,
  validateVehicleForm,
  validateRentalForm,
  hasValidationErrors,
  getFirstError,
} from './validation';
