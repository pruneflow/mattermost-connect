/**
 * Types for event handling system
 */

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

/**
 * Event state for the store
 */
export interface EventState {
  handlers: Record<string, Set<EventHandler>>;
  lastEvents: Record<string, EventPayload>;
}
