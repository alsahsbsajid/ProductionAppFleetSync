import React from 'react';
import { cn } from '@/lib/utils';

// Skeleton component for loading states
export const Skeleton = React.memo(({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
});
Skeleton.displayName = "Skeleton";

// Card skeleton for dashboard cards
export const CardSkeleton = React.memo(() => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-[60px]" />
        <Skeleton className="h-3 w-[120px]" />
      </div>
    </div>
  );
});
CardSkeleton.displayName = "CardSkeleton";

// Table skeleton for data tables
export const TableSkeleton = React.memo(({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number; 
  columns?: number; 
}) => {
  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
TableSkeleton.displayName = "TableSkeleton";

// Chart skeleton for dashboard charts
export const ChartSkeleton = React.memo(() => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
        <div className="space-y-2">
          <div className="flex items-end space-x-2 h-[200px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="flex-1" 
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
ChartSkeleton.displayName = "ChartSkeleton";

// Dashboard overview skeleton
export const DashboardOverviewSkeleton = React.memo(() => {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      
      {/* Recent Activity */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-[140px]" />
            <Skeleton className="h-4 w-[60px]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <Skeleton className="h-3 w-[60px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
DashboardOverviewSkeleton.displayName = "DashboardOverviewSkeleton";

// Vehicle list skeleton
export const VehicleListSkeleton = React.memo(() => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
});
VehicleListSkeleton.displayName = "VehicleListSkeleton";

// Customer list skeleton
export const CustomerListSkeleton = React.memo(() => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
});
CustomerListSkeleton.displayName = "CustomerListSkeleton";

// Rental list skeleton
export const RentalListSkeleton = React.memo(() => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <TableSkeleton rows={8} columns={7} />
    </div>
  );
});
RentalListSkeleton.displayName = "RentalListSkeleton";

// Form skeleton for loading forms
export const FormSkeleton = React.memo(() => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-[80px]" />
        <Skeleton className="h-10 w-[80px]" />
      </div>
    </div>
  );
});
FormSkeleton.displayName = "FormSkeleton";

// Generic loading spinner
export const LoadingSpinner = React.memo(({ 
  size = 'default',
  className 
}: {
  size?: 'small' | 'default' | 'large';
  className?: string;
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-6 w-6',
    large: 'h-8 w-8'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div 
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
          sizeClasses[size]
        )}
      />
    </div>
  );
});
LoadingSpinner.displayName = "LoadingSpinner";

// Page loading overlay
export const PageLoadingOverlay = React.memo(() => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="large" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
});
PageLoadingOverlay.displayName = "PageLoadingOverlay";

// Suspense fallback component
export const SuspenseFallback = React.memo(({ 
  type = 'default' 
}: { 
  type?: 'dashboard' | 'table' | 'form' | 'default' 
}) => {
  switch (type) {
    case 'dashboard':
      return <DashboardOverviewSkeleton />;
    case 'table':
      return <TableSkeleton />;
    case 'form':
      return <FormSkeleton />;
    default:
      return (
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </div>
      );
  }
});
SuspenseFallback.displayName = "SuspenseFallback";