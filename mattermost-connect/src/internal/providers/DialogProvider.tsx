// src/internal/providers/DialogProvider.tsx
/**
 * Dialog Provider
 * Provides a centralized management system for dialogs in the application
 * Eliminates duplicate dialog definitions and offers a consistent API
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  ReactNode,
  useMemo,
} from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  CircularProgress,
} from "@mui/material";

// Types for the dialog system
export interface DialogConfig {
  id: string;
  type: "confirm" | "alert" | "form" | "custom";
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  preventBackdropClose?: boolean;
  component?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

// State for the dialog reducer
interface DialogState {
  dialogs: DialogConfig[];
  isProcessing: boolean;
}

// Actions for the dialog reducer
type DialogAction =
  | { type: "OPEN_DIALOG"; dialog: DialogConfig }
  | { type: "CLOSE_DIALOG"; id: string }
  | { type: "CLOSE_ALL_DIALOGS" }
  | { type: "SET_PROCESSING"; isProcessing: boolean };

// Dialog context interface
interface DialogContextValue {
  openDialog: (dialog: Omit<DialogConfig, "id">) => string;
  closeDialog: (id: string) => void;
  closeAllDialogs: () => void;
  confirm: (options: ConfirmDialogOptions) => string;
  alert: (options: AlertDialogOptions) => string;
  custom: (options: CustomDialogOptions) => string;
}

// Options for confirm dialog shorthand
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  preventBackdropClose?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

// Options for alert dialog shorthand
export interface AlertDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  isLoading?: boolean;
  onConfirm?: () => void | Promise<void>;
  preventBackdropClose?: boolean;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

// Options for custom dialog shorthand
export interface CustomDialogOptions {
  title: string;
  component: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  preventBackdropClose?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

// Create the dialog context
const DialogContext = createContext<DialogContextValue | undefined>(undefined);

// Initial state for the reducer
const initialState: DialogState = {
  dialogs: [],
  isProcessing: false,
};

// Dialog reducer for state management
function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "OPEN_DIALOG":
      return {
        ...state,
        dialogs: [...state.dialogs, action.dialog],
      };
    case "CLOSE_DIALOG":
      return {
        ...state,
        dialogs: state.dialogs.filter((dialog) => dialog.id !== action.id),
      };
    case "CLOSE_ALL_DIALOGS":
      return {
        ...state,
        dialogs: [],
      };
    case "SET_PROCESSING":
      return {
        ...state,
        isProcessing: action.isProcessing,
      };
    default:
      return state;
  }
}

// Counter for generating unique dialog IDs
let dialogCounter = 0;

/**
 * Dialog Provider Component
 * Manages the state of all dialogs in the application
 */
export const DialogProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(dialogReducer, initialState);

  // Generate a unique ID for a new dialog
  const generateDialogId = useCallback(() => {
    return `dialog-${++dialogCounter}`;
  }, []);

  // Open a new dialog
  const openDialog = useCallback(
    (dialog: Omit<DialogConfig, "id">) => {
      const id = generateDialogId();
      dispatch({ type: "OPEN_DIALOG", dialog: { ...dialog, id } });
      return id;
    },
    [generateDialogId],
  );

  // Close a specific dialog
  const closeDialog = useCallback((id: string) => {
    dispatch({ type: "CLOSE_DIALOG", id });
  }, []);

  // Close all dialogs
  const closeAllDialogs = useCallback(() => {
    dispatch({ type: "CLOSE_ALL_DIALOGS" });
  }, []);

  // Set processing state (e.g., for async operations)
  const setProcessing = useCallback((isProcessing: boolean) => {
    dispatch({ type: "SET_PROCESSING", isProcessing });
  }, []);

  // Shorthand for confirmation dialogs
  const confirm = useCallback(
    (options: ConfirmDialogOptions) => {
      return openDialog({
        type: "confirm",
        ...options,
      });
    },
    [openDialog],
  );

  // Shorthand for alert dialogs
  const alert = useCallback(
    (options: AlertDialogOptions) => {
      return openDialog({
        type: "alert",
        ...options,
        cancelText: undefined,
      });
    },
    [openDialog],
  );

  // Shorthand for custom dialogs
  const custom = useCallback(
    (options: CustomDialogOptions) => {
      return openDialog({
        type: "custom",
        ...options,
      });
    },
    [openDialog],
  );

  // Handle confirmation with automatic processing state
  const handleConfirm = useCallback(
    async (dialog: DialogConfig) => {
      try {
        if (dialog.onConfirm) {
          setProcessing(true);
          await Promise.resolve(dialog.onConfirm());
        }
      } catch (error) {
        console.error("Error in dialog confirmation:", error);
      } finally {
        setProcessing(false);
        closeDialog(dialog.id);
      }
    },
    [closeDialog, setProcessing],
  );

  // Handle dialog cancellation
  const handleCancel = useCallback(
    (dialog: DialogConfig) => {
      if (dialog.onCancel) {
        dialog.onCancel();
      }
      closeDialog(dialog.id);
    },
    [closeDialog],
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (dialog: DialogConfig) => {
      if (!dialog.preventBackdropClose && !state.isProcessing) {
        handleCancel(dialog);
      }
    },
    [handleCancel, state.isProcessing],
  );

  // Memoize the context value to prevent unnecessary renders
  const contextValue = useMemo(
    () => ({
      openDialog,
      closeDialog,
      closeAllDialogs,
      confirm,
      alert,
      custom,
    }),
    [openDialog, closeDialog, closeAllDialogs, confirm, alert, custom],
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {/* Render all active dialogs */}
      {state.dialogs.map((dialog) => (
        <Dialog
          key={dialog.id}
          open={true}
          onClose={(_, reason) => {
            if (reason === "backdropClick") {
              handleBackdropClick(dialog);
            }
          }}
          aria-labelledby={`dialog-title-${dialog.id}`}
          aria-describedby={`dialog-description-${dialog.id}`}
          maxWidth={dialog.maxWidth || "sm"}
          fullWidth
        >
          <DialogTitle id={`dialog-title-${dialog.id}`}>
            {dialog.title}
          </DialogTitle>

          <DialogContent>
            {dialog.type === "custom"
              ? // Render custom component
                dialog.component
              : // Render standard message
                dialog.message && (
                  <DialogContentText id={`dialog-description-${dialog.id}`}>
                    {dialog.message}
                  </DialogContentText>
                )}
          </DialogContent>

          <DialogActions>
            {/* Cancel button for dialogs that support it */}
            {(dialog.type === "confirm" || dialog.type === "custom") &&
              dialog.cancelText !== undefined && (
                <Button
                  onClick={() => handleCancel(dialog)}
                  color="inherit"
                  disabled={state.isProcessing || dialog.isLoading}
                >
                  {dialog.cancelText || "Cancel"}
                </Button>
              )}

            {/* Confirm button */}
            <Button
              onClick={() => handleConfirm(dialog)}
              color={dialog.isDestructive ? "error" : "primary"}
              variant="contained"
              disabled={state.isProcessing || dialog.isLoading}
              startIcon={
                state.isProcessing || dialog.isLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {dialog.confirmText || "OK"}
            </Button>
          </DialogActions>
        </Dialog>
      ))}
    </DialogContext.Provider>
  );
};

/**
 * Hook to use the dialog context
 * @returns Dialog context value for opening and managing dialogs
 * @throws Error if used outside of DialogProvider
 */
export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);

  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider");
  }

  return context;
}
