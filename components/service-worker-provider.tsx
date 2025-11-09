'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useServiceWorker } from '@/lib/service-worker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCacheSize } from '@/lib/service-worker';
import { Wifi, WifiOff, Download, RefreshCw, Trash2, X } from 'lucide-react';

interface ServiceWorkerContextType {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  cacheSize: number;
  updateAvailable: boolean;
  register: () => Promise<void>;
  update: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | null>(null);

export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error('useServiceWorkerContext must be used within a ServiceWorkerProvider');
  }
  return context;
}

// Update notification component
function UpdateNotification({ 
  onUpdate, 
  onDismiss 
}: { 
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Update Available
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            A new version of the app is available.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={onUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Offline notification component
function OfflineNotification() {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardContent className="flex items-center space-x-3 p-4">
          <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              You're offline
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Some features may be limited
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Service worker status component
export function ServiceWorkerStatus() {
  const {
    isSupported,
    isRegistered,
    isOnline,
    cacheSize,
    updateAvailable,
    register,
    update,
    clearCache
  } = useServiceWorkerContext();

  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await register();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await update();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    setIsLoading(true);
    try {
      await clearCache();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Service Worker</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="destructive">Not Supported</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center space-x-2">
          <span>Service Worker</span>
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-orange-500" />
          )}
        </CardTitle>
        <CardDescription>
          Caching and offline functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Status:</span>
          <Badge variant={isRegistered ? 'default' : 'secondary'}>
            {isRegistered ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Network:</span>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Cache Size:</span>
          <span className="text-sm font-mono">
            {formatCacheSize(cacheSize)}
          </span>
        </div>
        
        {updateAvailable && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Update:</span>
            <Badge variant="outline" className="text-blue-600">
              Available
            </Badge>
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          {!isRegistered && (
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Enable Offline Mode
            </Button>
          )}
          
          {updateAvailable && (
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Update App
            </Button>
          )}
          
          {cacheSize > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearCache}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Cache
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main provider component
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const serviceWorker = useServiceWorker();
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);

  // Auto-register service worker in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !serviceWorker.isRegistered) {
      serviceWorker.register().catch((error) => {
        console.error('Failed to auto-register service worker:', error);
      });
    }
  }, [serviceWorker]);

  // Show update notification
  useEffect(() => {
    if (serviceWorker.updateAvailable) {
      setShowUpdateNotification(true);
    }
  }, [serviceWorker.updateAvailable]);

  // Show offline notification
  useEffect(() => {
    if (!serviceWorker.isOnline) {
      setShowOfflineNotification(true);
      const timer = setTimeout(() => {
        setShowOfflineNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineNotification(false);
    }
  }, [serviceWorker.isOnline]);

  const handleUpdate = async () => {
    try {
      await serviceWorker.skipWaiting();
    } catch (error) {
      console.error('Failed to update service worker:', error);
    } finally {
      setShowUpdateNotification(false);
    }
  };

  const contextValue: ServiceWorkerContextType = {
    isSupported: serviceWorker.isSupported,
    isRegistered: serviceWorker.isRegistered,
    isOnline: serviceWorker.isOnline,
    cacheSize: serviceWorker.cacheSize,
    updateAvailable: serviceWorker.updateAvailable,
    register: serviceWorker.register,
    update: serviceWorker.update,
    clearCache: serviceWorker.clearCache
  };

  return (
    <ServiceWorkerContext.Provider value={contextValue}>
      {children}
      
      {/* Update notification */}
      {showUpdateNotification && (
        <UpdateNotification
          onUpdate={handleUpdate}
          onDismiss={() => setShowUpdateNotification(false)}
        />
      )}
      
      {/* Offline notification */}
      {showOfflineNotification && <OfflineNotification />}
    </ServiceWorkerContext.Provider>
  );
}