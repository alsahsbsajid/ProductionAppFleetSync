// Data fetching hooks
export {
  useData,
  useVehicles,
  useCustomers,
  useRentals,
  useDashboardStats,
  usePayments,
  useMutation,
  type UseDataOptions,
  type UseDataReturn,
  type UseMutationOptions,
  type UseMutationReturn,
} from './use-data';

// Form management hooks
export {
  useForm,
  useCustomerForm,
  useVehicleForm,
  useRentalForm,
  useFieldArray,
  type UseFormOptions,
  type UseFormReturn,
  type UseFieldArrayReturn,
} from './use-form';

// Local storage hooks
export {
  useLocalStorage,
  useUserPreferences,
  useRecentSearches,
  useFormDraft,
  useViewState,
  useSessionData,
  type UseLocalStorageOptions,
  type UseLocalStorageReturn,
} from './use-local-storage';

// Notification hooks
export {
  useNotifications,
  type UseNotificationsReturn,
} from './use-notifications';
