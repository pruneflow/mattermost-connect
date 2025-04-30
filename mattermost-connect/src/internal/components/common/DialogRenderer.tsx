// src/internal/components/common/DialogRenderer.tsx
/**
 * Dialog Renderer Component
 * Provides a standardized way to render various types of dialogs
 * This component is used by the DialogProvider but can also be used independently
 */
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Paper,
  Box,
  IconButton,
  Typography,
  Slide,
  useTheme,
  alpha,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";

// Slide up transition for dialogs
const SlideUpTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Possible variants for the dialog
export type DialogVariant =
  | "standard"
  | "alert"
  | "confirm"
  | "form"
  | "fullscreen"
  | "drawer";

// Base props for the dialog
export interface DialogRendererProps {
  /** Unique identifier for the dialog */
  id: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Title for the dialog */
  title: string;
  /** Content/message for the dialog */
  message?: React.ReactNode;
  /** Custom component to render as dialog content */
  children?: React.ReactNode;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when confirm button is clicked */
  onConfirm?: () => void | Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Whether to prevent closing on backdrop click */
  preventBackdropClose?: boolean;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the confirmation action is destructive */
  isDestructive?: boolean;
  /** Whether the dialog is in a loading state */
  isLoading?: boolean;
  /** Maximum width of the dialog */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** Whether the dialog should take up the full width */
  fullWidth?: boolean;
  /** Dialog variant */
  variant?: DialogVariant;
  /** Whether to show close button in the title */
  showCloseButton?: boolean;
  /** Custom classes for styling */
  className?: string;
  /** Custom styles with MUI's sx prop */
  sx?: any;
}

/**
 * Dialog Renderer Component
 * Renders different types of dialogs with consistent styling and behavior
 */
export const DialogRenderer: React.FC<DialogRendererProps> = ({
  id,
  open,
  title,
  message,
  children,
  onClose,
  onConfirm,
  onCancel,
  preventBackdropClose = false,
  confirmText = "OK",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
  maxWidth = "sm",
  fullWidth = true,
  variant = "standard",
  showCloseButton = false,
  className,
  sx,
}) => {
  const theme = useTheme();
  const [localLoading, setLocalLoading] = useState(false);
  const isProcessing = isLoading || localLoading;

  // Handle dialog confirmation with loading state
  const handleConfirm = async () => {
    if (!onConfirm) {
      onClose();
      return;
    }

    try {
      setLocalLoading(true);
      await Promise.resolve(onConfirm());
      onClose();
    } catch (error) {
      console.error("Error in dialog confirmation:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  // Handle dialog cancellation
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = () => {
    if (!preventBackdropClose && !isProcessing) {
      handleCancel();
    }
  };

  // Determine if we should use transition based on variant
  const useTransition = variant !== "drawer" && variant !== "fullscreen";

  // Computed style based on variant
  const computedSx = {
    ...(variant === "fullscreen" && {
      "& .MuiDialog-paper": {
        m: 0,
        maxHeight: "100%",
        height: "100%",
        maxWidth: "100% !important",
        width: "100%",
        borderRadius: 0,
      },
    }),
    ...(variant === "drawer" && {
      "& .MuiDialog-paper": {
        position: "fixed",
        bottom: 0,
        right: 0,
        m: 0,
        maxWidth: { xs: "100%", sm: 400 },
        width: "100%",
        maxHeight: "80vh",
        borderTopLeftRadius: theme.shape.borderRadius,
        borderTopRightRadius: theme.shape.borderRadius,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      },
    }),
    ...(isDestructive && {
      "& .MuiDialogTitle-root": {
        backgroundColor: alpha(theme.palette.error.main, 0.1),
      },
    }),
    ...(sx || {}),
  };

  // Determine if we should show the cancel button
  const showCancelButton =
    variant === "confirm" ||
    variant === "form" ||
    (variant === "standard" && onCancel);

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick") {
          handleBackdropClick();
        }
      }}
      aria-labelledby={`dialog-title-${id}`}
      aria-describedby={message ? `dialog-description-${id}` : undefined}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      TransitionComponent={useTransition ? SlideUpTransition : undefined}
      className={className}
      sx={computedSx}
    >
      <DialogTitle id={`dialog-title-${id}`}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="span">
            {title}
          </Typography>
          {showCloseButton && (
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleCancel}
              aria-label="close"
              disabled={isProcessing}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {message && (
          <DialogContentText id={`dialog-description-${id}`}>
            {message}
          </DialogContentText>
        )}
        {children}
      </DialogContent>

      {(onConfirm || onCancel) && (
        <DialogActions>
          {showCancelButton && (
            <Button
              onClick={handleCancel}
              color="inherit"
              disabled={isProcessing}
            >
              {cancelText}
            </Button>
          )}

          {onConfirm && (
            <Button
              onClick={handleConfirm}
              color={isDestructive ? "error" : "primary"}
              variant="contained"
              disabled={isProcessing}
              startIcon={
                isProcessing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {confirmText}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default DialogRenderer;
