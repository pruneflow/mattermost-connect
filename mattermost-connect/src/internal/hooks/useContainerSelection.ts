// src/internal/hooks/useContainerSelection.ts
/**
 * Container selection hook
 * Provides standardized selection functionality for container components
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { SelectionProps } from "../types/componentTypes";
import { useStableCallback } from "../utils/performanceUtils";
import { createItemsById, mergeBaseProps } from "../utils/containerUtils";

/**
 * Selection mode types
 */
export type SelectionMode = "single" | "multiple" | "none";

/**
 * Selection configuration options
 */
export interface SelectionOptions<T = any> {
  /** Selection mode (default: 'multiple') */
  mode?: SelectionMode;
  /** Initially selected item IDs */
  initialSelectedIds?: string[];
  /** Whether selection is enabled (default: true) */
  enabled?: boolean;
  /** Whether to preserve selection on data changes (default: true) */
  preserveSelectionOnDataChange?: boolean;
  /** Maximum number of items that can be selected (for multiple mode) */
  maxSelectedItems?: number;
  /** ID field in data items (default: 'id') */
  idField?: string;
  /** Data items (for selection validation and filtering) */
  items?: T[];
  /** Whether to deselect when clicking an already selected item (default: false) */
  allowDeselect?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[], selectedItems?: T[]) => void;
}

/**
 * Selection state returned by the hook
 */
export interface SelectionState {
  /** Currently selected item IDs */
  selectedIds: string[];
  /** Number of selected items */
  selectedCount: number;
  /** Whether any items are selected */
  hasSelection: boolean;
  /** Whether all available items are selected */
  isAllSelected: boolean;
  /** Selection mode */
  mode: SelectionMode;
  /** Whether selection is enabled */
  enabled: boolean;
}

/**
 * Selection actions returned by the hook
 */
export interface SelectionActions {
  /** Set selected item IDs */
  setSelectedIds: (ids: string[]) => void;
  /** Toggle selection for a specific item */
  toggleSelection: (id: string) => void;
  /** Select a specific item */
  selectItem: (id: string) => void;
  /** Deselect a specific item */
  deselectItem: (id: string) => void;
  /** Select all available items */
  selectAll: () => void;
  /** Deselect all items */
  deselectAll: () => void;
  /** Check if a specific item is selected */
  isSelected: (id: string) => boolean;
  /** Reset selection to initial state */
  resetSelection: () => void;
}

/**
 * Return type for the useContainerSelection hook
 */
export interface UseSelectionResult<T = any> {
  /** Selection state */
  selectionState: SelectionState;
  /** Selection actions */
  selectionActions: SelectionActions;
  /** Standardized UI props for selection components */
  selectionProps: SelectionProps;
  /** Get selected items from data */
  getSelectedItems: () => T[];
  /** Filter items to only selected ones */
  getOnlySelected: (items: T[]) => T[];
}

/**
 * Container selection hook
 * Provides standardized selection functionality for container components
 *
 * @param options - Selection configuration options
 * @returns Selection state, actions, and UI props
 *
 * @example
 * ```tsx
 * const { selectionProps, selectionState, selectionActions, getSelectedItems } = useContainerSelection({
 *   mode: 'multiple',
 *   initialSelectedIds: ['item-1', 'item-2'],
 *   items: users,
 *   onSelectionChange: (selectedIds, selectedItems) => {
 *     console.log('Selected items:', selectedItems);
 *   }
 * });
 * ```
 */
