import type { NotificationType, NotificationPriority } from './types';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from './constants';
import { dateUtils } from './helpers';

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

export interface NotificationOptions {
  type?: NotificationType;
  priority?: NotificationPriority;
  autoClose?: boolean;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, NotificationData> = new Map();
  private listeners: Set<(notifications: NotificationData[]) => void> =
    new Set();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Core notification methods
  show(
    title: string,
    message: string,
    options: NotificationOptions = {}
  ): string {
    const id = this.generateId();
    const notification: NotificationData = {
      id,
      title,
      message,
      type: options.type || NOTIFICATION_TYPES.INFO,
      priority: options.priority || NOTIFICATION_PRIORITIES.MEDIUM,
      timestamp: new Date().toISOString(),
      read: false,
      actions: options.actions || [],
    };

    this.notifications.set(id, notification);
    this.notifyListeners();

    // Auto-close if specified
    if (options.autoClose !== false) {
      const duration =
        options.duration || this.getDefaultDuration(notification.type);
      setTimeout(() => {
        try {
          this.remove(id);
        } catch (error) {
          console.error('Error auto-removing notification:', error);
        }
      }, duration);
    }

    return id;
  }

  success(
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ): string {
    return this.show(title, message, {
      ...options,
      type: NOTIFICATION_TYPES.SUCCESS,
    });
  }

  error(
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ): string {
    return this.show(title, message, {
      ...options,
      type: NOTIFICATION_TYPES.ERROR,
      autoClose: false, // Errors should not auto-close
    });
  }

  warning(
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ): string {
    return this.show(title, message, {
      ...options,
      type: NOTIFICATION_TYPES.WARNING,
    });
  }

  info(
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ): string {
    return this.show(title, message, {
      ...options,
      type: NOTIFICATION_TYPES.INFO,
    });
  }

  // Payment-specific notifications
  paymentReceived(amount: number, reference: string): string {
    return this.success(
      'Payment Received',
      `Payment of $${amount.toFixed(2)} received for reference ${reference}`,
      { priority: NOTIFICATION_PRIORITIES.HIGH }
    );
  }

  paymentOverdue(
    amount: number,
    customerName: string,
    daysOverdue: number
  ): string {
    return this.warning(
      'Payment Overdue',
      `Payment of $${amount.toFixed(2)} from ${customerName} is ${daysOverdue} days overdue`,
      {
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: false,
        actions: [
          {
            label: 'Send Reminder',
            action: () => this.sendPaymentReminder(customerName),
            variant: 'primary',
          },
          {
            label: 'View Details',
            action: () => console.log('View payment details'),
            variant: 'secondary',
          },
        ],
      }
    );
  }

  paymentFailed(amount: number, reason: string): string {
    return this.error(
      'Payment Failed',
      `Payment of $${amount.toFixed(2)} failed: ${reason}`,
      {
        priority: NOTIFICATION_PRIORITIES.HIGH,
        actions: [
          {
            label: 'Retry Payment',
            action: () => console.log('Retry payment'),
            variant: 'primary',
          },
        ],
      }
    );
  }

  // Vehicle-specific notifications
  vehicleMaintenanceDue(vehicleId: string, maintenanceType: string): string {
    return this.warning(
      'Maintenance Due',
      `Vehicle ${vehicleId} requires ${maintenanceType}`,
      {
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        actions: [
          {
            label: 'Schedule Maintenance',
            action: () => console.log('Schedule maintenance'),
            variant: 'primary',
          },
        ],
      }
    );
  }

  vehicleReturned(vehicleId: string, customerName: string): string {
    return this.info(
      'Vehicle Returned',
      `Vehicle ${vehicleId} has been returned by ${customerName}`,
      { priority: NOTIFICATION_PRIORITIES.MEDIUM }
    );
  }

  // Rental-specific notifications
  rentalExpiringSoon(
    rentalId: string,
    customerName: string,
    daysLeft: number
  ): string {
    return this.info(
      'Rental Expiring Soon',
      `Rental ${rentalId} for ${customerName} expires in ${daysLeft} days`,
      {
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        actions: [
          {
            label: 'Contact Customer',
            action: () => console.log('Contact customer'),
            variant: 'primary',
          },
          {
            label: 'Extend Rental',
            action: () => console.log('Extend rental'),
            variant: 'secondary',
          },
        ],
      }
    );
  }

  // System notifications
  systemMaintenance(startTime: string, duration: string): string {
    return this.warning(
      'Scheduled Maintenance',
      `System maintenance scheduled for ${dateUtils.formatForDisplay(startTime)} (Duration: ${duration})`,
      {
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: false,
      }
    );
  }

  backupCompleted(timestamp: string): string {
    return this.success(
      'Backup Completed',
      `System backup completed successfully at ${dateUtils.formatForDisplay(timestamp)}`,
      { priority: NOTIFICATION_PRIORITIES.LOW }
    );
  }

  // Notification management
  remove(id: string): void {
    this.notifications.delete(id);
    this.notifyListeners();
  }

  markAsRead(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.notifyListeners();
  }

  clear(): void {
    this.notifications.clear();
    this.notifyListeners();
  }

  clearRead(): void {
    const unreadNotifications = new Map();
    this.notifications.forEach((notification, id) => {
      if (!notification.read) {
        unreadNotifications.set(id, notification);
      }
    });
    this.notifications = unreadNotifications;
    this.notifyListeners();
  }

  // Getters
  getAll(): NotificationData[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getUnread(): NotificationData[] {
    return this.getAll().filter(notification => !notification.read);
  }

  getByType(type: NotificationType): NotificationData[] {
    return this.getAll().filter(notification => notification.type === type);
  }

  getByPriority(priority: NotificationPriority): NotificationData[] {
    return this.getAll().filter(
      notification => notification.priority === priority
    );
  }

  getUnreadCount(): number {
    return this.getUnread().length;
  }

  // Subscription management
  subscribe(listener: (notifications: NotificationData[]) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  // Private methods
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultDuration(type: NotificationType): number {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return 3000;
      case NOTIFICATION_TYPES.INFO:
        return 4000;
      case NOTIFICATION_TYPES.WARNING:
        return 6000;
      case NOTIFICATION_TYPES.ERROR:
        return 0; // Don't auto-close errors
      default:
        return 4000;
    }
  }

  private notifyListeners(): void {
    const notifications = this.getAll();
    this.listeners.forEach(listener => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
        // Remove the problematic listener to prevent future errors
        this.listeners.delete(listener);
      }
    });
  }

  private sendPaymentReminder(customerName: string): void {
    // Simulate sending payment reminder
    console.log(`Sending payment reminder to ${customerName}`);
    this.info('Reminder Sent', `Payment reminder sent to ${customerName}`, {
      priority: NOTIFICATION_PRIORITIES.LOW,
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export convenience functions
export const notify = {
  success: (
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ) => notificationService.success(title, message, options),
  error: (
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ) => notificationService.error(title, message, options),
  warning: (
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ) => notificationService.warning(title, message, options),
  info: (
    title: string,
    message: string,
    options?: Omit<NotificationOptions, 'type'>
  ) => notificationService.info(title, message, options),
};
