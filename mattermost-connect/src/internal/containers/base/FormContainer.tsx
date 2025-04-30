// src/internal/containers/base/FormContainer.tsx
/**
 * Form Container
 * Extends BaseContainer with specific functionality for forms
 * Provides standardized handling for form state, validation, and submission
 */
import React, { useMemo, useCallback, useEffect, useState } from "react";
import {
  BaseContainerProps,
  useBaseContainer,
  BaseContainerState,
  BaseContainerAPI,
} from "./BaseContainer";

/**
 * Form validation result type
 */
export type ValidationResult = boolean | string | Record<string, string> | null;

/**
 * Field validator function type
 */
export type FieldValidator<T = any> = (
  value: any,
  formData: T,
  fieldName: string,
) => ValidationResult;

/**
 * Form validator function type
 */
export type FormValidator<T = any> = (formData: T) => ValidationResult;

/**
 * Field configuration
 */
export interface FieldConfig<T = any> {
  /** Default value */
  defaultValue?: any;
  /** Whether the field is required */
  required?: boolean;
  /** Label for the field */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message for when field is required */
  requiredMessage?: string;
  /** Field-specific validator */
  validator?: FieldValidator<T>;
  /** Field type (text, number, etc.) */
  type?: string;
  /** Whether to trim string values */
  trim?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is read-only */
  readOnly?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Options for select/radio fields */
  options?: Array<{ value: any; label: string }>;
  /** Additional props for field component */
  componentProps?: Record<string, any>;
}

/**
 * Form container options
 */
export interface FormContainerOptions<T = any> {
  /** Whether to validate onBlur */
  validateOnBlur?: boolean;
  /** Whether to validate onChange */
  validateOnChange?: boolean;
  /** Whether to validate on submit */
  validateOnSubmit?: boolean;
  /** Whether to show validation errors immediately */
  showValidationImmediately?: boolean;
  /** Whether to prevent submission when form is invalid */
  preventInvalidSubmit?: boolean;
  /** Whether to reset the form after successful submission */
  resetOnSubmit?: boolean;
  /** Whether to focus the first field with error after validation */
  focusFirstError?: boolean;
  /** Whether to track dirty state of fields */
  trackDirty?: boolean;
  /** Whether to track touched state of fields */
  trackTouched?: boolean;
  /** Whether to confirm before discarding changes */
  confirmDiscardChanges?: boolean;
  /** Form-level validator */
  validator?: FormValidator<T>;
  /** Message for confirming discard changes */
  discardChangesMessage?: string;
  /** Default field configuration applied to all fields */
  defaultFieldConfig?: Partial<FieldConfig>;
}

/**
 * Form container props
 */
export interface FormContainerProps<T = any> extends BaseContainerProps {
  /** Initial data for the form */
  initialData?: Partial<T>;
  /** Field configurations */
  fields?: Record<string, FieldConfig<T>>;
  /** Form-level validator */
  validator?: FormValidator<T>;
  /** Callback on form submission */
  onSubmit?: (data: T) => Promise<any> | any;
  /** Callback on form cancel */
  onCancel?: () => void;
  /** Callback on form reset */
  onReset?: () => void;
  /** Callback when form data changes */
  onChange?: (data: T, changedFields: string[]) => void;
  /** Callback after successful submission */
  onSubmitSuccess?: (result: any, data: T) => void;
  /** Callback after submission error */
  onSubmitError?: (error: Error, data: T) => void;
  /** Callback on validation */
  onValidation?: (isValid: boolean, errors: Record<string, string>) => void;
  /** Callback when a field changes */
  onFieldChange?: (fieldName: string, value: any, isValid: boolean) => void;
  /** Callback to confirm discarding changes */
  onConfirmDiscard?: () => Promise<boolean>;
  /** Auto-focus field on mount */
  autoFocus?: string;
  /** Whether the form is read-only */
  readOnly?: boolean;
  /** Whether to validate on mount */
  validateOnMount?: boolean;
}

/**
 * Form container state
 */
export interface FormContainerState<T = any> extends BaseContainerState {
  /** Current form data */
  formData: Partial<T>;
  /** Validation errors by field */
  errors: Record<string, string>;
  /** Form is valid */
  isValid: boolean;
  /** Form is dirty (has changes) */
  isDirty: boolean;
  /** Touched fields */
  touched: Record<string, boolean>;
  /** Dirty fields */
  dirtyFields: Record<string, boolean>;
  /** Whether form was submitted */
  isSubmitted: boolean;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Submission result */
  submitResult: any;
  /** Whether form is in read-only mode */
  isReadOnly: boolean;
  /** Whether form has been initialized */
  isInitialized: boolean;
}

