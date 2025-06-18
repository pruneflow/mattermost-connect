import { useCallback, useRef } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { logoutUser } from '../store/slices/authSlice';
import { normalizeError, requiresReauth, isRecoverableError, logError, getErrorMessage } from '../utils/errorUtils';
import type { ServerError } from '../api/types';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  component?: string;
  action?: string;
  throwError?: boolean;
}

// Global error handler following Mattermost patterns
export const useErrorHandler = () => {
  const dispatch = useAppDispatch();

  // Store dispatch in ref to avoid useCallback dependency issues
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // Main error handler - follows Mattermost error handling pattern
  const handleError = useCallback((
    error: any,
    options: ErrorHandlerOptions = {}
  ): ServerError => {
    const {
      showToast = true,
      logError: shouldLog = true,
      component,
      action,
      throwError = false,
    } = options;

    // Normalize error to ServerError format
    const serverError = normalizeError(error, {
      operation: action,
    });

    // Log error if requested
    if (shouldLog) {
      logError(serverError, { component, action });
    }

    // Handle auth errors - logout if token invalid
    if (requiresReauth(serverError)) {
      console.warn('Authentication error detected, logging out user');
      dispatchRef.current(logoutUser());
    }

    // Show user-friendly error message
    if (showToast) {
      // In a real app, you'd show a toast/notification here
      // For now, just log to console
      const message = getErrorMessage(serverError);
      console.error('User Error:', message);
      
      // Example toast integration:
      // toast.error(message, {
      //   action: isRecoverableError(serverError) ? { label: 'Retry', onClick: retryCallback } : undefined
      // });
    }

    // Throw if requested (useful for async operations)
    if (throwError) {
      throw serverError;
    }

    return serverError;
  }, []); // No dependencies - use dispatchRef

  // Specialized handlers for different contexts
  const handleApiError = useCallback((error: any, operation: string) => {
    return handleError(error, {
      action: operation,
      component: 'API',
      logError: true,
      showToast: true,
    });
  }, [handleError]);

  const handleAsyncError = useCallback((error: any, operation: string) => {
    return handleError(error, {
      action: operation,
      logError: true,
      showToast: true,
      throwError: true, // Re-throw for async/await error handling
    });
  }, [handleError]);

  const handleComponentError = useCallback((error: any, componentName: string) => {
    return handleError(error, {
      component: componentName,
      logError: true,
      showToast: false, // Component errors usually handled by ErrorBoundary
    });
  }, [handleError]);

  // Silent error handler (for background operations)
  const handleSilentError = useCallback((error: any, context?: string) => {
    return handleError(error, {
      action: context,
      logError: true,
      showToast: false,
    });
  }, [handleError]);

  return {
    handleError,
    handleApiError,
    handleAsyncError,
    handleComponentError,
    handleSilentError,
  };
};

export default useErrorHandler;