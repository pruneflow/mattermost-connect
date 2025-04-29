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

// --- Loading and error states ---

/**
 * Standard loading state
 */
export interface LoadingState {
  isLoading: boolean;
  loadingIds: string[];
}

/**
 * Standard error state
 */
export interface ErrorState {
  error: Error | null;
  errors: Record<string, Error | null>;
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
