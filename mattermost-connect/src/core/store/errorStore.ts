// src/core/store/errorStore.ts
/**
 * Error store for centralized error handling
 * Tracks application errors and provides utilities for handling them
 */
import { create } from "zustand";
import {
  AppError,
  ApiError,
  ErrorFilter,
  ErrorSeverity,
  ErrorSource,
} from "../../types/error.types";
import { v4 as uuidv4 } from "uuid";

/**
 * Error store state and actions
 */
interface ErrorStoreState {
  // State
  errors: AppError[];
  lastError: AppError | null;
  hasUnhandledError: boolean;

  // Actions
  addError: (
    error: Error | ApiError,
    source: ErrorSource,
    severity?: ErrorSeverity,
  ) => AppError;
  handleError: (errorId: string) => void;
  handleAllErrors: () => void;
  clearErrors: (filter?: ErrorFilter) => void;
  clearAllErrors: () => void;

  // Selectors
  getErrors: (filter?: ErrorFilter) => AppError[];
  getLastError: () => AppError | null;
  hasErrors: (filter?: ErrorFilter) => boolean;

  // Reset
  reset: () => void;
}

/**
 * Creates an AppError from an Error or ApiError
 */
function createAppError(
  error: Error | ApiError,
  source: ErrorSource,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
): AppError {
  const apiError = error as ApiError;

  return {
    id: uuidv4(),
    message: error.message || "Unknown error occurred",
    source,
    severity,
    timestamp: Date.now(),
    handled: false,
    stack: error.stack,
    details: apiError.data || apiError.request || null,
  };
}

/**
 * Error store for centralized error management
 */
export const useErrorStore = create<ErrorStoreState>()((set, get) => ({
  // Initial state
  errors: [],
  lastError: null,
  hasUnhandledError: false,

  /**
   * Adds an error to the store
   * @param error Error object to add
   * @param source Where the error originated
   * @param severity How critical the error is
   * @returns The created AppError
   */
  addError: (error, source, severity = ErrorSeverity.ERROR) => {
    const appError = createAppError(error, source, severity);

    set((state) => ({
      errors: [...state.errors, appError],
      lastError: appError,
      hasUnhandledError: true,
    }));

    // Log errors to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${source}] ${appError.message}`, appError);
    }

    return appError;
  },

  /**
   * Marks a specific error as handled
   * @param errorId ID of the error to mark as handled
   */
  handleError: (errorId) => {
    set((state) => {
      const updatedErrors = state.errors.map((error) =>
        error.id === errorId ? { ...error, handled: true } : error,
      );

      // Check if we still have unhandled errors
      const stillHasUnhandled = updatedErrors.some((error) => !error.handled);

      return {
        errors: updatedErrors,
        hasUnhandledError: stillHasUnhandled,
      };
    });
  },

  /**
   * Marks all errors as handled
   */
  handleAllErrors: () => {
    set((state) => ({
      errors: state.errors.map((error) => ({ ...error, handled: true })),
      hasUnhandledError: false,
    }));
  },

  /**
   * Clears errors based on filter criteria
   * @param filter Criteria to filter errors for removal
   */
  clearErrors: (filter) => {
    if (!filter) return;

    set((state) => {
      const filteredErrors = state.errors.filter((error) => {
        // If any filter criteria don't match, keep the error
        if (filter.source && error.source !== filter.source) return true;
        if (filter.severity && error.severity !== filter.severity) return true;
        if (filter.handled !== undefined && error.handled !== filter.handled)
          return true;
        if (filter.since && error.timestamp < filter.since) return true;

        // All criteria matched, filter out this error
        return false;
      });

      const lastError =
        filteredErrors.length > 0
          ? filteredErrors[filteredErrors.length - 1]
          : null;

      const hasUnhandled = filteredErrors.some((error) => !error.handled);

      return {
        errors: filteredErrors,
        lastError,
        hasUnhandledError: hasUnhandled,
      };
    });
  },

  /**
   * Clears all errors from the store
   */
  clearAllErrors: () => {
    set({
      errors: [],
      lastError: null,
      hasUnhandledError: false,
    });
  },

  /**
   * Gets errors based on filter criteria
   * @param filter Criteria to filter errors
   * @returns Filtered errors
   */
  getErrors: (filter) => {
    const { errors } = get();

    if (!filter) return errors;

    return errors.filter((error) => {
      // Only include errors that match all provided criteria
      if (filter.source && error.source !== filter.source) return false;
      if (filter.severity && error.severity !== filter.severity) return false;
      if (filter.handled !== undefined && error.handled !== filter.handled)
        return false;
      if (filter.since && error.timestamp < filter.since) return false;

      return true;
    });
  },

  /**
   * Gets the last error that occurred
   * @returns The last error or null
   */
  getLastError: () => {
    return get().lastError;
  },

  /**
   * Checks if there are errors matching the filter
   * @param filter Criteria to filter errors
   * @returns Whether matching errors exist
   */
  hasErrors: (filter) => {
    return get().getErrors(filter).length > 0;
  },

  /**
   * Resets the store to its initial state
   */
  reset: () => {
    set({
      errors: [],
      lastError: null,
      hasUnhandledError: false,
    });
  },
}));

/**
 * Utility function to create a global error handler
 * @returns Function to handle errors
 */
export function createErrorHandler() {
  const { addError } = useErrorStore.getState();

  return (
    error: Error | ApiError,
    source: ErrorSource = ErrorSource.UNKNOWN,
  ) => {
    addError(error, source);
  };
}

/**
 * Global error handler
 */
export const handleError = createErrorHandler();
