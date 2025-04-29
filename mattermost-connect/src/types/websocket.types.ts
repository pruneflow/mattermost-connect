/**
 * WebSocket related type definitions
 * Provides comprehensive types for WebSocket functionality
 */

import { CommonState } from "./common";

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
 * WebSocket connection event
 */
export interface WebSocketConnectionEvent {
  /** Whether the connection is established */
  isConnected: boolean;
  /** Timestamp of the event */
  timestamp: number;
  /** Close code (for disconnection events) */
  code?: number;
  /** Close reason (for disconnection events) */
  reason?: string;
  /** Whether disconnection was user initiated */
  userInitiated?: boolean;
  /** Whether this is a reconnection event */
  reconnected?: boolean;
}

/**
 * WebSocket error event
 */
export interface WebSocketErrorEvent {
  /** Error object */
  error: Error;
  /** Original event that caused the error */
  originalEvent?: Event;
  /** Timestamp of the error */
  timestamp: number;
  /** Additional context */
  context?: string;
}

/**
 * Typing indicator data from WebSocket
 */
export interface TypingData {
  /** Channel ID where typing is occurring */
  channel_id: string;
  /** Parent message ID for thread typing */
  parent_id?: string;
  /** User ID who is typing */
  user_id: string;
  /** Timestamp when typing started */
  timestamp?: number;
}

/**
 * Posted message data from WebSocket
 */
export interface PostedData {
  /** Display name of the channel */
  channel_display_name: string;
  /** Name of the channel */
  channel_name: string;
  /** Type of the channel */
  channel_type: string;
  /** ID of the channel */
  channel_id: string;
  /** Post data (JSON string of the message) */
  post: string;
  /** Name of the sender */
  sender_name: string;
  /** Team ID */
  team_id: string;
}

/**
 * Status change data from WebSocket
 */
export interface StatusChangeData {
  /** User ID whose status changed */
  user_id: string;
  /** New status */
  status: string;
  /** Whether the change was manual or automatic */
  manual?: boolean;
  /** Timestamp of last activity */
  last_activity_at?: number;
}

/**
 * Channel updated data from WebSocket
 */
export interface ChannelUpdatedData {
  /** Channel ID */
  channel_id: string;
  /** Team ID */
  team_id?: string;
  /** Updated channel data */
  channel: string; // JSON string
}

/**
 * Channel viewed data from WebSocket
 */
export interface ChannelViewedData {
  /** Channel ID */
  channel_id: string;
  /** User ID who viewed the channel */
  user_id: string;
}

/**
 * Reaction data from WebSocket
 */
export interface ReactionData {
  /** Reaction data */
  reaction: string; // JSON string
  /** User ID who reacted */
  user_id: string;
  /** Post ID */
  post_id: string;
  /** Emoji name */
  emoji_name: string;
}

/**
 * WebSocket state
 */
export interface WebSocketState extends CommonState {
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Whether WebSocket is connecting */
  isConnecting: boolean;
  /** WebSocket URL */
  url: string | null;
  /** Number of reconnect attempts */
  reconnectAttempts: number;
  /** Timestamp of last connection */
  lastConnectedAt: number | null;
  /** Timestamp of last disconnection */
  lastDisconnectedAt: number | null;
  /** Whether WebSocket has been disconnected */
  hasBeenDisconnected: boolean;
  /** Error if connection failed */
  error: Error | null;
}

/**
 * WebSocket event listener registration options
 */
export interface WebSocketListenerOptions {
  /** Whether to receive past events that occurred before registration */
  receivePastEvents?: boolean;
  /** Maximum number of past events to receive */
  maxPastEvents?: number;
  /** Whether to automatically unregister when component unmounts */
  autoUnregister?: boolean;
}

/**
 * WebSocket message event with strongly typed data
 */
export interface WebSocketMessageEvent<T> {
  /** Event type */
  type: WebSocketEventType;
  /** Event data */
  data: T;
  /** Timestamp */
  timestamp: number;
}
