'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { logErrorBoundary } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to our logging system
    logErrorBoundary(error, {
      componentStack: errorInfo.componentStack || ''
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/fleet';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
          <Card className='w-full max-w-md'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
                <AlertTriangle className='h-6 w-6 text-red-600' />
              </div>
              <CardTitle className='text-xl font-semibold text-gray-900'>
                Something went wrong
              </CardTitle>
              <CardDescription className='text-gray-600'>
                We encountered an unexpected error. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className='rounded-md bg-red-50 p-4'>
                  <h4 className='text-sm font-medium text-red-800 mb-2'>
                    Error Details (Development Only)
                  </h4>
                  <pre className='text-xs text-red-700 whitespace-pre-wrap break-words'>
                    {this.state.error.message}
                  </pre>
                  {this.state.error.stack && (
                    <details className='mt-2'>
                      <summary className='text-xs text-red-600 cursor-pointer'>
                        Stack Trace
                      </summary>
                      <pre className='text-xs text-red-600 mt-1 whitespace-pre-wrap break-words'>
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className='flex flex-col sm:flex-row gap-3'>
                <Button
                  onClick={this.handleRetry}
                  className='flex-1 flex items-center justify-center gap-2'
                  variant='outline'
                >
                  <RefreshCw className='h-4 w-4' />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className='flex-1 flex items-center justify-center gap-2'
                >
                  <Home className='h-4 w-4' />
                  Go Home
                </Button>
              </div>

              <div className='text-center'>
                <p className='text-xs text-gray-500'>
                  If this problem persists, please contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logErrorBoundary(error, { 
      componentStack: errorInfo?.componentStack || '' 
    });
  };
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
