// Mattermost-compliant error handling utilities
import type { ServerError } from '../api/types';
import { store } from '../store';
import { logoutUser } from '../store/slices/authSlice';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  component?: string;
  action?: string;
  throwError?: boolean;
}

// Error ID patterns following Mattermost convention
export const ErrorIds = {
  // Team errors
  TEAM_NOT_FOUND: 'api.team.get_team.app_error',
  TEAM_CREATE_FAILED: 'api.team.create_team.app_error',
  TEAM_UPDATE_FAILED: 'api.team.update_team.app_error',
  TEAM_DELETE_FAILED: 'api.team.delete_team.app_error',
  TEAM_JOIN_FAILED: 'api.team.join_team.app_error',
  TEAM_LEAVE_FAILED: 'api.team.leave_team.app_error',
  
  // Channel errors
  CHANNEL_NOT_FOUND: 'api.channel.get_channel.app_error',
  CHANNEL_CREATE_FAILED: 'api.channel.create_channel.app_error',
  CHANNEL_UPDATE_FAILED: 'api.channel.update_channel.app_error',
  CHANNEL_DELETE_FAILED: 'api.channel.delete_channel.app_error',
  CHANNEL_JOIN_FAILED: 'api.channel.join_channel.app_error',
  CHANNEL_LEAVE_FAILED: 'api.channel.leave_channel.app_error',
  
  // User errors
  USER_NOT_FOUND: 'api.user.get_user.app_error',
  USER_UPDATE_FAILED: 'api.user.update_user.app_error',
  USER_STATUS_UPDATE_FAILED: 'api.user.update_status.app_error',
  
  // Auth errors
  LOGIN_FAILED: 'api.user.login.app_error',
  LOGOUT_FAILED: 'api.user.logout.app_error',
  TOKEN_INVALID: 'api.user.check_user_session.app_error',
  UNAUTHORIZED: 'api.context.permissions.app_error',
  
  // Generic errors
  NETWORK_ERROR: 'api.request.network.app_error',
  UNKNOWN_ERROR: 'api.request.unknown.app_error',
  VALIDATION_ERROR: 'api.request.validation.app_error',
} as const;

// Error message templates following Mattermost pattern
export const ErrorMessages = {
  [ErrorIds.TEAM_NOT_FOUND]: 'Team not found',
  [ErrorIds.TEAM_CREATE_FAILED]: 'Failed to create team',
  [ErrorIds.TEAM_UPDATE_FAILED]: 'Failed to update team',
  [ErrorIds.TEAM_DELETE_FAILED]: 'Failed to delete team',
  [ErrorIds.TEAM_JOIN_FAILED]: 'Failed to join team',
  [ErrorIds.TEAM_LEAVE_FAILED]: 'Failed to leave team',
  
  [ErrorIds.CHANNEL_NOT_FOUND]: 'Channel not found',
  [ErrorIds.CHANNEL_CREATE_FAILED]: 'Failed to create channel',
  [ErrorIds.CHANNEL_UPDATE_FAILED]: 'Failed to update channel',
  [ErrorIds.CHANNEL_DELETE_FAILED]: 'Failed to delete channel',
  [ErrorIds.CHANNEL_JOIN_FAILED]: 'Failed to join channel',
  [ErrorIds.CHANNEL_LEAVE_FAILED]: 'Failed to leave channel',
  
  [ErrorIds.USER_NOT_FOUND]: 'User not found',
  [ErrorIds.USER_UPDATE_FAILED]: 'Failed to update user',
  [ErrorIds.USER_STATUS_UPDATE_FAILED]: 'Failed to update status',
  
  [ErrorIds.LOGIN_FAILED]: 'Login failed',
  [ErrorIds.LOGOUT_FAILED]: 'Logout failed',
  [ErrorIds.TOKEN_INVALID]: 'Session expired',
  [ErrorIds.UNAUTHORIZED]: 'You do not have permission to perform this action',
  
  [ErrorIds.NETWORK_ERROR]: 'Network connection error',
  [ErrorIds.UNKNOWN_ERROR]: 'An unexpected error occurred',
  [ErrorIds.VALIDATION_ERROR]: 'Invalid request data',
} as const;

