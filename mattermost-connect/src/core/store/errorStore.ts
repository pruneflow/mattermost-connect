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
  ErrorState,
  EventType,
  LoadingState,
} from "../../types";
import { emitEvent } from "../api/eventUtils";
import { createLoadingSlice } from "./storeUtils";

/**
 * Enhanced error store state with actions
 */
interface ErrorStoreState extends ErrorState, LoadingState {
  // Actions - Error Management
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

  // Selectors - Error Retrieval
  getErrors: (filter?: ErrorFilter) => AppError[];
  getErrorsBySource: (source: ErrorSource) => AppError[];
  getErrorsBySeverity: (severity: ErrorSeverity) => AppError[];
  getLastError: () => AppError | null;
  hasErrors: (filter?: ErrorFilter) => boolean;
  getUnhandledErrors: () => AppError[];

  setLoading: (isLoading: boolean) => void;
  setLoadingId: (id: string, isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setErrorForId: (id: string, error: Error | null) => void;

  // Reset
  reset: () => void;
}

/**
 * Initial state for the error store
 */
const initialState: ErrorState = {
  errors: [],
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
  error: null,
};

/**
 * Creates an AppError from an Error or ApiError
 * @param error Original error
 * @param source Error source
 * @param severity Error severity
 * @param metadata Additional context
 * @returns Structured AppError
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
 * Error store implementation with Zustand and immer middleware
 */
export const useErrorStore = create<ErrorStoreState>()(
  immer((set, get) => {
    // Create standard loading slice
    const loadingSlice = createLoadingSlice<ErrorStoreState>(set);

    // Note: loadingSlice contient déjà les champs errors, errorsBySource, etc.
    // car nous avons corrigé le createLoadingSlice dans storeUtils.ts

    return {
      // Initial state
      ...initialState,

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
      addError: (
        error: Error | ApiError,
        source: ErrorSource = ErrorSource.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        metadata?: Record<string, any>,
      ): AppError => {
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

          // Set the main error property
          state.error = error;
        });

        // Emit error event for subscribers
        emitEvent(EventType.ERROR_OCCURRED, {
          error: appError,
          isNew: true,
        });

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
      handleError: (errorId: string): void => {
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
      handleAllErrors: (): void => {
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

        // Emit event for subscribers
        emitEvent(EventType.ERRORS_CLEARED, { partial: false });
      },

      /**
       * Clears errors based on filter criteria
       * @param filter Criteria to filter errors for removal
       */
      clearErrors: (filter?: ErrorFilter): void => {
        if (!filter) {
          get().clearAllErrors();
          return;
        }

        set((state) => {
          // Keep track of removed errors for index cleanup
          const removedErrorIds = new Set<string>();

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
            if (
              filter.messageContains &&
              !error.message.includes(filter.messageContains)
            )
              return true;

            // All criteria matched, mark for removal
            removedErrorIds.add(error.id);
            return false;
          });

          // Rebuild the indexes if there were removals
          if (removedErrorIds.size > 0) {
            // Remove from source indexes
            Object.keys(state.errorsBySource).forEach((sourceKey) => {
              const source = sourceKey as ErrorSource;
              state.errorsBySource[source] = state.errorsBySource[
                source
              ].filter((error: AppError) => !removedErrorIds.has(error.id));
            });

            // Remove from severity indexes
            Object.keys(state.errorsBySeverity).forEach((severityKey) => {
              const severity = severityKey as ErrorSeverity;
              state.errorsBySeverity[severity] = state.errorsBySeverity[
                severity
              ].filter((error: AppError) => !removedErrorIds.has(error.id));
            });

            // Update last error and unhandled state
            state.lastError =
              state.errors.length > 0
                ? state.errors[state.errors.length - 1]
                : null;

            state.hasUnhandledError = state.errors.some(
              (error: AppError) => !error.handled,
            );

            // Reset main error if all errors are cleared
            if (state.errors.length === 0) {
              state.error = null;
            }
          }
        });

        // Emit event for subscribers
        emitEvent(EventType.ERRORS_CLEARED, {
          partial: true,
          filter,
        });
      },

      /**
       * Clears all errors from the store
       */
      clearAllErrors: (): void => {
        set((state) => {
          // Reset to initial state
          state.errors = [];
          state.lastError = null;
          state.hasUnhandledError = false;
          state.error = null;

          // Reset indexes
          Object.keys(state.errorsBySource).forEach((sourceKey) => {
            const source = sourceKey as ErrorSource;
            state.errorsBySource[source] = [];
          });

          Object.keys(state.errorsBySeverity).forEach((severityKey) => {
            const severity = severityKey as ErrorSeverity;
            state.errorsBySeverity[severity] = [];
          });
        });

        // Emit event for subscribers
        emitEvent(EventType.ERRORS_CLEARED, { partial: false });
      },

      /**
       * Clears all errors from a specific source
       * @param source Error source to clear
       */
      clearErrorsBySource: (source: ErrorSource): void => {
        set((state) => {
          // Get error IDs to remove
          const errorIdsToRemove = new Set(
            state.errorsBySource[source].map((e: AppError) => e.id),
          );

          // Skip if no errors to remove
          if (errorIdsToRemove.size === 0) return;

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

          // Reset main error if all errors are cleared
          if (state.errors.length === 0) {
            state.error = null;
          }
        });

        // Emit event for subscribers
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
      getErrors: (filter?: ErrorFilter): AppError[] => {
        const { errors } = get();

        if (!filter) return errors;

        return errors.filter((error: AppError) => {
          // Only include errors that match all provided criteria
          if (filter.source && error.source !== filter.source) return false;
          if (filter.severity && error.severity !== filter.severity)
            return false;
          if (filter.handled !== undefined && error.handled !== filter.handled)
            return false;
          if (filter.since && error.timestamp < filter.since) return false;
          if (
            filter.messageContains &&
            !error.message.includes(filter.messageContains)
          )
            return false;

          return true;
        });
      },

      /**
       * Gets errors from a specific source
       * @param source Error source
       * @returns Errors from that source
       */
      getErrorsBySource: (source: ErrorSource): AppError[] => {
        return get().errorsBySource[source];
      },

      /**
       * Gets errors of a specific severity
       * @param severity Error severity
       * @returns Errors of that severity
       */
      getErrorsBySeverity: (severity: ErrorSeverity): AppError[] => {
        return get().errorsBySeverity[severity];
      },

      /**
       * Gets the last error that occurred
       * @returns The last error or null
       */
      getLastError: (): AppError | null => {
        return get().lastError;
      },

      /**
       * Gets all unhandled errors
       * @returns List of unhandled errors
       */
      getUnhandledErrors: (): AppError[] => {
        return get().errors.filter((error: AppError) => !error.handled);
      },

      /**
       * Checks if there are errors matching the filter
       * @param filter Criteria to filter errors
       * @returns Whether matching errors exist
       */
      hasErrors: (filter?: ErrorFilter): boolean => {
        return get().getErrors(filter).length > 0;
      },

      /**
       * Resets the store to its initial state
       */
      reset: (): void => {
        set((state) => {
          // Reset to initial state
          Object.assign(state, initialState);

          // Reset loading state
          state.isLoading = false;
          state.loadingIds = [];
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
  ): AppError => {
    return handleError(error, source, severity, metadata);
  };
}

// Pre-configured error handlers for common sources
export const handleApiError = createErrorHandler(ErrorSource.API);
export const handleAuthError = createErrorHandler(ErrorSource.AUTH);
export const handleWsError = createErrorHandler(ErrorSource.WEBSOCKET);
export const handleUiError = createErrorHandler(ErrorSource.UI);
export const handleStorageError = createErrorHandler(ErrorSource.STORAGE);
