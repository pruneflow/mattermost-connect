/**
 * Types for error handling
 * Comprehensive type definitions for centralized error management
 */
import { ApiError } from "./common";

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
 * Application error with additional context
 */
export interface AppError {
  /** Unique identifier for the error */
  id: string;
  /** Error message */
  message: string;
  /** Source of the error */
  source: ErrorSource;
  /** Severity level */
  severity: ErrorSeverity;
  /** Timestamp when the error occurred */
  timestamp: number;
  /** Whether the error has been handled */
  handled: boolean;
  /** Additional error details */
  details?: any;
  /** Error stack trace */
  stack?: string;
  /** Additional contextual metadata */
  metadata?: Record<string, any> | null;
}

/**
 * Error filter criteria
 */
export interface ErrorFilter {
  /** Filter by error source */
  source?: ErrorSource;
  /** Filter by error severity */
  severity?: ErrorSeverity;
  /** Filter by handled status */
  handled?: boolean;
  /** Filter by timestamp (errors since this time) */
  since?: number;
  /** Filter by text in error message */
  messageContains?: string;
}

/**
 * Error handler function type
 */
export type ErrorHandler = (
  error: Error | ApiError,
  source?: ErrorSource,
  severity?: ErrorSeverity,
  metadata?: Record<string, any>,
) => AppError;

/**
 * Source-specific error handler function type
 */
export type SourceErrorHandler = (
  error: Error | ApiError,
  severity?: ErrorSeverity,
  metadata?: Record<string, any>,
) => AppError;

/**
 * Error state for the store
 */
export interface ErrorState {
  /** List of all errors */
  errors: AppError[];
  /** Most recent error */
  lastError: AppError | null;
  /** Whether there are unhandled errors */
  hasUnhandledError: boolean;
  /** Errors organized by source */
  errorsBySource: Record<ErrorSource, AppError[]>;
  /** Errors organized by severity */
  errorsBySeverity: Record<ErrorSeverity, AppError[]>;
}

/**
 * Error event data
 */
export interface ErrorEventData {
  /** Error that occurred */
  error: AppError;
  /** Whether it's a new error */
  isNew?: boolean;
  /** Related context */
  context?: any;
}

/**
 * Error clear event data
 */
export interface ErrorClearEventData {
  /** Whether all errors were cleared */
  partial: boolean;
  /** Filter used when partially clearing */
  filter?: ErrorFilter;
}
