// src/internal/components/common/ConfirmDialog.tsx
/**
 * Confirm Dialog Component
 * A standardized confirmation dialog that can be used directly in components
 * Utilizes the DialogRenderer for consistent styling and behavior
 */
import React from "react";
import { BaseComponentProps } from "../../types/componentTypes";
import DialogRenderer from "./DialogRenderer";

export interface ConfirmDialogProps extends BaseComponentProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Title for the dialog */
  title: string;
  /** Message content */
  message: React.ReactNode;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the confirmation action is destructive (will style accordingly) */
  isDestructive?: boolean;
  /** Whether the dialog is in a loading state */
  isLoading?: boolean;
  /** Whether to prevent closing on backdrop click */
  preventBackdropClose?: boolean;
  /** Callback when confirm is clicked */
  onConfirm: () => void | Promise<void>;
  /** Callback when cancel is clicked or dialog is closed */
  onCancel: () => void;
  /** Maximum width of the dialog */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

/**
 * A standardized confirmation dialog component
 *
 * Use this component when you need to directly include a confirmation dialog
 * in your component rather than using the useDialog hook.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
  preventBackdropClose = false,
  onConfirm,
  onCancel,
  maxWidth = "sm",
  className,
  sx,
  id,
}) => {
  // Generate a stable dialog ID if none is provided
  const dialogId =
    id || `confirm-dialog-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <DialogRenderer
      id={dialogId}
      open={open}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      isDestructive={isDestructive}
      isLoading={isLoading}
      preventBackdropClose={preventBackdropClose || isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={onCancel}
      maxWidth={maxWidth}
      variant="confirm"
      className={className}
      sx={sx}
    />
  );
};

export default ConfirmDialog;
