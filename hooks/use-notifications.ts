import { useState, useEffect, useCallback } from 'react';
import {
  notificationService,
  type NotificationData,
} from '../lib/notification-service';

export interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  clearRead: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>(() =>
    notificationService.getAll()
  );

  const updateNotifications = useCallback(
    (newNotifications: NotificationData[]) => {
      setNotifications(newNotifications);
    },
    []
  );

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe(updateNotifications);

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [updateNotifications]);

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const remove = useCallback((id: string) => {
    notificationService.remove(id);
  }, []);

  const clear = useCallback(() => {
    notificationService.clear();
  }, []);

  const clearRead = useCallback(() => {
    notificationService.clearRead();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    remove,
    clear,
    clearRead,
  };
}
