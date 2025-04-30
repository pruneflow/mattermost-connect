// src/internal/components/common/AlertDialog.tsx
/**
 * Alert Dialog Component
 * A standardized alert dialog that can be used directly in components
 * Utilizes the DialogRenderer for consistent styling and behavior
 */
import React from "react";
import { BaseComponentProps } from "../../types/componentTypes";
import DialogRenderer from "./DialogRenderer";

export interface AlertDialogProps extends BaseComponentProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Title for the dialog */
  title: string;
  /** Message content */
  message: React.ReactNode;
  /** Text for the confirm button */
  confirmText?: string;
  /** Whether the dialog is in a loading state */
  isLoading?: boolean;
  /** Whether to prevent closing on backdrop click */
  preventBackdropClose?: boolean;
  /** Callback when confirm is clicked or dialog is closed */
  onClose: () => void;
  /** Maximum width of the dialog */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** Whether the alert represents an error */
  isError?: boolean;
}

/**
 * A standardized alert dialog component
 *
 * Use this component when you need to directly include an alert dialog
 * in your component rather than using the useDialog hook.
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  title,
  message,
  confirmText = "OK",
  isLoading = false,
  preventBackdropClose = false,
  onClose,
  maxWidth = "sm",
  isError = false,
  className,
  sx,
  id,
}) => {
  // Generate a stable dialog ID if none is provided
  const dialogId =
    id || `alert-dialog-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <DialogRenderer
      id={dialogId}
      open={open}
      title={title}
      message={message}
      confirmText={confirmText}
      isDestructive={isError}
      isLoading={isLoading}
      preventBackdropClose={preventBackdropClose || isLoading}
      onConfirm={onClose}
      onClose={onClose}
      maxWidth={maxWidth}
      variant="alert"
      className={className}
      sx={sx}
    />
  );
};

export default AlertDialog;
