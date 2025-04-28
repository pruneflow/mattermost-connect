/**
 * WebSocket related type definitions
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
  CHANNEL_MARKED_READ = "channel_marked_read",
  TEAM_MARKED_READ = "team_marked_read",
  ALL = "*",
}

/**
 * WebSocket message handler type
 */
export type MessageHandler<T = any> = (data: T) => void;

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
  /** Max reconnect attempts before giving up */
  maxReconnectAttempts?: number;
  /** Base delay for reconnect attempts in ms */
  reconnectDelay?: number;
}

/**
 * WebSocket message format
 */
export interface WebSocketMessage {
  seq?: number;
  action?: string;
  data?: any;
  event?: string;
  broadcast?: {
    omit_users?: null | string[];
    user_id?: string;
    channel_id?: string;
    team_id?: string;
  };
}

/**
 * Typing indicator data from WebSocket
 */
export interface TypingData {
  channel_id: string;
  parent_id?: string; // For threads
  user_id: string;
}

/**
 * Posted message data from WebSocket
 */
export interface PostedData {
  channel_display_name: string;
  channel_name: string;
  channel_type: string;
  channel_id: string;
  post: string; // JSON string of the message
  sender_name: string;
  team_id: string;
}

/**
 * Status change data from WebSocket
 */
export interface StatusChangeData {
  user_id: string;
  status: string;
  manual?: boolean;
  last_activity_at?: number;
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
  error: Error | null;
}
