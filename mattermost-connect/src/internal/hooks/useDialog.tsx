// src/internal/hooks/useDialog.ts
/**
 * Hook for using the dialog system
 * Provides a simple interface for showing different types of dialogs
 */
import React, { useCallback } from "react";
import {
  useDialog as useDialogContext,
  ConfirmDialogOptions,
  AlertDialogOptions,
  CustomDialogOptions,
} from "../providers/DialogProvider";

/**
 * Dialog result type for async dialog operations
 */
export interface DialogResult<T = void> {
  confirmed: boolean;
  data?: T;
}

/**
 * Form dialog options with typed result
 */
export interface FormDialogOptions<T = any>
  extends Omit<CustomDialogOptions, "onConfirm" | "onCancel"> {
  onSubmit?: (data: T) => void | Promise<void>;
  initialData?: Partial<T>;
}

/**
 * Enhanced useDialog hook that adds additional functionality
 * @returns Enhanced dialog functions
 */
export function useDialog() {
  // Get the base dialog context
  const dialogContext = useDialogContext();

  /**
   * Shows a confirmation dialog and returns a promise that resolves with the result
   * @param options Dialog configuration
   * @returns Promise that resolves when the dialog is closed
   */
  const confirmAsync = useCallback(
    (
      options: Omit<ConfirmDialogOptions, "onConfirm" | "onCancel">,
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        dialogContext.confirm({
          ...options,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    },
    [dialogContext],
  );

  /**
   * Shows an alert dialog and returns a promise that resolves when closed
   * @param options Dialog configuration
   * @returns Promise that resolves when the dialog is closed
   */
  const alertAsync = useCallback(
    (options: Omit<AlertDialogOptions, "onConfirm">): Promise<void> => {
      return new Promise((resolve) => {
        dialogContext.alert({
          ...options,
          onConfirm: () => resolve(),
        });
      });
    },
    [dialogContext],
  );

  /**
   * Shows a custom dialog with a form and returns a promise with the form data
   * @param options Dialog configuration with form
   * @returns Promise that resolves with the form data or undefined if cancelled
   */
  const formAsync = useCallback(
    <T = any,>(options: FormDialogOptions<T>): Promise<DialogResult<T>> => {
      return new Promise((resolve) => {
        let formData: T | undefined = options.initialData as T;

        // Create a component wrapper that can capture form data
        const FormWrapper = ({ children }: { children: React.ReactNode }) => {
          const handleDataChange = (data: T) => {
            formData = data;
          };

          // Clone the children and pass the data change handler and initial data
          const childrenWithProps = React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              // Use a type assertion to avoid TypeScript complaints about unknown props
              return React.cloneElement(child as React.ReactElement<any>, {
                onDataChange: handleDataChange,
                initialData: options.initialData,
              });
            }
            return child;
          });

          return <>{childrenWithProps}</>;
        };

        dialogContext.custom({
          ...options,
          component: <FormWrapper>{options.component}</FormWrapper>,
          onConfirm: () => {
            if (options.onSubmit && formData) {
              options.onSubmit(formData);
            }
            resolve({ confirmed: true, data: formData });
          },
          onCancel: () => {
            resolve({ confirmed: false });
          },
        });
      });
    },
    [dialogContext],
  );

  /**
   * Shows a destructive confirmation dialog (styled as dangerous)
   * @param options Dialog configuration
   * @returns Promise that resolves with the confirmation result
   */
  const confirmDestructiveAsync = useCallback(
    (
      options: Omit<
        ConfirmDialogOptions,
        "onConfirm" | "onCancel" | "isDestructive"
      >,
    ): Promise<boolean> => {
      return confirmAsync({
        ...options,
        isDestructive: true,
      });
    },
    [confirmAsync],
  );

  /**
   * Shows an error dialog with standardized styling
   * @param title Error title
   * @param message Error message
   * @returns Promise that resolves when the dialog is closed
   */
  const showError = useCallback(
    (title: string, message: string): Promise<void> => {
      return alertAsync({
        title,
        message,
        confirmText: "OK",
      });
    },
    [alertAsync],
  );

  /**
   * Shows a success dialog with standardized styling
   * @param title Success title
   * @param message Success message
   * @returns Promise that resolves when the dialog is closed
   */
  const showSuccess = useCallback(
    (title: string, message: string): Promise<void> => {
      return alertAsync({
        title,
        message,
        confirmText: "OK",
      });
    },
    [alertAsync],
  );

  // Extend the standard dialog context with enhanced functions
  return {
    ...dialogContext,
    confirmAsync,
    alertAsync,
    formAsync,
    confirmDestructiveAsync,
    showError,
    showSuccess,
  };
}

export default useDialog;
