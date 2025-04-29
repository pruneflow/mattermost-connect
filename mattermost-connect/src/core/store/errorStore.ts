// src/core/store/errorStore.ts
/**
 * Error store for centralized error management
 * Provides a global error handling system with source tracking and categorization
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import {
  AppError,
  ApiError,
  ErrorFilter,
  ErrorSeverity,
  ErrorSource,
  EventType,
  ErrorState,
} from "../../types";
import { emitEvent } from "../api/eventUtils";
import { createLoadingSlice } from "./storeUtils";

/**
 * Error store state and actions interface
 */
interface ErrorStoreState extends ErrorState {
  addError: (
    error: Error | ApiError,
    source: ErrorSource,
    severity?: ErrorSeverity,
    metadata?: Record<string, any>,
  ) => AppError;
  handleError: (errorId: string) => void;
  handleAllErrors: () => void;
  clearErrors: (filter?: ErrorFilter) => void;
  clearAllErrors: () => void;
  clearErrorsBySource: (source: ErrorSource) => void;

  // Selectors
  getErrors: (filter?: ErrorFilter) => AppError[];
  getErrorsBySource: (source: ErrorSource) => AppError[];
  getErrorsBySeverity: (severity: ErrorSeverity) => AppError[];
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
  metadata?: Record<string, any>,
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
    details: apiError.data || apiError.status || apiError.request || null,
    metadata: metadata || null,
  };
}

/**
 * Global error store implementation with Zustand and immer middleware
 */
