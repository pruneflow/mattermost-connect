// types/unread.types.ts
/**
 * Types for unread count related data and functions
 */

/**
 * Unread count information for a channel
 */
export interface ChannelUnreadCount {
  msg_count: number;
  mention_count: number;
  lastMessageId?: string;
  lastViewedAt?: number;
  totalMessageCount?: number;
  isMuted?: boolean;
}

/**
 * Unread count state for the store
 */
export interface UnreadState {
  unreadCounts: Record<string, ChannelUnreadCount>;
  mutedChannels: Set<string>;
  processedMessageIds: Set<string>;
  teamUnreadCounts: Record<
    string,
    { msg_count: number; mention_count: number }
  >;
  lastFetchTimes: Record<string, number>;
}

/**
 * Formatted unread count for UI display
 */
export interface FormattedUnreadCount {
  text: string;
  color: "primary" | "error" | "default";
}

/**
 * Message history parameters for fetching unread messages
 */
export interface MessageHistoryParams {
  channelId: string;
  sinceTimestamp: number;
  page?: number;
  perPage?: number;
}

/**
 * Channel unread options
 */
export interface ChannelUnreadOptions {
  includeMuted?: boolean;
  onlyWithMentions?: boolean;
}

/**
 * Team unread notification event
 */
export interface UnreadCountsUpdatedEvent {
  teamId: string;
  counts: Record<string, { msg_count: number; mention_count: number }>;
  timestamp: number;
}
