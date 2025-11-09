'use client';

import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

// Global error handler for unhandled promise rejections and errors
export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Enhanced logging for debugging
      console.group('🚨 Unhandled Promise Rejection');
      console.error('Reason:', event.reason);
      console.error('Reason type:', typeof event.reason);
      console.error('Reason constructor:', event.reason?.constructor?.name);
      
      // Special handling for Event objects
      if (event.reason instanceof Event) {
        console.error('Event type:', event.reason.type);
        console.error('Event target:', event.reason.target);
        console.error('Event currentTarget:', event.reason.currentTarget);
        console.error('Event bubbles:', event.reason.bubbles);
        console.error('Event cancelable:', event.reason.cancelable);
        console.error('Event defaultPrevented:', event.reason.defaultPrevented);
        console.error('Event timeStamp:', event.reason.timeStamp);
        
        // Try to get more context about where this Event came from
        if (event.reason.target) {
          console.error('Target element:', event.reason.target);
          console.error('Target tagName:', (event.reason.target as any)?.tagName);
          console.error('Target id:', (event.reason.target as any)?.id);
          console.error('Target className:', (event.reason.target as any)?.className);
        }
        
        // Log the call stack to help identify the source
        console.error('Call stack when Event was thrown:', new Error().stack);
      }
      
      console.error('Stack trace:', event.reason?.stack);
      console.error('Current URL:', window.location.href);
      console.error('Timestamp:', new Date().toISOString());
      console.groupEnd();
      
      // Prevent the default browser behavior (logging to console)
      event.preventDefault();
      
      // Show user-friendly error message
      const errorMessage = getErrorMessage(event.reason);
      
      // Only show toast for non-network errors to avoid spam
      if (!isNetworkError(event.reason)) {
        // Don't show toast for Event objects as they're usually not user-facing errors
        if (!(event.reason instanceof Event)) {
          toast({
            title: 'Application Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
      
      // Log to error reporting service in production
      if (process.env.NODE_ENV === 'production') {
        // You can integrate with services like Sentry, LogRocket, etc.
        logErrorToService(event.reason, 'unhandled_promise_rejection');
      }
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      
      const errorMessage = getErrorMessage(event.error);
      
      // Only show toast for critical errors
      if (isCriticalError(event.error)) {
        toast({
          title: 'Critical Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      // Log to error reporting service in production
      if (process.env.NODE_ENV === 'production') {
        logErrorToService(event.error, 'uncaught_error');
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null; // This component doesn't render anything
}

// Helper function to extract meaningful error messages
function getErrorMessage(error: any): string {
  // Handle null, undefined, or empty objects
  if (error === null || error === undefined) {
    return 'An unknown error occurred (null/undefined)';
  }
  
  if (typeof error === 'string') {
    return error || 'An empty error message';
  }
  
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred';
  }
  
  // Handle Event objects that are thrown as errors
  if (error instanceof Event) {
    return `Event error: ${error.type} event occurred${error.target ? ` on ${error.target.constructor.name}` : ''}`;
  }
  
  if (error && typeof error === 'object') {
    // Check if it's an empty object
    if (Object.keys(error).length === 0) {
      return 'An empty error object was thrown';
    }
    
    // Handle API errors
    if (error.message) {
      return error.message;
    }
    
    // Handle fetch errors
    if (error.status && error.statusText) {
      return `${error.status}: ${error.statusText}`;
    }
    
    // Handle Supabase errors
    if (error.error_description) {
      return error.error_description;
    }
    
    // Handle generic objects
    try {
      const errorStr = JSON.stringify(error);
      return errorStr === '{}' ? 'An empty error object was thrown' : errorStr;
    } catch {
      return 'An unexpected error occurred';
    }
  }
  
  return `An unexpected error occurred (type: ${typeof error})`;
}

// Check if error is network-related
function isNetworkError(error: any): boolean {
  const networkErrorMessages = [
    'fetch',
    'network',
    'connection',
    'timeout',
    'cors',
    'net::',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
  ];
  
  const errorString = String(error).toLowerCase();
  return networkErrorMessages.some(msg => errorString.includes(msg));
}

// Check if error is critical and should be shown to user
function isCriticalError(error: any): boolean {
  const criticalErrorMessages = [
    'chunk',
    'module',
    'script',
    'syntax',
    'reference',
    'type',
  ];
  
  const errorString = String(error).toLowerCase();
  return criticalErrorMessages.some(msg => errorString.includes(msg));
}

// Log error to external service (placeholder)
function logErrorToService(error: any, type: string): void {
  // In a real application, you would send this to your error reporting service
  // Examples: Sentry, LogRocket, Bugsnag, etc.
  
  const errorData = {
    type,
    error: {
      message: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    },
  };
  
  // Example: Send to your logging endpoint
  // fetch('/api/errors', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(errorData),
  // }).catch(() => {
  //   // Silently fail if logging fails
  // });
  
  console.log('Error logged:', errorData);
}