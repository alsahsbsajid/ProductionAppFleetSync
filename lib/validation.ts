import { VALIDATION } from './constants';
import type {
  CustomerFormData,
  VehicleFormData,
  RentalFormData,
} from './types';

// Generic validation utilities
export const validators = {
  email: (email: string): boolean => {
    return VALIDATION.emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    return VALIDATION.phoneRegex.test(phone);
  },

  registration: (registration: string): boolean => {
    return VALIDATION.registrationRegex.test(registration);
  },

  required: (value: string | undefined | null): boolean => {
    return value !== undefined && value !== null && value.trim().length > 0;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  isPositiveNumber: (value: number): boolean => {
    return !isNaN(value) && value > 0;
  },

  isValidYear: (year: number): boolean => {
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear + 1;
  },

  isValidDate: (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },

  isFutureDate: (dateString: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();
    return date > now;
  },
};

// Validation error messages
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  registration: 'Please enter a valid registration (e.g., NSW-123)',
  minLength: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) =>
    `${field} must not exceed ${max} characters`,
  positiveNumber: (field: string) => `${field} must be a positive number`,
  validYear: 'Please enter a valid year',
  validDate: 'Please enter a valid date',
  futureDate: 'Date must be in the future',
};

// Form validation schemas
export const validateCustomerForm = (
  data: CustomerFormData
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!validators.required(data.name)) {
    errors.name = validationMessages.required('Name');
  } else if (!validators.maxLength(data.name, VALIDATION.maxNameLength)) {
    errors.name = validationMessages.maxLength(
      'Name',
      VALIDATION.maxNameLength
    );
  }

  if (!validators.required(data.email)) {
    errors.email = validationMessages.required('Email');
  } else if (!validators.email(data.email)) {
    errors.email = validationMessages.email;
  } else if (!validators.maxLength(data.email, VALIDATION.maxEmailLength)) {
    errors.email = validationMessages.maxLength(
      'Email',
      VALIDATION.maxEmailLength
    );
  }

  if (!validators.required(data.phone)) {
    errors.phone = validationMessages.required('Phone');
  } else if (!validators.phone(data.phone)) {
    errors.phone = validationMessages.phone;
  }

  if (!validators.required(data.location)) {
    errors.location = validationMessages.required('Location');
  }

  if (!validators.required(data.type)) {
    errors.type = validationMessages.required('Customer type');
  }

  if (!validators.required(data.licenseNumber)) {
    errors.licenseNumber = validationMessages.required('License number');
  }

  return errors;
};

export const validateVehicleForm = (
  data: VehicleFormData
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!validators.required(data.make)) {
    errors.make = validationMessages.required('Make');
  }

  if (!validators.required(data.model)) {
    errors.model = validationMessages.required('Model');
  }

  if (!validators.required(data.year)) {
    errors.year = validationMessages.required('Year');
  } else {
    const yearNum = parseInt(data.year);
    if (!validators.isValidYear(yearNum)) {
      errors.year = validationMessages.validYear;
    }
  }

  if (!validators.required(data.registration)) {
    errors.registration = validationMessages.required('Registration');
  } else if (!validators.registration(data.registration)) {
    errors.registration = validationMessages.registration;
  }

  if (!validators.required(data.type)) {
    errors.type = validationMessages.required('Vehicle type');
  }

  if (!validators.required(data.color)) {
    errors.color = validationMessages.required('Color');
  }

  if (!validators.required(data.location)) {
    errors.location = validationMessages.required('Location');
  }

  return errors;
};

export const validateRentalForm = (
  data: RentalFormData
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!validators.required(data.customerId)) {
    errors.customerId = validationMessages.required('Customer');
  }

  if (!validators.required(data.vehicleId)) {
    errors.vehicleId = validationMessages.required('Vehicle');
  }

  if (!validators.required(data.startDate)) {
    errors.startDate = validationMessages.required('Start date');
  } else if (!validators.isValidDate(data.startDate)) {
    errors.startDate = validationMessages.validDate;
  }

  if (!validators.required(data.endDate)) {
    errors.endDate = validationMessages.required('End date');
  } else if (!validators.isValidDate(data.endDate)) {
    errors.endDate = validationMessages.validDate;
  } else if (!validators.isFutureDate(data.endDate)) {
    errors.endDate = validationMessages.futureDate;
  }

  // Check if end date is after start date
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      errors.endDate = 'End date must be after start date';
    }
  }

  return errors;
};

// Utility to check if form has errors
export const hasValidationErrors = (
  errors: Record<string, string>
): boolean => {
  return Object.keys(errors).length > 0;
};

// Utility to get first error message
export const getFirstError = (
  errors: Record<string, string>
): string | null => {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
};
