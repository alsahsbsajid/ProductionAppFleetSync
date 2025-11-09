import { useState, useEffect, useCallback } from 'react';
import { storageUtils } from '../lib/helpers';

export interface UseLocalStorageOptions<T> {
  serializer?: {
    read: (value: string) => T;
    write: (value: T) => string;
  };
  syncAcrossTabs?: boolean;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  remove: () => void;
  reset: () => void;
}

const defaultSerializer = {
  read: (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  write: (value: any) => JSON.stringify(value),
};

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const { serializer = defaultSerializer, syncAcrossTabs = true } = options;

  const [value, setValueState] = useState<T>(() => {
    return storageUtils.get(key, defaultValue);
  });

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const valueToStore =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(value)
          : newValue;

      setValueState(valueToStore);
      storageUtils.set(key, valueToStore);
    },
    [key, value]
  );

  const remove = useCallback(() => {
    setValueState(defaultValue);
    storageUtils.remove(key);
  }, [key, defaultValue]);

  const reset = useCallback(() => {
    setValue(defaultValue);
  }, [setValue, defaultValue]);

  // Sync across tabs
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = serializer.read(e.newValue);
          setValueState(newValue);
        } catch (error) {
          console.warn('Failed to parse localStorage value:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, serializer, syncAcrossTabs]);

  return {
    value,
    setValue,
    remove,
    reset,
  };
}

// Specialized hooks for common use cases
export function useUserPreferences() {
  return useLocalStorage('user-preferences', {
    theme: 'light' as 'light' | 'dark',
    language: 'en',
    currency: 'AUD',
    dateFormat: 'dd/MM/yyyy',
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    dashboard: {
      compactMode: false,
      autoRefresh: true,
      refreshInterval: 30000,
    },
  });
}

export function useRecentSearches(maxItems = 10) {
  const { value: searches, setValue } = useLocalStorage<string[]>(
    'recent-searches',
    []
  );

  const addSearch = useCallback(
    (search: string) => {
      if (!search.trim()) return;

      setValue(prev => {
        const filtered = prev.filter(s => s !== search);
        const updated = [search, ...filtered];
        return updated.slice(0, maxItems);
      });
    },
    [setValue, maxItems]
  );

  const removeSearch = useCallback(
    (search: string) => {
      setValue(prev => prev.filter(s => s !== search));
    },
    [setValue]
  );

  const clearSearches = useCallback(() => {
    setValue([]);
  }, [setValue]);

  return {
    searches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}

export function useFormDraft<T>(formId: string, defaultValue: T) {
  const storageKey = `form-draft-${formId}`;
  const {
    value: draft,
    setValue: setDraft,
    remove,
  } = useLocalStorage(storageKey, defaultValue);

  const saveDraft = useCallback(
    (formData: T) => {
      setDraft(formData);
    },
    [setDraft]
  );

  const clearDraft = useCallback(() => {
    remove();
  }, [remove]);

  const hasDraft = useCallback(() => {
    const stored = storageUtils.get(storageKey, null);
    return stored !== null && stored !== defaultValue;
  }, [storageKey, defaultValue]);

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft,
  };
}

export function useViewState(viewId: string) {
  return useLocalStorage(`view-state-${viewId}`, {
    sortBy: '',
    sortOrder: 'asc' as 'asc' | 'desc',
    filters: {} as Record<string, any>,
    pageSize: 10,
    selectedColumns: [] as string[],
    groupBy: '',
    expandedGroups: [] as string[],
  });
}

export function useSessionData<T>(key: string, defaultValue: T) {
  const [value, setValueState] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const valueToStore =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(value)
          : newValue;

      setValueState(valueToStore);

      try {
        sessionStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn('Failed to save to sessionStorage:', error);
      }
    },
    [key, value]
  );

  const remove = useCallback(() => {
    setValueState(defaultValue);
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from sessionStorage:', error);
    }
  }, [key, defaultValue]);

  return {
    value,
    setValue,
    remove,
  };
}
