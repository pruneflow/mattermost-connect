/**
 * Common type definitions shared across different domains
 * Provides reusable interfaces and utility types
 */

// --- Common entity interfaces ---

/**
 * Base interface for entities with an ID
 */
export interface WithId {
  id: string;
}

/**
 * Base interface for entities with timestamps
 */
export interface WithTimestamps {
  create_at: number;
  update_at: number;
  delete_at?: number;
}

/**
 * Base entity interface combining ID and timestamps
 */
export interface Entity extends WithId, WithTimestamps {}

// Import error types for CommonState
import { AppError, ErrorSource, ErrorSeverity } from "./error.types";

/**
 * Common state interface for all stores
 * Provides standardized state management for all stores
 */
export interface CommonState {
  // Loading state
  isLoading: boolean;
  loadingIds: string[];

  // Error handling
  error: Error | null;
  errors: AppError[];
  errorMap?: Record<string, Error | null>;
  lastError: AppError | null;
  hasUnhandledError: boolean;
  errorsBySource: Record<ErrorSource, AppError[]>;
  errorsBySeverity: Record<ErrorSeverity, AppError[]>;

  // Timestamps and caching
  lastUpdated: number;
  lastFetchTimes: Record<string, number>;
}

/**
 * Interface for common slice actions
 */
export interface CommonSliceActions {
  setLoading: (isLoading: boolean) => void;
  setLoadingId: (id: string, isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setErrorForId: (id: string, error: Error | null) => void;
  updateLastFetchTime: (id: string) => void;
  reset: () => void;
}

// --- Loading state ---

/**
 * Standard loading state
 * @deprecated Use CommonState instead
 */
export interface LoadingState {
  isLoading: boolean;
  loadingIds: string[];
}

// --- Store state interfaces ---

/**
 * Base interface for Zustand store states
 */
export interface StoreState {
  lastUpdated?: number;
}

/**
 * Base interface for store actions
 */
export interface StoreActions {
  reset: () => void;
}

// --- API and Query types ---

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  page?: number;
  perPage?: number;
  after?: string;
  before?: string;
  since?: number;
}

/**
 * Standard query result
 */
export interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<T>;
}

/**
 * Standard mutation result
 */
export interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data?: TData;
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