export function useContainerSelection<T extends Record<string, any>>(
  options: SelectionOptions<T> = {},
): UseSelectionResult<T> {
  const {
    mode = "multiple",
    initialSelectedIds = [],
    enabled = true,
    preserveSelectionOnDataChange = true,
    maxSelectedItems,
    idField = "id",
    items = [],
    allowDeselect = false,
    onSelectionChange,
  } = options;

  // Initialize selection state
  const [selectedIds, setSelectedIdsInternal] = useState<string[]>(
    mode === "none" ? [] : initialSelectedIds,
  );

  // Create items by ID map for quick lookup
  const itemsById = useMemo(
    () => createItemsById(items, { idField: idField as keyof T }),
    [items, idField],
  );

  // Stable callback for selection changes
  const handleSelectionChange = useStableCallback(
    (ids: string[]) => {
      if (onSelectionChange) {
        const selectedItems = ids
          .map((id) => itemsById[id])
          .filter((item) => item !== undefined);

        onSelectionChange(ids, selectedItems);
      }
    },
    [onSelectionChange, itemsById],
  );

  // Set selected IDs with validation and callbacks
  const setSelectedIds = useCallback(
    (ids: string[]) => {
      if (!enabled || mode === "none") {
        return;
      }

      // Filter out invalid IDs
      const validIds = ids.filter(
        (id) => id && (!items.length || itemsById[id]),
      );

      // Apply selection mode constraints
      let newSelectedIds: string[];

      if (mode === "single") {
        // Single mode: take the last valid ID if multiple are provided
        newSelectedIds =
          validIds.length > 0 ? [validIds[validIds.length - 1]] : [];
      } else {
        // Multiple mode: respect maximum if defined
        newSelectedIds =
          maxSelectedItems !== undefined && validIds.length > maxSelectedItems
            ? validIds.slice(0, maxSelectedItems)
            : validIds;
      }

      setSelectedIdsInternal(newSelectedIds);
      handleSelectionChange(newSelectedIds);
    },
    [
      enabled,
      mode,
      items.length,
      itemsById,
      maxSelectedItems,
      handleSelectionChange,
    ],
  );

  // Toggle selection for a specific item
  const toggleSelection = useCallback(
    (id: string) => {
      if (!enabled || mode === "none" || !id) {
        return;
      }

      // Check if item exists if we have items data
      if (items.length > 0 && !itemsById[id]) {
        console.warn(`Cannot toggle selection for non-existent item: ${id}`);
        return;
      }

      const isCurrentlySelected = selectedIds.includes(id);

      if (mode === "single") {
        // In single mode, selecting replaces the current selection
        // but deselecting clears selection only if allowDeselect is true
        if (!isCurrentlySelected) {
          setSelectedIds([id]);
        } else if (allowDeselect) {
          setSelectedIds([]);
        }
      } else {
        // In multiple mode, toggle the selection status
        if (isCurrentlySelected) {
          setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
        } else {
          // Check if we've hit the maximum
          if (
            maxSelectedItems !== undefined &&
            selectedIds.length >= maxSelectedItems
          ) {
            console.warn(
              `Maximum selection limit (${maxSelectedItems}) reached`,
            );
            return;
          }

          setSelectedIds([...selectedIds, id]);
        }
      }
    },
    [
      enabled,
      mode,
      items.length,
      itemsById,
      selectedIds,
      allowDeselect,
      maxSelectedItems,
      setSelectedIds,
    ],
  );

  // Select a specific item
  const selectItem = useCallback(
    (id: string) => {
      if (!enabled || mode === "none" || !id) {
        return;
      }

      // Check if item exists if we have items data
      if (items.length > 0 && !itemsById[id]) {
        console.warn(`Cannot select non-existent item: ${id}`);
        return;
      }

      if (selectedIds.includes(id)) {
        // Already selected
        return;
      }

      if (mode === "single") {
        setSelectedIds([id]);
      } else {
        // Check if we've hit the maximum
        if (
          maxSelectedItems !== undefined &&
          selectedIds.length >= maxSelectedItems
        ) {
          console.warn(`Maximum selection limit (${maxSelectedItems}) reached`);
          return;
        }

        setSelectedIds([...selectedIds, id]);
      }
    },
    [
      enabled,
      mode,
      items.length,
      itemsById,
      selectedIds,
      maxSelectedItems,
      setSelectedIds,
    ],
  );

  // Deselect a specific item
  const deselectItem = useCallback(
    (id: string) => {
      if (!enabled || !id) {
        return;
      }

      if (!selectedIds.includes(id)) {
        // Not selected
        return;
      }

      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    },
    [enabled, selectedIds, setSelectedIds],
  );

  // Select all available items
  const selectAll = useCallback(() => {
    if (!enabled || mode !== "multiple") {
      return;
    }

    const allIds = items.map((item) => String(item[idField]));
    const idsToSelect =
      maxSelectedItems !== undefined
        ? allIds.slice(0, maxSelectedItems)
        : allIds;

    setSelectedIds(idsToSelect);
  }, [enabled, mode, items, idField, maxSelectedItems, setSelectedIds]);

  // Deselect all items
  const deselectAll = useCallback(() => {
    if (!enabled) {
      return;
    }

    setSelectedIds([]);
  }, [enabled, setSelectedIds]);

  // Check if a specific item is selected
  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.includes(id);
    },
    [selectedIds],
  );

  // Reset selection to initial state
  const resetSelection = useCallback(() => {
    setSelectedIds(initialSelectedIds);
  }, [initialSelectedIds, setSelectedIds]);

  // Get selected items from data
  const getSelectedItems = useCallback((): T[] => {
    return selectedIds
      .map((id) => itemsById[id])
      .filter((item): item is T => item !== undefined);
  }, [selectedIds, itemsById]);

  // Filter items to only selected ones
  const getOnlySelected = useCallback(
    (itemsToFilter: T[]): T[] => {
      if (selectedIds.length === 0) {
        return [];
      }

      const selectedIdsSet = new Set(selectedIds);
      return itemsToFilter.filter((item) =>
        selectedIdsSet.has(String(item[idField])),
      );
    },
    [selectedIds, idField],
  );

  // Validate selection on items change if preserveSelectionOnDataChange is false
  useEffect(() => {
    if (!preserveSelectionOnDataChange && items.length > 0) {
      // Filter out selected IDs that no longer exist in the items list
      const validIds = selectedIds.filter((id) => itemsById[id]);

      if (validIds.length !== selectedIds.length) {
        setSelectedIds(validIds);
      }
    }
  }, [
    preserveSelectionOnDataChange,
    items,
    selectedIds,
    itemsById,
    setSelectedIds,
  ]);

  // Calculate selection state properties
  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.length === items.length,
    [items.length, selectedIds.length],
  );

  const hasSelection = selectedIds.length > 0;
  const selectedCount = selectedIds.length;

  // Create selection state object
  const selectionState: SelectionState = useMemo(
    () => ({
      selectedIds,
      selectedCount,
      hasSelection,
      isAllSelected,
      mode,
      enabled,
    }),
    [selectedIds, selectedCount, hasSelection, isAllSelected, mode, enabled],
  );

  // Create selection actions object
  const selectionActions: SelectionActions = useMemo(
    () => ({
      setSelectedIds,
      toggleSelection,
      selectItem,
      deselectItem,
      selectAll,
      deselectAll,
      isSelected,
      resetSelection,
    }),
    [
      setSelectedIds,
      toggleSelection,
      selectItem,
      deselectItem,
      selectAll,
      deselectAll,
      isSelected,
      resetSelection,
    ],
  );

  // Create standardized UI props for selection components
  const selectionProps: SelectionProps = useMemo(
    () => ({
      selectedIds,
      mode,
      onSelectionChange: setSelectedIds,
      onToggleSelection: toggleSelection,
      onSelectItem: selectItem,
      onDeselectItem: deselectItem,
      onSelectAll: selectAll,
      onDeselectAll: deselectAll,
      isAllSelected,
      hasSelection,
      selectedCount,
      disabled: !enabled,
      allowDeselect,
      maxSelectedItems,
    }),
    [
      selectedIds,
      mode,
      setSelectedIds,
      toggleSelection,
      selectItem,
      deselectItem,
      selectAll,
      deselectAll,
      isAllSelected,
      hasSelection,
      selectedCount,
      enabled,
      allowDeselect,
      maxSelectedItems,
    ],
  );

  return {
    selectionState,
    selectionActions,
    selectionProps,
    getSelectedItems,
    getOnlySelected,
  };
}

export default useContainerSelection;