/**
 * Form container API
 */
export interface FormContainerAPI<T = any> extends BaseContainerAPI {
  /** Submit the form */
  submitForm: () => Promise<any>;
  /** Cancel the form */
  cancelForm: () => void;
  /** Reset the form to initial values */
  resetForm: () => void;
  /** Set a field value */
  setFieldValue: (field: keyof T & string, value: any) => void;
  /** Set multiple field values */
  setFieldValues: (values: Partial<T>) => void;
  /** Set a field error */
  setFieldError: (field: keyof T & string, error: string) => void;
  /** Clear a field error */
  clearFieldError: (field: keyof T & string) => void;
  /** Set form errors */
  setFormErrors: (errors: Record<string, string>) => void;
  /** Clear all form errors */
  clearFormErrors: () => void;
  /** Check if a field has an error */
  hasError: (field: keyof T & string) => boolean;
  /** Get a field's error message */
  getError: (field: keyof T & string) => string;
  /** Get a field's configuration */
  getFieldConfig: (field: keyof T & string) => FieldConfig<T>;
  /** Check if a field is dirty */
  isFieldDirty: (field: keyof T & string) => boolean;
  /** Check if a field has been touched */
  isFieldTouched: (field: keyof T & string) => boolean;
  /** Mark a field as touched */
  touchField: (field: keyof T & string) => void;
  /** Validate the entire form */
  validateForm: () => boolean;
  /** Validate a specific field */
  validateField: (field: keyof T & string) => boolean;
  /** Get props for a form field */
  getFieldProps: (field: keyof T & string) => Record<string, any>;
  /** Focus a specific field */
  focusField: (field: keyof T & string) => void;
}

/**
 * Hook for form containers
 * Provides standardized form state management and validation
 *
 * @param props - Form container props
 * @param options - Form container options
 * @returns Form container state and API
 */
