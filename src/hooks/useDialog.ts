import { useState, useCallback, useEffect } from 'react';

// Global store for only one dialog open at a time
let globalDialogState: {
  currentDialogId: string | null;
  listeners: Set<(dialogId: string | null) => void>;
} = {
  currentDialogId: null,
  listeners: new Set(),
};

/**
 * Hook for simplified Dialog usage
 * Encapsulates common dialog state management patterns
 * Ensures only one dialog is open at a time globally
 * 
 * @example
 * const { isOpen, openDialog, closeDialog } = useDialog();
 * 
 * <Button onClick={openDialog}>
 *   Open Dialog
 * </Button>
 * <Dialog
 *   open={isOpen}
 *   onClose={closeDialog}
 * >
 *   Dialog content
 * </Dialog>
 */
export const useDialog = (dialogId?: string) => {
  const [isOpen, setIsOpen] = useState(false);
  const finalDialogId = dialogId || `dialog-${Math.random().toString(36).substr(2, 9)}`;

  // Listen to global changes
  useEffect(() => {
    const listener = (currentDialogId: string | null) => {
      if (currentDialogId !== finalDialogId) {
        setIsOpen(false);
      }
    };

    globalDialogState.listeners.add(listener);
    return () => {
      globalDialogState.listeners.delete(listener);
    };
  }, [finalDialogId]);

  const openDialog = useCallback(() => {
    // Close all other dialogs
    globalDialogState.currentDialogId = finalDialogId;
    globalDialogState.listeners.forEach(listener => listener(finalDialogId));
    
    // Open this dialog
    setIsOpen(true);
  }, [finalDialogId]);

  const closeDialog = useCallback(() => {
    globalDialogState.currentDialogId = null;
    globalDialogState.listeners.forEach(listener => listener(null));
    
    setIsOpen(false);
  }, []);

  return {
    /** Whether the dialog is currently open */
    isOpen,
    /** Function to open the dialog */
    openDialog,
    /** Function to close the dialog - pass to Dialog onClose prop */
    closeDialog,
  };
};

export default useDialog;