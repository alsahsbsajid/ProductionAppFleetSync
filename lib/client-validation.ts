// lib/client-validation.ts
// Client-safe validation utilities that can be used on both client and server

// Input validation utilities
export const validateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  amount: (amount: number): boolean => {
    return typeof amount === 'number' && amount > 0 && amount <= 1000000 && Number.isFinite(amount);
  },
  
  string: (str: string, maxLength: number = 255): boolean => {
    return typeof str === 'string' && str.length > 0 && str.length <= maxLength;
  },
  
  licensePlate: (plate: string): boolean => {
    // Australian license plate format validation
    // Supports various state formats: ABC123, ABC-123, 123ABC, 123-ABC, etc.
    const plateRegex = /^[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{2,4}$|^[A-Z0-9]{4,7}$/;
    return plateRegex.test(plate.toUpperCase()) && plate.length >= 4 && plate.length <= 8;
  },
  
  phoneNumber: (phone: string): boolean => {
    // Australian phone number validation
    const phoneRegex = /^(\+61|0)[2-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  },
  
  vin: (vin: string): boolean => {
    // Vehicle Identification Number validation
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(vin.toUpperCase());
  },
  
  year: (year: number): boolean => {
    const currentYear = new Date().getFullYear();
    return typeof year === 'number' && year >= 1900 && year <= currentYear + 1;
  },

  name: (name: string): boolean => {
    return typeof name === 'string' && name.trim().length >= 2 && name.length <= 100;
  },

  vehicleField: (field: string): boolean => {
    return typeof field === 'string' && field.trim().length >= 1 && field.length <= 50;
  },

  dailyRate: (rate: number): boolean => {
    return typeof rate === 'number' && rate >= 0 && rate <= 10000 && Number.isFinite(rate);
  },

  location: (location: string): boolean => {
    return typeof location === 'string' && location.trim().length >= 2 && location.length <= 100;
  }
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>"'&]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match] || match;
    })
    .trim()
    .substring(0, 1000); // Limit length
};

// Client-safe form validation helpers
export const formValidation = {
  required: (value: any, fieldName: string): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (email: string): string | null => {
    if (!validateInput.email(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (phone: string): string | null => {
    if (!validateInput.phoneNumber(phone)) {
      return 'Please enter a valid Australian phone number';
    }
    return null;
  },

  vehicleMake: (make: string): string | null => {
    if (!validateInput.vehicleField(make)) {
      return 'Vehicle make must be between 1-50 characters';
    }
    return null;
  },

  vehicleModel: (model: string): string | null => {
    if (!validateInput.vehicleField(model)) {
      return 'Vehicle model must be between 1-50 characters';
    }
    return null;
  },

  year: (year: number): string | null => {
    if (!validateInput.year(year)) {
      return 'Please enter a valid year between 1900 and next year';
    }
    return null;
  },

  dailyRate: (rate: number): string | null => {
    if (!validateInput.dailyRate(rate)) {
      return 'Daily rate must be between $0 and $10,000';
    }
    return null;
  },

  registration: (registration: string): string | null => {
    if (!validateInput.licensePlate(registration)) {
      return 'Please enter a valid license plate number';
    }
    return null;
  }
};

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+61|0)[2-9]\d{8}$/,
  licensePlate: /^[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{2,4}$|^[A-Z0-9]{4,7}$/,
  vin: /^[A-HJ-NPR-Z0-9]{17}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
}; 