// Create Mattermost-compliant ServerError
export const createServerError = (
  server_error_id: string,
  message?: string,
  status_code?: number,
  url?: string,
  stack?: string
): ServerError => {
  return {
    server_error_id,
    message: message || ErrorMessages[server_error_id as keyof typeof ErrorMessages] || 'Unknown error',
    status_code,
    url,
    stack,
  };
};

// Parse and normalize errors to ServerError format
export const normalizeError = (error: any, context?: { url?: string; operation?: string }): ServerError => {
  // If already a ServerError, return as-is
  if (error && typeof error === 'object' && error.server_error_id) {
    return error as ServerError;
  }
  
  // Handle different error types
  if (error?.response) {
    // HTTP response error
    const { status, data, config } = error.response;
    const url = context?.url || config?.url;
    
    if (data && data.server_error_id) {
      // Mattermost API error response
      return {
        server_error_id: data.server_error_id,
        message: data.message || data.detailed_error || 'Server error',
        status_code: status,
        url,
        stack: error.stack,
      };
    }
    
    // Generic HTTP error
    const errorId = getErrorIdFromStatus(status, context?.operation);
    return createServerError(errorId, `HTTP ${status} Error`, status, url, error.stack);
  }
  
  // Network error
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network')) {
    return createServerError(ErrorIds.NETWORK_ERROR, error.message, undefined, context?.url, error.stack);
  }
  
  // Generic error
  return createServerError(
    ErrorIds.UNKNOWN_ERROR,
    error?.message || 'An unexpected error occurred',
    undefined,
    context?.url,
    error?.stack
  );
};

// Map HTTP status codes to appropriate error IDs
const getErrorIdFromStatus = (status: number, operation?: string): string => {
  switch (status) {
    case 401:
      return ErrorIds.UNAUTHORIZED;
    case 404:
      if (operation?.includes('team')) return ErrorIds.TEAM_NOT_FOUND;
      if (operation?.includes('channel')) return ErrorIds.CHANNEL_NOT_FOUND;
      if (operation?.includes('user')) return ErrorIds.USER_NOT_FOUND;
      return ErrorIds.UNKNOWN_ERROR;
    case 403:
      return ErrorIds.UNAUTHORIZED;
    case 400:
      return ErrorIds.VALIDATION_ERROR;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorIds.UNKNOWN_ERROR;
    default:
      return ErrorIds.UNKNOWN_ERROR;
  }
};

// Check if error is recoverable (user can retry)
export const isRecoverableError = (error: ServerError): boolean => {
  const recoverableErrorIds = [
    ErrorIds.NETWORK_ERROR,
    ErrorIds.UNKNOWN_ERROR,
  ];
  
  const recoverableStatusCodes = [500, 502, 503, 504];
  
  return (
    (error.server_error_id && recoverableErrorIds.includes(error.server_error_id as any)) ||
    (error.status_code !== undefined && recoverableStatusCodes.includes(error.status_code))
  );
};

// Check if error requires re-authentication
export const requiresReauth = (error: ServerError): boolean => {
  return (
    error.server_error_id === ErrorIds.TOKEN_INVALID ||
    error.status_code === 401
  );
};

// Get user-friendly error message
export const getErrorMessage = (error: ServerError): string => {
  return error.message || (error.server_error_id && ErrorMessages[error.server_error_id as keyof typeof ErrorMessages]) || 'An error occurred';
};

// Optional error tracker for host application
let errorTracker: ((error: ServerError, context?: Record<string, any>) => void) | null = null;

// Configure optional error tracking (host app responsibility)
export const configureErrorTracking = (tracker: (error: ServerError, context?: Record<string, any>) => void) => {
  errorTracker = tracker;
};

// Log error following Mattermost pattern - minimal implementation
export const logError = (error: ServerError, context?: { component?: string; action?: string }) => {
  const logData = {
    error_id: error.server_error_id,
    message: error.message,
    status_code: error.status_code,
    url: error.url,
    component: context?.component,
    action: context?.action,
    timestamp: new Date().toISOString(),
  };
  
  // Error logged internally
  
  // Optional: let host app handle error tracking
  if (errorTracker) {
    try {
      errorTracker(error, logData);
    } catch (trackingError) {
      // Error tracking failed
    }
  }
};