export const useErrorStore = create<ErrorStoreState>()(
  immer((set, get) => {
    // Create standard loading slice
    const loadingSlice = createLoadingSlice<any>(set);

    return {
      // Initial state
      lastError: null,
      hasUnhandledError: false,
      errorsBySource: {
        [ErrorSource.API]: [],
        [ErrorSource.AUTH]: [],
        [ErrorSource.WEBSOCKET]: [],
        [ErrorSource.UI]: [],
        [ErrorSource.STORAGE]: [],
        [ErrorSource.UNKNOWN]: [],
      },
      errorsBySeverity: {
        [ErrorSeverity.INFO]: [],
        [ErrorSeverity.WARNING]: [],
        [ErrorSeverity.ERROR]: [],
        [ErrorSeverity.CRITICAL]: [],
      },

      // Include loading slice properties
      ...loadingSlice,

      /**
       * Adds an error to the store
       * @param error Error object to add
       * @param source Where the error originated
       * @param severity How critical the error is
       * @param metadata Additional contextual information
       * @returns The created AppError
       */
      addError: (error, source, severity = ErrorSeverity.ERROR, metadata) => {
        const appError = createAppError(error, source, severity, metadata);

        set((state) => {
          // Add to main errors array
          state.errors.push(appError);

          // Update indexes
          state.errorsBySource[source].push(appError);
          state.errorsBySeverity[severity].push(appError);

          // Update last error and unhandled state
          state.lastError = appError;
          state.hasUnhandledError = true;
        });

        // Emit error event for subscribers
        emitEvent(EventType.ERROR_OCCURRED, { error: appError });

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
          // Find the error
          const errorIndex = state.errors.findIndex(
            (error: AppError) => error.id === errorId,
          );
          if (errorIndex === -1) return;

          // Mark as handled
          state.errors[errorIndex].handled = true;

          // Update the source and severity indexed copies
          const error = state.errors[errorIndex];
          const sourceIndex = state.errorsBySource[error.source].findIndex(
            (e: AppError) => e.id === errorId,
          );
          const severityIndex = state.errorsBySeverity[
            error.severity
          ].findIndex((e: AppError) => e.id === errorId);

          if (sourceIndex !== -1) {
            state.errorsBySource[error.source][sourceIndex].handled = true;
          }

          if (severityIndex !== -1) {
            state.errorsBySeverity[error.severity][severityIndex].handled =
              true;
          }

          // Check if we still have unhandled errors
          state.hasUnhandledError = state.errors.some(
            (error: AppError) => !error.handled,
          );
        });
      },

      /**
       * Marks all errors as handled
       */
      handleAllErrors: () => {
        set((state) => {
          // Mark all errors as handled
          state.errors.forEach((error: AppError) => {
            error.handled = true;
          });

          // Update all indexed arrays
          Object.keys(state.errorsBySource).forEach((sourceKey) => {
            const source = sourceKey as ErrorSource;
            state.errorsBySource[source].forEach((error: AppError) => {
              error.handled = true;
            });
          });

          Object.keys(state.errorsBySeverity).forEach((severityKey) => {
            const severity = severityKey as ErrorSeverity;
            state.errorsBySeverity[severity].forEach((error: AppError) => {
              error.handled = true;
            });
          });

          state.hasUnhandledError = false;
        });

        emitEvent(EventType.ERRORS_CLEARED, { partial: false });
      },

      /**
       * Clears errors based on filter criteria
       * @param filter Criteria to filter errors for removal
       */
      clearErrors: (filter) => {
        if (!filter) return;

        set((state) => {
          // Filter errors based on criteria
          state.errors = state.errors.filter((error: AppError) => {
            // If any filter criteria don't match, keep the error
            if (filter.source && error.source !== filter.source) return true;
            if (filter.severity && error.severity !== filter.severity)
              return true;
            if (
              filter.handled !== undefined &&
              error.handled !== filter.handled
            )
              return true;
            if (filter.since && error.timestamp < filter.since) return true;

            // All criteria matched, filter out this error
            return false;
          });

          // Rebuild the indexes
          state.errorsBySource = {
            [ErrorSource.API]: [],
            [ErrorSource.AUTH]: [],
            [ErrorSource.WEBSOCKET]: [],
            [ErrorSource.UI]: [],
            [ErrorSource.STORAGE]: [],
            [ErrorSource.UNKNOWN]: [],
          };

          state.errorsBySeverity = {
            [ErrorSeverity.INFO]: [],
            [ErrorSeverity.WARNING]: [],
            [ErrorSeverity.ERROR]: [],
            [ErrorSeverity.CRITICAL]: [],
          };

          // Rebuild indexes with remaining errors
          state.errors.forEach((error: AppError) => {
            state.errorsBySource[error.source].push(error);
            state.errorsBySeverity[error.severity].push(error);
          });

          // Update last error and unhandled state
          state.lastError =
            state.errors.length > 0
              ? state.errors[state.errors.length - 1]
              : null;

          state.hasUnhandledError = state.errors.some(
            (error: AppError) => !error.handled,
          );
        });

        emitEvent(EventType.ERRORS_CLEARED, { partial: true, filter });
      },

      /**
       * Clears all errors from the store
       */
      clearAllErrors: () => {
        set((state) => {
          state.errors = [];
          state.lastError = null;
          state.hasUnhandledError = false;

          // Reset indexes
          state.errorsBySource = {
            [ErrorSource.API]: [],
            [ErrorSource.AUTH]: [],
            [ErrorSource.WEBSOCKET]: [],
            [ErrorSource.UI]: [],
            [ErrorSource.STORAGE]: [],
            [ErrorSource.UNKNOWN]: [],
          };

          state.errorsBySeverity = {
            [ErrorSeverity.INFO]: [],
            [ErrorSeverity.WARNING]: [],
            [ErrorSeverity.ERROR]: [],
            [ErrorSeverity.CRITICAL]: [],
          };
        });

        emitEvent(EventType.ERRORS_CLEARED, { partial: false });
      },

      /**
       * Clears all errors from a specific source
       * @param source Error source to clear
       */
      clearErrorsBySource: (source: ErrorSource) => {
        set((state) => {
          // Get error IDs to remove
          const errorIdsToRemove = new Set(
            state.errorsBySource[source].map((e: AppError) => e.id),
          );

          // Filter main errors array
          state.errors = state.errors.filter(
            (error: AppError) => !errorIdsToRemove.has(error.id),
          );

          // Clear the source array
          state.errorsBySource[source] = [];

          // Update severity indexes by filtering
          Object.keys(state.errorsBySeverity).forEach((severityKey) => {
            const severity = severityKey as ErrorSeverity;
            state.errorsBySeverity[severity] = state.errorsBySeverity[
              severity
            ].filter((error: AppError) => !errorIdsToRemove.has(error.id));
          });

          // Update last error and unhandled state
          state.lastError =
            state.errors.length > 0
              ? state.errors[state.errors.length - 1]
              : null;

          state.hasUnhandledError = state.errors.some(
            (error: AppError) => !error.handled,
          );
        });

        emitEvent(EventType.ERRORS_CLEARED, {
          partial: true,
          filter: { source },
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

        return errors.filter((error: AppError) => {
          // Only include errors that match all provided criteria
          if (filter.source && error.source !== filter.source) return false;
          if (filter.severity && error.severity !== filter.severity)
            return false;
          if (filter.handled !== undefined && error.handled !== filter.handled)
            return false;
          return !(filter.since && error.timestamp < filter.since);
        });
      },

      /**
       * Gets errors from a specific source
       * @param source Error source
       * @returns Errors from that source
       */
      getErrorsBySource: (source: ErrorSource) => {
        return get().errorsBySource[source];
      },

      /**
       * Gets errors of a specific severity
       * @param severity Error severity
       * @returns Errors of that severity
       */
      getErrorsBySeverity: (severity: ErrorSeverity) => {
        return get().errorsBySeverity[severity];
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
      hasErrors: (filter?) => {
        return get().getErrors(filter).length > 0;
      },

      /**
       * Resets the store to its initial state
       */
      reset: () => {
        set((state) => {
          state.errors = [];
          state.lastError = null;
          state.hasUnhandledError = false;
          state.errorsBySource = {
            [ErrorSource.API]: [],
            [ErrorSource.AUTH]: [],
            [ErrorSource.WEBSOCKET]: [],
            [ErrorSource.UI]: [],
            [ErrorSource.STORAGE]: [],
            [ErrorSource.UNKNOWN]: [],
          };
          state.errorsBySeverity = {
            [ErrorSeverity.INFO]: [],
            [ErrorSeverity.WARNING]: [],
            [ErrorSeverity.ERROR]: [],
            [ErrorSeverity.CRITICAL]: [],
          };
        });
      },
    };
  }),
);

/**
 * Global error handler function
 * Centralizes error handling across the application
 *
 * @param error Error or ApiError
 * @param source Where the error originated
 * @param severity How critical the error is
 * @param metadata Additional context
 * @returns The created AppError
 */
export function handleError(
  error: Error | ApiError,
  source: ErrorSource = ErrorSource.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  metadata?: Record<string, any>,
): AppError {
  return useErrorStore.getState().addError(error, source, severity, metadata);
}

/**
 * Creates an error handler scoped to a specific source
 * @param source Error source for this handler
 * @returns Function to handle errors from this source
 */
export function createErrorHandler(source: ErrorSource) {
  return (
    error: Error | ApiError,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    metadata?: Record<string, any>,
  ) => {
    return handleError(error, source, severity, metadata);
  };
}

// Pre-configured error handlers for common sources
export const handleApiError = createErrorHandler(ErrorSource.API);
export const handleAuthError = createErrorHandler(ErrorSource.AUTH);
export const handleWsError = createErrorHandler(ErrorSource.WEBSOCKET);
export const handleUiError = createErrorHandler(ErrorSource.UI);
export const handleStorageError = createErrorHandler(ErrorSource.STORAGE);
