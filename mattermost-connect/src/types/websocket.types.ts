// types/websocket.types.ts
/**
 * Types for WebSocket related data and functions
 */

/**
 * Standard Mattermost WebSocket event types
 */
export enum WebSocketEventType {
  POSTED = "posted",
  POST_EDITED = "post_edited",
  POST_DELETED = "post_deleted",
  CHANNEL_VIEWED = "channel_viewed",
  CHANNEL_CREATED = "channel_created",
  CHANNEL_UPDATED = "channel_updated",
  CHANNEL_DELETED = "channel_deleted",
  CHANNEL_MEMBER_UPDATED = "channel_member_updated",
  USER_ADDED = "user_added",
  USER_REMOVED = "user_removed",
  USER_UPDATED = "user_updated",
  USER_ROLE_UPDATED = "user_role_updated",
  STATUS_CHANGE = "status_change",
  TYPING = "typing",
  ADDED_TO_TEAM = "added_to_team",
  LEAVE_TEAM = "leave_team",
  UPDATE_TEAM = "update_team",
  DELETE_TEAM = "delete_team",
  REACTION_ADDED = "reaction_added",
  REACTION_REMOVED = "reaction_removed",
  PREFERENCES_CHANGED = "preferences_changed",
  ALL = "*",
}

/**
 * Type for WebSocket message handlers
 */
export type MessageHandler = (data: any) => void;

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  /** Callback invoked when connection opens */
  onOpen?: () => void;
  /** Callback invoked when connection closes */
  onClose?: (event: CloseEvent) => void;
  /** Callback invoked when an error occurs */
  onError?: (event: Event) => void;
  /** Interval in ms for sending ping messages */
  pingInterval?: number;
}

/**
 * WebSocket state for the store
 */
export interface WebsocketState {
  isConnected: boolean;
  isConnecting: boolean;
  url: string | null;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  hasBeenDisconnected: boolean;
}

/**
 * WebSocket message format
 */
export interface WebSocketMessage {
  seq?: number;
  action?: string;
  data?: any;
  event?: string;
}

/**
 * Typing indicator data
 */
export interface TypingData {
  channel_id: string;
  parent_id?: string;
  user_id: string;
}
