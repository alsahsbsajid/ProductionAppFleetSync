import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse } from '../lib/types';

export interface UseDataOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  reset: () => void;
}

export function useData<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  options: UseDataOptions = {}
): UseDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { immediate = true, onSuccess, onError } = options;

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetcher();

      if (response.success && response.data) {
        setData(response.data);
        onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'An error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetcher, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

// Specialized hooks for common data operations
export function useVehicles() {
  const { dataService } = require('../lib/data-service');
  return useData(() => dataService.vehicles.getAllVehicles());
}

export function useCustomers() {
  const { dataService } = require('../lib/data-service');
  return useData(() => dataService.customers.getAllCustomers());
}

export function useRentals() {
  const { dataService } = require('../lib/data-service');
  return useData(() => dataService.rentals.getAllRentals());
}

export function useDashboardStats() {
  const { dataService } = require('../lib/data-service');
  return useData(() => dataService.dashboard.getDashboardStats());
}

export function usePayments() {
  const { dataService } = require('../lib/data-service');
  return useData(() => dataService.payments.getAllPayments());
}

// Hook for mutations (create, update, delete operations)
export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: string, variables: TVariables) => void;
}

export interface UseMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  loading: boolean;
  error: string | null;
  data: TData | null;
  reset: () => void;
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationReturn<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onError } = options;

  const mutate = useCallback(
    async (variables: TVariables) => {
      try {
        setLoading(true);
        setError(null);

        const response = await mutationFn(variables);

        if (response.success && response.data) {
          setData(response.data);
          onSuccess?.(response.data, variables);
        } else {
          const errorMessage = response.error || 'An error occurred';
          setError(errorMessage);
          onError?.(errorMessage, variables);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        onError?.(errorMessage, variables);
      } finally {
        setLoading(false);
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    loading,
    error,
    data,
    reset,
  };
}
