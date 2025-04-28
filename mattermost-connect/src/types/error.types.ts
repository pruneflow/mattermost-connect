// types/error.types.ts
/**
 * Types for error handling
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Error source categories
 */
export enum ErrorSource {
  API = "api",
  AUTH = "auth",
  WEBSOCKET = "websocket",
  UI = "ui",
  STORAGE = "storage",
  UNKNOWN = "unknown",
}

/**
 * API Error extended from Error
 */
export interface ApiError extends Error {
  status?: number;
  data?: any;
  request?: {
    url: string;
    method: string;
  };
}

/**
 * Application error with additional context
 */
export interface AppError {
  id: string;
  message: string;
  source: ErrorSource;
  severity: ErrorSeverity;
  timestamp: number;
  details?: any;
  handled?: boolean;
  stack?: string;
}

/**
 * Error state for the store
 */
export interface ErrorState {
  errors: AppError[];
  lastError: AppError | null;
  hasUnhandledError: boolean;
}

/**
 * Error handler function type
 */
export type ErrorHandler = (error: Error | ApiError) => void;

/**
 * Error filter criteria
 */
export interface ErrorFilter {
  source?: ErrorSource;
  severity?: ErrorSeverity;
  handled?: boolean;
  since?: number;
}
