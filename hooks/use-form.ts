import { useState, useMemo, useCallback } from 'react';

export interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Record<string, string>;
  onSubmit?: (values: T) => void | Promise<void>;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  setErrors: (errors: Record<string, string>) => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  handleChange: (field: keyof T) => (value: any) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  validateField: (field: keyof T) => void;
  validateForm: () => boolean;
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, validate, onSubmit } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = useMemo(() => {
    if (!validate) return true;
    return Object.keys(validate(values)).length === 0;
  }, [values, validate]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrorsState(prev => ({ ...prev, [field as string]: error }));
  }, []);

  const setErrors = useCallback((newErrors: Record<string, string>) => {
    setErrorsState(newErrors);
  }, []);

  const setTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [field as string]: isTouched }));
  }, []);

  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState(prev => ({ ...prev, [field]: value }));
      if (errors[field as string]) {
        const newErrors = { ...errors };
        delete newErrors[field as string];
        setErrorsState(newErrors);
      }
    },
    [errors]
  );

  const handleChange = useCallback(
    (field: keyof T) => {
      return (value: any) => {
        setValue(field, value);
      };
    },
    [setValue]
  );

  const validateField = useCallback(
    (field: keyof T) => {
      if (!validate) return;
      const fieldErrors = validate(values);
      const fieldError = fieldErrors[field as string];
      if (fieldError) {
        setError(field, fieldError);
      } else if (errors[field as string]) {
        const newErrors = { ...errors };
        delete newErrors[field as string];
        setErrorsState(newErrors);
      }
    },
    [values, validate, setError, errors]
  );

  const handleBlur = useCallback(
    (field: keyof T) => {
      return () => {
        setTouched(field, true);
        validateField(field);
      };
    },
    [setTouched, validateField]
  );

  const validateForm = useCallback(() => {
    if (!validate) return true;
    const formErrors = validate(values);
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  }, [values, validate, setErrors]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (validateForm() && onSubmit) {
        setIsSubmitting(true);
        try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
        }
      }
    },
    [validateForm, onSubmit, values]
  );

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrorsState({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setValue,
    setValues,
    setError,
    setErrors,
    setTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateField,
    validateForm,
  };
}

export interface UseFieldArrayReturn<T> {
  fields: T[];
  append: (value: T) => void;
  prepend: (value: T) => void;
  insert: (index: number, value: T) => void;
  remove: (index: number) => void;
  swap: (indexA: number, indexB: number) => void;
  move: (from: number, to: number) => void;
  update: (index: number, value: T) => void;
  replace: (values: T[]) => void;
}

export function useFieldArray<T>(
  initialValues: T[] = []
): UseFieldArrayReturn<T> {
  const [fields, setFields] = useState(initialValues);

  const append = (value: T) => {
    setFields(prev => [...prev, value]);
  };

  const prepend = (value: T) => {
    setFields(prev => [value, ...prev]);
  };

  const insert = (index: number, value: T) => {
    setFields(prev => {
      const next = [...prev];
      next.splice(index, 0, value);
      return next;
    });
  };

  const remove = (index: number) => {
    setFields(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const swap = (indexA: number, indexB: number) => {
    setFields(prev => {
      const next = [...prev];
      const a = next[indexA];
      next[indexA] = next[indexB];
      next[indexB] = a;
      return next;
    });
  };

  const move = (from: number, to: number) => {
    setFields(prev => {
      const next = [...prev];
      const item = next.splice(from, 1)[0];
      next.splice(to, 0, item);
      return next;
    });
  };

  const update = (index: number, value: T) => {
    setFields(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const replace = (values: T[]) => {
    setFields(values);
  };

  return {
    fields,
    append,
    prepend,
    insert,
    remove,
    swap,
    move,
    update,
    replace,
  };
}
