// src/internal/components/common/FormDialog.tsx
/**
 * Form Dialog Component
 * A standardized dialog for forms that can be used directly in components
 * Utilizes the DialogRenderer for consistent styling and behavior
 */
import React, { useState, useEffect } from "react";
import { BaseComponentProps } from "../../types/componentTypes";
import DialogRenderer from "./DialogRenderer";

export interface FormDialogProps<T = any> extends BaseComponentProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Title for the dialog */
  title: string;
  /** Initial data for the form */
  initialData?: T;
  /** Form component to render */
  children: React.ReactNode;
  /** Text for the submit button */
  submitText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the dialog is in a loading state */
  isLoading?: boolean;
  /** Whether to prevent closing on backdrop click */
  preventBackdropClose?: boolean;
  /** Callback when form is submitted with valid data */
  onSubmit: (data: T) => void | Promise<void>;
  /** Callback when cancel is clicked or dialog is closed */
  onCancel: () => void;
  /** Function to validate the form data (returns true if valid) */
  validate?: (data: T) => boolean;
  /** Maximum width of the dialog */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** Whether to show the close button in the title bar */
  showCloseButton?: boolean;
}

/**
 * A standardized form dialog component
 *
 * Use this component when you need to directly include a form dialog
 * in your component rather than using the useDialog hook.
 */
export function FormDialog<T = any>({
  open,
  title,
  initialData,
  children,
  submitText = "Submit",
  cancelText = "Cancel",
  isLoading = false,
  preventBackdropClose = false,
  onSubmit,
  onCancel,
  validate,
  maxWidth = "sm",
  showCloseButton = false,
  className,
  sx,
  id,
}: FormDialogProps<T>) {
  // State to track form data
  const [formData, setFormData] = useState<T | undefined>(initialData);
  // State to track if the form is valid
  const [isValid, setIsValid] = useState<boolean>(false);

  // Generate a stable dialog ID if none is provided
  const dialogId =
    id || `form-dialog-${title.toLowerCase().replace(/\s+/g, "-")}`;

  // Reset form data when the dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      setFormData(initialData);

      // Validate initial data if validate function is provided
      if (validate && initialData) {
        setIsValid(validate(initialData));
      }
    }
  }, [open, initialData, validate]);

  // Handler for form data changes
  const handleDataChange = (data: T) => {
    setFormData(data);

    // Validate data if validate function is provided
    if (validate) {
      setIsValid(validate(data));
    } else {
      // If no validate function is provided, assume data is valid
      setIsValid(true);
    }
  };

  // Handler for form submission
  const handleSubmit = async () => {
    if (formData && (isValid || !validate)) {
      await onSubmit(formData);
    }
  };

  // Clone children to pass formData and onChange handler
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // Use a type assertion to handle the prop types correctly
      return React.cloneElement(child as React.ReactElement<any>, {
        value: formData,
        onChange: handleDataChange,
        onDataChange: handleDataChange,
        initialData: initialData,
        disabled: isLoading,
      });
    }
    return child;
  });

  return (
    <DialogRenderer
      id={dialogId}
      open={open}
      title={title}
      confirmText={submitText}
      cancelText={cancelText}
      isLoading={isLoading}
      preventBackdropClose={preventBackdropClose || isLoading}
      onConfirm={handleSubmit}
      onCancel={onCancel}
      onClose={onCancel}
      maxWidth={maxWidth}
      variant="form"
      showCloseButton={showCloseButton}
      className={className}
      sx={sx}
    >
      {childrenWithProps}
    </DialogRenderer>
  );
}

export default FormDialog;
