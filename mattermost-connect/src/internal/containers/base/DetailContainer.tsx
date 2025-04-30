// src/internal/containers/base/DetailContainer.tsx
/**
 * Detail Container
 * Extends BaseContainer with specific functionality for detail views
 * Provides standardized handling for item fetching, actions, and states
 */
import React, { useMemo, useCallback, useEffect } from "react";
import {
  BaseContainerProps,
  useBaseContainer,
  BaseContainerState,
  BaseContainerAPI,
} from "./BaseContainer";

/**
 * Detail container options
 */
export interface DetailContainerOptions<T = any> {
  /** Whether to load data automatically on mount */
  autoLoad?: boolean;
  /** Whether to confirm before destructive actions */
  confirmDestructiveActions?: boolean;
  /** Whether to show success messages after actions */
  showActionSuccess?: boolean;
  /** Function to get item ID */
  getItemId?: (item: T) => string;
  /** Custom confirmation messages */
  confirmationMessages?: {
    delete?: string;
    update?: string;
    [key: string]: string | undefined;
  };
  /** Custom success messages */
  successMessages?: {
    update?: string;
    delete?: string;
    [key: string]: string | undefined;
  };
  /** Custom error messages */
  errorMessages?: {
    notFound?: string;
    loadFailed?: string;
    updateFailed?: string;
    deleteFailed?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Detail container props
 */
export interface DetailContainerProps<T = any> extends BaseContainerProps {
  /** Item ID to load and display */
  itemId?: string;
  /** Item data (if already available) */
  item?: T;
  /** Whether the container is in view mode or edit mode */
  editMode?: boolean;
  /** Function to load item by ID */
  onLoadItem?: (id: string) => Promise<T>;
  /** Function to update item */
  onUpdateItem?: (id: string, data: Partial<T>) => Promise<T>;
  /** Function to delete item */
  onDeleteItem?: (id: string) => Promise<void>;
  /** Callback on action complete */
  onActionComplete?: (action: string, result: any) => void;
  /** Callback when user requests edit mode */
  onEditRequest?: () => void;
  /** Callback for canceling edit mode */
  onEditCancel?: () => void;
  /** Callback after item is successfully deleted */
  onDeleteComplete?: () => void;
  /** Callback after item is successfully updated */
  onUpdateComplete?: (updatedItem: T) => void;
  /** Callback when a related tab is selected */
  onTabSelect?: (tabId: string) => void;
  /** Available actions for this item */
  availableActions?: string[];
  /** Whether to show the action bar */
  showActions?: boolean;
  /** Whether item is in a read-only state */
  readOnly?: boolean;
  /** Function to validate before update */
  validateUpdate?: (data: Partial<T>) => boolean | string;
  /** Function to format action error */
  formatActionError?: (action: string, error: Error) => string;
}

/**
 * Detail container state
 */
export interface DetailContainerState<T = any> extends BaseContainerState {
  /** Current item */
  item: T | null;
  /** Whether the item is loaded */
  isLoaded: boolean;
  /** Whether the container is in edit mode */
  isEditMode: boolean;
  /** Whether an action is being processed */
  isProcessing: boolean;
  /** Current action being processed */
  currentAction: string | null;
  /** Item ID */
  itemId: string | null;
  /** Whether item is in read-only state */
  isReadOnly: boolean;
  /** Item validation errors by field */
  validationErrors: Record<string, string>;
  /** Current active tab */
  activeTab: string | null;
  /** Whether the item was updated */
  isUpdated: boolean;
  /** Whether the item was deleted */
  isDeleted: boolean;
}

/**
 * Detail container API
 */
export interface DetailContainerAPI<T = any> extends BaseContainerAPI {
  /** Load item by ID */
  loadItem: (id?: string) => Promise<T | null>;
  /** Set the current item */
  setItem: (item: T | null) => void;
  /** Update item */
  updateItem: (data: Partial<T>) => Promise<T | null>;
  /** Delete item */
  deleteItem: () => Promise<boolean>;
  /** Perform a custom action */
  performAction: (action: string, data?: any) => Promise<any>;
  /** Start edit mode */
  startEdit: () => void;
  /** Cancel edit mode */
  cancelEdit: () => void;
  /** Validate update data */
  validateItem: (data: Partial<T>) => boolean;
  /** Set the active tab */
  setActiveTab: (tabId: string) => void;
  /** Check if an action is available */
  isActionAvailable: (action: string) => boolean;
  /** Get a map of available actions */
  getAvailableActions: () => Record<string, boolean>;
  /** Refresh the current item */
  refresh: () => Promise<T | null>;
}

/**
 * Hook for detail containers
 * Provides standardized detail view state management and functionality
 *
 * @param props - Detail container props
 * @param options - Detail container options
 * @returns Detail container state and API
 */
export function useDetailContainer<T = any>(
  props: DetailContainerProps<T>,
  options: DetailContainerOptions<T> = {},
): [DetailContainerState<T>, DetailContainerAPI<T>] {
  const {
    itemId: propItemId,
    item: propItem,
    editMode = false,
    onLoadItem,
    onUpdateItem,
    onDeleteItem,
    onActionComplete,
    onEditRequest,
    onEditCancel,
    onDeleteComplete,
    onUpdateComplete,
    onTabSelect,
    availableActions = [],
    showActions = true,
    readOnly = false,
    validateUpdate,
    formatActionError,
  } = props;

  const {
    autoLoad = true,
    confirmDestructiveActions = true,
    showActionSuccess = true,
    getItemId = (item: any) => item.id || item._id,
    confirmationMessages = {
      delete:
        "Are you sure you want to delete this item? This action cannot be undone.",
      update: "Are you sure you want to save these changes?",
    },
    successMessages = {
      update: "Item updated successfully",
      delete: "Item deleted successfully",
    },
    errorMessages = {
      notFound: "Item not found",
      loadFailed: "Failed to load item",
      updateFailed: "Failed to update item",
      deleteFailed: "Failed to delete item",
    },
  } = options;

  // Use base container hook
  const [baseState, baseAPI] = useBaseContainer(props);

  // Local state for the detail container
  const [item, setItemValue] = React.useState<T | null>(propItem || null);
  const [isEditMode, setIsEditMode] = React.useState<boolean>(editMode);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [currentAction, setCurrentAction] = React.useState<string | null>(null);
  const [activeTab, setActiveTabValue] = React.useState<string | null>(null);
  const [isUpdated, setIsUpdated] = React.useState<boolean>(false);
  const [isDeleted, setIsDeleted] = React.useState<boolean>(false);
  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, string>
  >({});

  // Track the current item ID
  const [currentItemId, setCurrentItemId] = React.useState<string | null>(
    propItemId || null,
  );

  // Update local state when prop item changes
  useEffect(() => {
    if (propItem) {
      setItemValue(propItem);
    }
  }, [propItem]);

  // Update current item ID when prop ID changes
  useEffect(() => {
    if (propItemId !== currentItemId) {
      setCurrentItemId(propItemId || null);

      // Auto-load if enabled and we have a load function
      if (autoLoad && propItemId && onLoadItem) {
        baseAPI
          .withLoading(() => onLoadItem(propItemId))
          .then((result) => {
            setItemValue(result || null);
          })
          .catch((error) => {
            baseAPI.setError(
              error instanceof Error
                ? error
                : new Error(errorMessages.loadFailed || "Failed to load item"),
            );
          });
      }
    }
  }, [
    propItemId,
    currentItemId,
    autoLoad,
    onLoadItem,
    baseAPI,
    errorMessages.loadFailed,
  ]);

  // Update edit mode when prop changes
  useEffect(() => {
    setIsEditMode(editMode);
  }, [editMode]);

  // Load item by ID
  const loadItem = useCallback(
    async (id?: string): Promise<T | null> => {
      // Use provided ID or current ID
      const itemIdToLoad = id || currentItemId;

      // Can't load without ID or load function
      if (!itemIdToLoad || !onLoadItem) {
        return null;
      }

      try {
        const result = await baseAPI.withLoading(() =>
          onLoadItem(itemIdToLoad),
        );
        setItemValue(result || null);
        setCurrentItemId(itemIdToLoad);
        return result || null;
      } catch (error) {
        baseAPI.setError(
          error instanceof Error
            ? error
            : new Error(errorMessages.loadFailed || "Failed to load item"),
        );
        return null;
      }
    },
    [currentItemId, onLoadItem, baseAPI, errorMessages.loadFailed],
  );

  // Set item
  const setItem = useCallback(
    (newItem: T | null) => {
      setItemValue(newItem);

      // Update item ID if provided
      if (newItem) {
        const id = getItemId(newItem);
        if (id) {
          setCurrentItemId(id);
        }
      }
    },
    [getItemId],
  );

  // Validate item data
  const validateItem = useCallback(
    (data: Partial<T>): boolean => {
      if (!validateUpdate) return true;

      const validationResult = validateUpdate(data);

      // If validation returns a string, it's an error message
      if (typeof validationResult === "string") {
        setValidationErrors({ _general: validationResult });
        return false;
      }

      // Clear validation errors if validation passed
      if (validationResult === true) {
        setValidationErrors({});
      }

      return !!validationResult;
    },
    [validateUpdate],
  );

  // Update item
  const updateItem = useCallback(
    async (data: Partial<T>): Promise<T | null> => {
      // Cannot update without an item, ID, or update function
      if (!item || !currentItemId || !onUpdateItem) {
        return null;
      }

      // Validate if validator is provided
      if (validateUpdate && !validateItem(data)) {
        return null;
      }

      // Confirm update if confirmation is enabled
      if (confirmDestructiveActions) {
        const shouldUpdate = await baseAPI.showConfirmation(
          "Confirm Update",
          confirmationMessages.update ||
            "Are you sure you want to save these changes?",
          { isDestructive: false },
        );

        if (!shouldUpdate) {
          return null;
        }
      }

      // Set current action
      setCurrentAction("update");
      setIsProcessing(true);

      try {
        // Perform update
        const updatedItem = await baseAPI.withLoading(() =>
          onUpdateItem!(currentItemId!, data),
        );

        // Update state
        setItemValue(updatedItem);
        setIsUpdated(true);
        setIsEditMode(false);

        // Show success message
        if (showActionSuccess) {
          baseAPI.showSuccess(
            "Success",
            successMessages.update || "Item updated successfully",
          );
        }

        // Call callback if provided
        if (onUpdateComplete) {
          onUpdateComplete(updatedItem);
        }

        // Call general action complete callback
        if (onActionComplete) {
          onActionComplete("update", updatedItem);
        }

        return updatedItem;
      } catch (error) {
        // Format error message if formatter provided
        const errorMessage = formatActionError
          ? formatActionError("update", error as Error)
          : errorMessages.updateFailed || "Failed to update item";

        // Show error
        baseAPI.setError(new Error(errorMessage));

        return null;
      } finally {
        setIsProcessing(false);
        setCurrentAction(null);
      }
    },
    [
      item,
      currentItemId,
      onUpdateItem,
      validateUpdate,
      validateItem,
      confirmDestructiveActions,
      baseAPI,
      confirmationMessages.update,
      showActionSuccess,
      successMessages.update,
      onUpdateComplete,
      onActionComplete,
      formatActionError,
      errorMessages.updateFailed,
    ],
  );

  // Delete item
  const deleteItem = useCallback(async (): Promise<boolean> => {
    // Cannot delete without an item, ID, or delete function
    if (!currentItemId || !onDeleteItem) {
      return false;
    }

    // Confirm deletion if confirmation is enabled
    if (confirmDestructiveActions) {
      const shouldDelete = await baseAPI.showConfirmation(
        "Confirm Deletion",
        confirmationMessages.delete ||
          "Are you sure you want to delete this item? This action cannot be undone.",
        { isDestructive: true },
      );

      if (!shouldDelete) {
        return false;
      }
    }

    // Set current action
    setCurrentAction("delete");
    setIsProcessing(true);

    try {
      // Perform deletion
      await baseAPI.withLoading(() => onDeleteItem!(currentItemId!));

      // Update state
      setItemValue(null);
      setIsDeleted(true);

      // Show success message
      if (showActionSuccess) {
        baseAPI.showSuccess(
          "Success",
          successMessages.delete || "Item deleted successfully",
        );
      }

      // Call callback if provided
      if (onDeleteComplete) {
        onDeleteComplete();
      }

      // Call general action complete callback
      if (onActionComplete) {
        onActionComplete("delete", null);
      }

      return true;
    } catch (error) {
      // Format error message if formatter provided
      const errorMessage = formatActionError
        ? formatActionError("delete", error as Error)
        : errorMessages.deleteFailed || "Failed to delete item";

      // Show error
      baseAPI.setError(new Error(errorMessage));

      return false;
    } finally {
      setIsProcessing(false);
      setCurrentAction(null);
    }
  }, [
    currentItemId,
    onDeleteItem,
    confirmDestructiveActions,
    baseAPI,
    confirmationMessages.delete,
    showActionSuccess,
    successMessages.delete,
    onDeleteComplete,
    onActionComplete,
    formatActionError,
    errorMessages.deleteFailed,
  ]);

  // Start edit mode
  const startEdit = useCallback(() => {
    setIsEditMode(true);

    if (onEditRequest) {
      onEditRequest();
    }
  }, [onEditRequest]);

  // Cancel edit mode
  const cancelEdit = useCallback(() => {
    setIsEditMode(false);
    setValidationErrors({});

    if (onEditCancel) {
      onEditCancel();
    }
  }, [onEditCancel]);

  // Check if an action is available
  const isActionAvailable = useCallback(
    (action: string): boolean => {
      // Check if action is in available actions list
      if (availableActions.includes(action)) {
        return true;
      }

      // Special handling for built-in actions
      if (action === "edit") {
        return !readOnly && !isEditMode && showActions;
      }

      if (action === "delete") {
        return !readOnly && showActions && !!onDeleteItem;
      }

      if (action === "update") {
        return isEditMode && !!onUpdateItem;
      }

      if (action === "cancelEdit") {
        return isEditMode;
      }

      if (action === "refresh") {
        return !!onLoadItem;
      }

      return false;
    },
    [
      availableActions,
      readOnly,
      isEditMode,
      showActions,
      onDeleteItem,
      onUpdateItem,
      onLoadItem,
    ],
  );

  // Perform custom action
  const performAction = useCallback(
    async (action: string, data?: any): Promise<any> => {
      // Check if action is available
      if (!isActionAvailable(action)) {
        return null;
      }

      // Set current action
      setCurrentAction(action);
      setIsProcessing(true);

      try {
        // Handle built-in actions
        if (action === "delete") {
          return await deleteItem();
        }

        if (action === "edit") {
          startEdit();
          return true;
        }

        if (action === "cancelEdit") {
          cancelEdit();
          return true;
        }

        if (action === "refresh") {
          return await loadItem();
        }

        // For custom actions, call the action complete callback
        if (onActionComplete) {
          const result = await onActionComplete(action, data);
          return result;
        }

        return null;
      } catch (error) {
        // Format error message if formatter provided
        const errorMessage = formatActionError
          ? formatActionError(action, error as Error)
          : `Failed to perform action: ${action}`;

        // Show error
        baseAPI.setError(new Error(errorMessage));

        return null;
      } finally {
        setIsProcessing(false);
        setCurrentAction(null);
      }
    },
    [
      isActionAvailable,
      deleteItem,
      loadItem,
      onActionComplete,
      formatActionError,
      baseAPI,
      startEdit,
      cancelEdit,
    ],
  );

  // Set active tab
  const setActiveTab = useCallback(
    (tabId: string) => {
      setActiveTabValue(tabId);

      if (onTabSelect) {
        onTabSelect(tabId);
      }
    },
    [onTabSelect],
  );

  // Get a map of available actions
  const getAvailableActions = useCallback((): Record<string, boolean> => {
    return {
      edit: isActionAvailable("edit"),
      delete: isActionAvailable("delete"),
      update: isActionAvailable("update"),
      cancelEdit: isActionAvailable("cancelEdit"),
      refresh: isActionAvailable("refresh"),
      ...availableActions.reduce(
        (acc, action) => {
          acc[action] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
    };
  }, [isActionAvailable, availableActions]);

  // Refresh the current item
  const refresh = useCallback(async (): Promise<T | null> => {
    return await loadItem();
  }, [loadItem]);

  // Create detail container state
  const detailState: DetailContainerState<T> = useMemo(
    () => ({
      ...baseState,
      item,
      isLoaded: !!item,
      isEditMode,
      isProcessing,
      currentAction,
      itemId: currentItemId,
      isReadOnly: readOnly,
      validationErrors,
      activeTab,
      isUpdated,
      isDeleted,
    }),
    [
      baseState,
      item,
      isEditMode,
      isProcessing,
      currentAction,
      currentItemId,
      readOnly,
      validationErrors,
      activeTab,
      isUpdated,
      isDeleted,
    ],
  );

  // Create detail container API
  const detailAPI: DetailContainerAPI<T> = useMemo(
    () => ({
      ...baseAPI,
      loadItem,
      setItem,
      updateItem,
      deleteItem,
      performAction,
      startEdit,
      cancelEdit,
      validateItem,
      setActiveTab,
      isActionAvailable,
      getAvailableActions,
      refresh,
    }),
    [
      baseAPI,
      loadItem,
      setItem,
      updateItem,
      deleteItem,
      performAction,
      startEdit,
      cancelEdit,
      validateItem,
      setActiveTab,
      isActionAvailable,
      getAvailableActions,
      refresh,
    ],
  );

  return [detailState, detailAPI];
}

/**
 * Detail container component
 * This is a basic implementation that can be extended by specific detail containers
 */
export const DetailContainer: React.FC<
  DetailContainerProps & {
    children?: React.ReactNode;
    render?: (
      api: DetailContainerAPI,
      state: DetailContainerState,
    ) => React.ReactNode;
  }
> = (props) => {
  const { children, render } = props;
  const [state, api] = useDetailContainer(props);

  // Either use render prop or children
  if (render) {
    return <>{render(api, state)}</>;
  }

  return <>{children}</>;
};

export default DetailContainer;