export function useFormContainer<T = Record<string, any>>(
  props: FormContainerProps<T>,
  options: FormContainerOptions<T> = {},
): [FormContainerState<T>, FormContainerAPI<T>] {
  const {
    initialData = {} as Partial<T>,
    fields = {},
    validator: propsValidator,
    onSubmit,
    onCancel,
    onReset,
    onChange,
    onSubmitSuccess,
    onSubmitError,
    onValidation,
    onFieldChange,
    onConfirmDiscard,
    autoFocus,
    readOnly = false,
    validateOnMount = false,
  } = props;

  const {
    validateOnBlur = true,
    validateOnChange = false,
    validateOnSubmit = true,
    showValidationImmediately = false,
    preventInvalidSubmit = true,
    resetOnSubmit = false,
    focusFirstError = true,
    trackDirty = true,
    trackTouched = true,
    confirmDiscardChanges = false,
    validator: optionsValidator,
    discardChangesMessage = "You have unsaved changes. Are you sure you want to discard them?",
    defaultFieldConfig = {},
  } = options;

  // Merge validators from props and options
  const formValidator = propsValidator || optionsValidator;

  // Use base container hook
  const [baseState, baseAPI] = useBaseContainer(props);

  // Create a reference for field elements
  const fieldRefs = React.useRef<Record<string, HTMLElement>>({});

  // Form state
  const [formData, setFormData] = useState<Partial<T>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dirtyFields, setDirtyFields] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Initialize the form
  useEffect(() => {
    // Initialize with initial data
    setFormData(initialData);

    // Reset tracked states
    if (trackTouched) {
      setTouched({});
    }

    if (trackDirty) {
      setDirtyFields({});
    }

    // Validate on mount if needed
    if (validateOnMount) {
      validateEntireForm();
    }

    // Auto-focus field if specified
    if (autoFocus && !readOnly) {
      setTimeout(() => {
        focusField(autoFocus as keyof T & string);
      }, 0);
    }

    setIsInitialized(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine if form is dirty (has changes)
  const isDirty = useMemo(() => {
    if (!trackDirty) return false;
    return Object.keys(dirtyFields).length > 0;
  }, [trackDirty, dirtyFields]);

  // Determine if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Get field configuration with defaults
  const getFieldConfig = useCallback(
    (fieldName: keyof T & string): FieldConfig<T> => {
      const fieldConfig = fields[fieldName] || {};
      return {
        ...defaultFieldConfig,
        ...fieldConfig,
      };
    },
    [fields, defaultFieldConfig],
  );

  // Update field dirty state
  const updateFieldDirty = useCallback(
    (fieldName: keyof T & string, value: any) => {
      if (!trackDirty) return;

      const isValueDifferent = initialData[fieldName] !== value;

      setDirtyFields((prev) => ({
        ...prev,
        [fieldName]: isValueDifferent,
      }));
    },
    [trackDirty, initialData],
  );

  // Mark a field as touched
  const touchField = useCallback(
    (fieldName: keyof T & string) => {
      if (!trackTouched) return;

      setTouched((prev) => ({
        ...prev,
        [fieldName]: true,
      }));
    },
    [trackTouched],
  );

  // Validate a specific field
  const validateField = useCallback(
    (fieldName: keyof T & string): boolean => {
      const fieldConfig = getFieldConfig(fieldName);
      const value = formData[fieldName];
      let isValid = true;
      let errorMessage = "";

      // Required field validation
      if (
        fieldConfig.required &&
        (value === undefined || value === null || value === "")
      ) {
        isValid = false;
        errorMessage =
          fieldConfig.requiredMessage ||
          `${fieldConfig.label || fieldName} is required`;
      }

      // Field-specific validator
      if (isValid && fieldConfig.validator) {
        const validationResult = fieldConfig.validator(
          value,
          formData as T,
          fieldName,
        );

        if (validationResult === false) {
          isValid = false;
          errorMessage = `Invalid ${fieldConfig.label || fieldName}`;
        } else if (typeof validationResult === "string") {
          isValid = false;
          errorMessage = validationResult;
        }
      }

      // Update errors state
      setErrors((prev) => {
        if (isValid) {
          // Remove error if valid
          const { [fieldName]: _, ...rest } = prev;
          return rest;
        } else {
          // Set error if invalid
          return { ...prev, [fieldName]: errorMessage };
        }
      });

      // Call field change callback
      if (onFieldChange) {
        onFieldChange(fieldName, value, isValid);
      }

      return isValid;
    },
    [formData, getFieldConfig, onFieldChange],
  );

  // Validate the entire form
  const validateEntireForm = useCallback((): boolean => {
    const fieldNames = Object.keys(fields) as Array<keyof T & string>;
    const newErrors: Record<string, string> = {};
    let formIsValid = true;

    // Validate each field
    fieldNames.forEach((fieldName) => {
      if (!validateField(fieldName)) {
        formIsValid = false;
      }
    });

    // Form-level validation
    if (formIsValid && formValidator) {
      const validationResult = formValidator(formData as T);

      if (validationResult === false) {
        formIsValid = false;
        newErrors._form = "The form contains errors";
      } else if (typeof validationResult === "string") {
        formIsValid = false;
        newErrors._form = validationResult;
      } else if (validationResult && typeof validationResult === "object") {
        formIsValid = false;
        Object.assign(newErrors, validationResult);
      }

      // Update errors state with form-level errors
      if (!formIsValid) {
        setErrors((prev) => ({ ...prev, ...newErrors }));
      }
    }

    // Call validation callback
    if (onValidation) {
      onValidation(formIsValid, formIsValid ? {} : { ...errors, ...newErrors });
    }

    return formIsValid;
  }, [fields, validateField, formValidator, formData, onValidation, errors]);

  // Set a field value
  const setFieldValue = useCallback(
    (fieldName: keyof T & string, value: any) => {
      // Update form data
      setFormData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));

      // Update field dirty state
      updateFieldDirty(fieldName, value);

      // Validate on change if enabled
      if (validateOnChange) {
        validateField(fieldName);
      }

      // Call change handlers
      if (onChange) {
        const updatedData = { ...formData, [fieldName]: value } as T;
        onChange(updatedData, [fieldName]);
      }
    },
    [formData, updateFieldDirty, validateOnChange, validateField, onChange],
  );

  // Set multiple field values
  const setFieldValues = useCallback(
    (values: Partial<T>) => {
      const changedFields = Object.keys(values) as Array<keyof T & string>;

      // Update form data
      setFormData((prev) => ({
        ...prev,
        ...values,
      }));

      // Update dirty state for each field
      if (trackDirty) {
        changedFields.forEach((fieldName) => {
          updateFieldDirty(fieldName, values[fieldName]);
        });
      }

      // Validate changed fields if needed
      if (validateOnChange) {
        changedFields.forEach((fieldName) => {
          validateField(fieldName);
        });
      }

      // Call change handler
      if (onChange) {
        onChange({ ...formData, ...values } as T, changedFields);
      }
    },
    [
      formData,
      trackDirty,
      updateFieldDirty,
      validateOnChange,
      validateField,
      onChange,
    ],
  );

  // Set a field error
  const setFieldError = useCallback(
    (fieldName: keyof T & string, error: string) => {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    },
    [],
  );

  // Clear a field error
  const clearFieldError = useCallback((fieldName: keyof T & string) => {
    setErrors((prev) => {
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Set form errors
  const setFormErrors = useCallback((newErrors: Record<string, string>) => {
    setErrors(newErrors);
  }, []);

  // Clear all form errors
  const clearFormErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Check if a field has an error
  const hasError = useCallback(
    (fieldName: keyof T & string): boolean => {
      return !!errors[fieldName];
    },
    [errors],
  );

  // Get a field's error message
  const getError = useCallback(
    (fieldName: keyof T & string): string => {
      return errors[fieldName] || "";
    },
    [errors],
  );

  // Check if a field is dirty
  const isFieldDirty = useCallback(
    (fieldName: keyof T & string): boolean => {
      return !!dirtyFields[fieldName];
    },
    [dirtyFields],
  );

  // Check if a field has been touched
  const isFieldTouched = useCallback(
    (fieldName: keyof T & string): boolean => {
      return !!touched[fieldName];
    },
    [touched],
  );

  // Focus a specific field
  const focusField = useCallback((fieldName: keyof T & string) => {
    setTimeout(() => {
      const fieldRef = fieldRefs.current[fieldName];
      if (fieldRef && "focus" in fieldRef) {
        (fieldRef as HTMLElement & { focus: () => void }).focus();
      }
    }, 0);
  }, []);

  // Get props for a form field
  const getFieldProps = useCallback(
    (fieldName: keyof T & string) => {
      const fieldConfig = getFieldConfig(fieldName);
      const value = formData[fieldName];
      const error = errors[fieldName];
      const isDirtyField = isFieldDirty(fieldName);
      const isTouchedField = isFieldTouched(fieldName);

      // Handle field blur - mark as touched and validate
      const handleBlur = () => {
        touchField(fieldName);

        if (validateOnBlur) {
          validateField(fieldName);
        }
      };

      // Handle field change
      const handleChange = (e: any) => {
        let newValue: any;

        // Handle event or direct value
        if (e && e.target !== undefined) {
          // Handle different input types
          if (e.target.type === "checkbox") {
            newValue = e.target.checked;
          } else {
            newValue = e.target.value;
          }
        } else {
          newValue = e;
        }

        // Apply trimming if enabled
        if (fieldConfig.trim && typeof newValue === "string") {
          newValue = newValue.trim();
        }

        setFieldValue(fieldName, newValue);
      };

      // Generate standardized field props
      return {
        name: fieldName,
        value: value === undefined ? fieldConfig.defaultValue || "" : value,
        onChange: handleChange,
        onBlur: handleBlur,
        disabled: fieldConfig.disabled || isSubmitting || readOnly,
        readOnly: fieldConfig.readOnly || readOnly,
        required: fieldConfig.required,
        placeholder: fieldConfig.placeholder,
        label: fieldConfig.label || fieldName,
        helperText: error || fieldConfig.helperText,
        error: !!error,
        options: fieldConfig.options,
        dirty: isDirtyField,
        touched: isTouchedField,
        type: fieldConfig.type || "text",
        inputRef: (ref: HTMLElement) => {
          if (ref) {
            fieldRefs.current[fieldName] = ref;
          }
        },
        ...fieldConfig.componentProps,
      };
    },
    [
      formData,
      errors,
      isFieldDirty,
      isFieldTouched,
      isSubmitting,
      readOnly,
      getFieldConfig,
      touchField,
      validateOnBlur,
      validateField,
      setFieldValue,
    ],
  );

  // Reset the form to initial values
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
    setDirtyFields({});
    setIsSubmitted(false);
    setSubmitResult(null);

    if (onReset) {
      onReset();
    }
  }, [initialData, onReset]);

  // Cancel the form
  const cancelForm = useCallback(async () => {
    // Confirm if there are unsaved changes and confirmation is enabled
    if (isDirty && confirmDiscardChanges) {
      let shouldDiscard = false;

      // Use custom confirm handler if provided
      if (onConfirmDiscard) {
        shouldDiscard = await onConfirmDiscard();
      } else {
        // Otherwise use default confirmation
        shouldDiscard = await baseAPI.showConfirmation(
          "Unsaved Changes",
          discardChangesMessage,
          { isDestructive: true },
        );
      }

      if (!shouldDiscard) {
        return;
      }
    }

    // Call cancel handler
    if (onCancel) {
      onCancel();
    }
  }, [
    isDirty,
    confirmDiscardChanges,
    onConfirmDiscard,
    baseAPI,
    discardChangesMessage,
    onCancel,
  ]);

  // Submit the form
  const submitForm = useCallback(async () => {
    // Mark as submitted
    setIsSubmitted(true);

    // Validate if enabled for submission
    if (validateOnSubmit) {
      const isFormValid = validateEntireForm();

      if (!isFormValid && preventInvalidSubmit) {
        // Focus first error field if enabled
        if (focusFirstError) {
          const firstErrorField = Object.keys(errors)[0] as keyof T & string;
          if (firstErrorField && firstErrorField !== "_form") {
            focusField(firstErrorField);
          }
        }

        return null;
      }
    }

    // Return if no submit handler
    if (!onSubmit) {
      return null;
    }

    // Set submitting state
    setIsSubmitting(true);

    try {
      // Call submit handler
      const result = await baseAPI.withLoading(() => onSubmit(formData as T));
      setSubmitResult(result);

      // Call success handler
      if (onSubmitSuccess) {
        onSubmitSuccess(result, formData as T);
      }

      // Reset form if enabled
      if (resetOnSubmit) {
        resetForm();
      }

      return result;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));

      // Set error
      baseAPI.setError(errorObj);

      // Call error handler
      if (onSubmitError) {
        onSubmitError(errorObj, formData as T);
      }

      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateOnSubmit,
    validateEntireForm,
    preventInvalidSubmit,
    focusFirstError,
    errors,
    focusField,
    onSubmit,
    formData,
    baseAPI,
    onSubmitSuccess,
    resetOnSubmit,
    resetForm,
    onSubmitError,
  ]);

  // Create form container state
  const formState: FormContainerState<T> = useMemo(
    () => ({
      ...baseState,
      formData: formData as Partial<T>,
      errors,
      isValid,
      isDirty,
      touched,
      dirtyFields,
      isSubmitted,
      isSubmitting,
      submitResult,
      isReadOnly: readOnly,
      isInitialized,
    }),
    [
      baseState,
      formData,
      errors,
      isValid,
      isDirty,
      touched,
      dirtyFields,
      isSubmitted,
      isSubmitting,
      submitResult,
      readOnly,
      isInitialized,
    ],
  );

  // Create form container API
  const formAPI: FormContainerAPI<T> = useMemo(
    () => ({
      ...baseAPI,
      submitForm,
      cancelForm,
      resetForm,
      setFieldValue,
      setFieldValues,
      setFieldError,
      clearFieldError,
      setFormErrors,
      clearFormErrors,
      hasError,
      getError,
      getFieldConfig,
      isFieldDirty,
      isFieldTouched,
      touchField,
      validateForm: validateEntireForm,
      validateField,
      getFieldProps,
      focusField,
    }),
    [
      baseAPI,
      submitForm,
      cancelForm,
      resetForm,
      setFieldValue,
      setFieldValues,
      setFieldError,
      clearFieldError,
      setFormErrors,
      clearFormErrors,
      hasError,
      getError,
      getFieldConfig,
      isFieldDirty,
      isFieldTouched,
      touchField,
      validateEntireForm,
      validateField,
      getFieldProps,
      focusField,
    ],
  );

  return [formState, formAPI];
}

/**
 * Form container component
 * This is a basic implementation that can be extended by specific form containers
 */
export const FormContainer: React.FC<
  FormContainerProps & {
    children?: React.ReactNode;
    render?: (
      api: FormContainerAPI,
      state: FormContainerState,
    ) => React.ReactNode;
  }
> = (props) => {
  const { children, render } = props;
  const [state, api] = useFormContainer(props);

  // Either use render prop or children
  if (render) {
    return <>{render(api, state)}</>;
  }

  return <>{children}</>;
};

export default FormContainer;
