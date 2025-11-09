'use client';

// Service Worker registration and management

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

// Check if service workers are supported
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

// Register service worker
export async function registerServiceWorker(config: ServiceWorkerConfig = {}): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available
            console.log('New content is available; please refresh.');
            config.onUpdate?.(registration);
          } else {
            // Content is cached for offline use
            console.log('Content is cached for offline use.');
            config.onSuccess?.(registration);
          }
        }
      });
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    config.onError?.(error as Error);
    return null;
  }
}

// Unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

// Update service worker
export async function updateServiceWorker(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('Service Worker update triggered');
    }
  } catch (error) {
    console.error('Service Worker update failed:', error);
  }
}

// Skip waiting and activate new service worker
export async function skipWaiting(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.error('Skip waiting failed:', error);
  }
}

// Cache specific URLs
export async function cacheUrls(urls: string[]): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({
        type: 'CACHE_URLS',
        urls
      });
    }
  } catch (error) {
    console.error('Cache URLs failed:', error);
  }
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  } catch (error) {
    console.error('Clear cache failed:', error);
  }
}

// Get cache size
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) {
    return 0;
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Get cache size failed:', error);
    return 0;
  }
}

// Format cache size for display
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check if app is running in standalone mode (PWA)
export function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     (window.navigator as any).standalone === true)
  );
}

// Check if app can be installed (PWA)
export function canInstallPWA(): boolean {
  return typeof window !== 'undefined' && 'beforeinstallprompt' in window;
}

// Service worker status
export function getServiceWorkerStatus(): string {
  if (!isServiceWorkerSupported()) {
    return 'not-supported';
  }

  if (!navigator.serviceWorker.controller) {
    return 'not-registered';
  }

  return 'active';
}

// Network status
export function getNetworkStatus(): 'online' | 'offline' {
  return typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';
}

// Listen to network status changes
export function onNetworkStatusChange(callback: (status: 'online' | 'offline') => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback('online');
  const handleOffline = () => callback('offline');

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Preload critical resources
export async function preloadCriticalResources(): Promise<void> {
  const criticalUrls = [
    '/',
    '/vehicles',
    '/customers',
    '/rentals',
    '/api/dashboard/stats'
  ];

  await cacheUrls(criticalUrls);
}

// Service worker hook for React components
import { useState, useEffect } from 'react';

interface UseServiceWorkerReturn {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  cacheSize: number;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cacheSize, setCacheSize] = useState(0);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Initial network status
    setIsOnline(getNetworkStatus() === 'online');

    // Listen to network changes
    const unsubscribe = onNetworkStatusChange(setIsOnline);

    // Check if service worker is already registered
    if (isServiceWorkerSupported()) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setIsRegistered(true);
          setRegistration(reg);
        }
      }).catch((error) => {
        console.warn('Failed to get service worker registration:', error);
      });
    }

    // Update cache size
    getCacheSize().then(setCacheSize).catch((error) => {
      console.warn('Failed to get cache size:', error);
    });

    return unsubscribe;
  }, []);

  const register = async () => {
    const reg = await registerServiceWorker({
      onUpdate: () => setUpdateAvailable(true),
      onSuccess: (reg) => {
        setIsRegistered(true);
        setRegistration(reg);
      }
    });
    
    if (reg) {
      setRegistration(reg);
      setIsRegistered(true);
    }
  };

  const unregister = async () => {
    const result = await unregisterServiceWorker();
    if (result) {
      setIsRegistered(false);
      setRegistration(null);
    }
  };

  const update = async () => {
    await updateServiceWorker();
    const newCacheSize = await getCacheSize();
    setCacheSize(newCacheSize);
  };

  const handleSkipWaiting = async () => {
    await skipWaiting();
    setUpdateAvailable(false);
  };

  const clearCache = async () => {
    await clearAllCaches();
    setCacheSize(0);
  };

  return {
    isSupported: isServiceWorkerSupported(),
    isRegistered,
    isOnline,
    cacheSize,
    registration,
    updateAvailable,
    register,
    unregister,
    update,
    skipWaiting: handleSkipWaiting,
    clearCache
  };
}