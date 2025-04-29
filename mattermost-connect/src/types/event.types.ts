/**
 * Types for event handling system
 * Provides comprehensive types for the application-wide event system
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
 * Using a namespace pattern for better organization and type safety
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
  /** Event type that was emitted */
  type: EventType;
  /** Event data specific to the event type */
  data: T;
  /** Timestamp when the event was emitted */
  timestamp: number;
  /** Optional metadata for additional context */
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
  /** Map of event handlers by event type */
  handlers: Record<string, Set<EventHandler>>;
  /** Most recent events by type */
  lastEvents: Record<string, EventPayload>;
}

/**
 * Event data interfaces for specific event types
 */

export interface AuthEventData {
  user?: any;
  timestamp: number;
  reason?: string;
}

export interface ChannelEventData {
  channel: any;
  teamId?: string;
  userId?: string;
}

export interface MessageEventData {
  message: any;
  channelId: string;
  userId?: string;
}

export interface UserEventData {
  user?: any;
  userId?: string;
  status?: string;
  previousStatus?: string;
}

export interface WebSocketEventData {
  isConnected?: boolean;
  code?: number;
  reason?: string;
  timestamp: number;
  reconnected?: boolean;
  error?: Error;
}

export interface UnreadEventData {
  channelId?: string;
  teamId?: string;
  unreadCount?: any;
}

export interface SettingsEventData {
  setting: string;
  value?: any;
  key?: string;
  reset?: boolean;
}
