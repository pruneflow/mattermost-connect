import { store } from '../store';
import { logoutUser } from '../store/slices/authSlice';
import { normalizeError, requiresReauth, getErrorMessage, logError } from '../utils/errorUtils';
import type { ServerError } from '../api/types';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  component?: string;
  action?: string;
  throwError?: boolean;
}

// Main error handler with direct store access
export const handleError = (
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

  // Normalize error to ServerError format (pure function)
  const serverError = normalizeError(error, {
    operation: action,
  });

  // Log error if requested (pure function)
  if (shouldLog) {
    logError(serverError, { component, action });
  }

  // Handle auth errors - logout if token invalid (store access)
  if (requiresReauth(serverError)) {
    store.dispatch(logoutUser());
  }

  // Show user-friendly error message
  if (showToast) {
    const message = getErrorMessage(serverError);
  }

  // Throw if requested (useful for async operations)
  if (throwError) {
    throw serverError;
  }

  return serverError;
};

// Specialized error handlers with direct store access
export const handleApiError = (error: any, operation: string) => {
  return handleError(error, {
    action: operation,
    component: 'API',
    logError: true,
    showToast: true,
  });
};

export const handleAsyncError = (error: any, operation: string) => {
  return handleError(error, {
    action: operation,
    logError: true,
    showToast: true,
    throwError: true,
  });
};

export const handleComponentError = (error: any, componentName: string) => {
  return handleError(error, {
    component: componentName,
    logError: true,
    showToast: false,
  });
};

export const handleSilentError = (error: any, context?: string) => {
  return handleError(error, {
    action: context,
    logError: true,
    showToast: false,
  });
};