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
  loadingIds?: string[];
}

/**
 * Standard error state
 */
export interface ErrorState {
  error: Error | null;
  errors?: Record<string, Error | null>;
}

/**
 * Severity levels for error reporting
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
 * Generic async state with loading, data, and error
 */
export interface AsyncState<T> extends LoadingState, ErrorState {
  data?: T;
  lastFetchTime?: number;
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

// --- Event system types ---

/**
 * Application event categories
 */
export enum EventCategory {
  AUTH = "auth",
  TEAM = "team",
  CHANNEL = "channel",
  MESSAGE = "message",
  USER = "user",
  UNREAD = "unread",
  WEBSOCKET = "websocket",
  REACTION = "reaction",
  SETTINGS = "settings",
  ERROR = "error",
}

/**
 * Common event types
 */
export enum EventType {
  // Auth events
  LOGIN_SUCCESS = "auth:login_success",
  LOGOUT = "auth:logout",
  SESSION_EXPIRED = "auth:session_expired",

  // Channel events
  CHANNEL_SELECTED = "channel:selected",
  CHANNEL_CREATED = "channel:created",
  CHANNEL_UPDATED = "channel:updated",
  CHANNEL_DELETED = "channel:deleted",
  CHANNEL_LEFT = "channel:left",
  CHANNEL_JOINED = "channel:joined",

  // Team events
  TEAM_SELECTED = "team:selected",
  TEAM_CREATED = "team:created",
  TEAM_UPDATED = "team:updated",
  TEAM_DELETED = "team:deleted",
  TEAM_LEFT = "team:left",
  TEAM_JOINED = "team:joined",

  // Message events
  MESSAGE_SENT = "message:sent",
  MESSAGE_RECEIVED = "message:received",
  MESSAGE_UPDATED = "message:updated",
  MESSAGE_DELETED = "message:deleted",

  // Unread events
  UNREAD_UPDATED = "unread:updated",
  UNREAD_MARKED_READ = "unread:marked_read",

  // User events
  USER_STATUS_UPDATED = "user:status_updated",
  USER_UPDATED = "user:updated",
  USER_TYPING = "user:typing",

  // Reaction events
  REACTION_ADDED = "reaction:added",
  REACTION_REMOVED = "reaction:removed",

  // WebSocket events
  WEBSOCKET_CONNECTED = "websocket:connected",
  WEBSOCKET_DISCONNECTED = "websocket:disconnected",
  WEBSOCKET_ERROR = "websocket:error",

  // Settings events
  SETTINGS_CHANGED = "settings:changed",

  // Error events
  ERROR_OCCURRED = "error:occurred",
  ERRORS_CLEARED = "error:cleared",
}

/**
 * Generic event payload interface
 */
export interface EventPayload<T = any> {
  type: EventType;
  data: T;
  timestamp: number;
  meta?: Record<string, any>;
}

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (payload: EventPayload<T>) => void;

// --- API and Query types ---

/**
 * Standard API error interface
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
