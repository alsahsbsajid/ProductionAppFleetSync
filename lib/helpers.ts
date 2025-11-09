import { format, parseISO, isValid } from 'date-fns';
import { DATE_FORMATS } from './constants';
import type { PaymentStatus, VehicleStatus, RentalStatus } from './types';

// Date utilities
export const dateUtils = {
  formatForDisplay: (date: string | Date): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return isValid(dateObj)
        ? format(dateObj, DATE_FORMATS.display)
        : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  },

  formatForApi: (date: Date): string => {
    return format(date, DATE_FORMATS.api);
  },

  isOverdue: (dueDate: string): boolean => {
    try {
      const due = parseISO(dueDate);
      const now = new Date();
      return isValid(due) && due < now;
    } catch {
      return false;
    }
  },

  daysBetween: (startDate: string, endDate: string): number => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (!isValid(start) || !isValid(end)) return 0;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  },

  addDays: (date: string | Date, days: number): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const newDate = new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);
      return format(newDate, DATE_FORMATS.api);
    } catch {
      return format(new Date(), DATE_FORMATS.api);
    }
  },
};

// Currency utilities
export const currencyUtils = {
  format: (amount: number, currency = 'AUD'): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  },

  parse: (formattedAmount: string): number => {
    const cleaned = formattedAmount.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  },

  calculateTax: (amount: number, taxRate: number): number => {
    return amount * taxRate;
  },

  calculateTotal: (amount: number, taxRate: number): number => {
    return amount + currencyUtils.calculateTax(amount, taxRate);
  },
};

// String utilities
export const stringUtils = {
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate: (str: string, maxLength: number): string => {
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  },

  slugify: (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  generateId: (prefix = ''): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return prefix
      ? `${prefix}_${timestamp}_${random}`
      : `${timestamp}_${random}`;
  },

  maskSensitive: (str: string, visibleChars = 4): string => {
    if (str.length <= visibleChars) return str;
    const visible = str.slice(-visibleChars);
    const masked = '*'.repeat(str.length - visibleChars);
    return masked + visible;
  },
};

// Array utilities
export const arrayUtils = {
  groupBy: <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce(
      (groups, item) => {
        const group = String(item[key]);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  },

  sortBy: <T>(
    array: T[],
    key: keyof T,
    direction: 'asc' | 'desc' = 'asc'
  ): T[] => {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  unique: <T>(array: T[], key?: keyof T): T[] => {
    if (!key) return [...new Set(array)];

    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  },

  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
};

// Status utilities
export const statusUtils = {
  getPaymentStatusColor: (status: PaymentStatus): string => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'overdue':
        return 'text-red-600 bg-red-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  },

  getVehicleStatusColor: (status: VehicleStatus): string => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-50';
      case 'rented':
        return 'text-blue-600 bg-blue-50';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-50';
      case 'out_of_service':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  },

  getRentalStatusColor: (status: RentalStatus): string => {
    switch (status) {
      case 'active':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  },
};

// Local storage utilities
export const storageUtils = {
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
