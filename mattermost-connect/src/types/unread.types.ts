/**
 * Types for unread count related data and functions
 */
import { CommonState, PaginationParams } from "./common";

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
 * Team unread count information
 */
export interface TeamUnreadCount {
  msg_count: number;
  mention_count: number;
  channelIds?: string[]; // Optional list of channels with unreads
}

/**
 * Total unread count across all teams
 */
export interface TotalUnreadCount {
  msg_count: number;
  mention_count: number;
  teamCounts?: Record<string, TeamUnreadCount>;
}

/**
 * Muted channel information
 */
export interface MutedChannelInfo {
  channelId: string;
  isMuted: boolean;
  muteExpiration?: number; // Optional timestamp for temporary mutes
}

/**
 * Parameters for marking a channel as read
 */
export interface MarkAsReadParams {
  channelId: string;
  messageId?: string; // Optional ID of the last message read
}

/**
 * Parameters for marking all channels in a team as read
 */
export interface MarkTeamAsReadParams {
  teamId: string;
  excludeChannelIds?: string[]; // Optional channels to exclude
}

/**
 * Message history parameters for fetching unread messages
 */
export interface MessageHistoryParams extends PaginationParams {
  channelId: string;
  sinceTimestamp: number;
}

/**
 * Formatted unread count for UI display
 */
export interface FormattedUnreadCount {
  text: string;
  color: "primary" | "error" | "default";
  hasMentions: boolean;
  hasUnreads: boolean;
}

/**
 * Channel unread options for filtering
 */
export interface ChannelUnreadOptions {
  includeMuted?: boolean;
  onlyWithMentions?: boolean;
  sortByLastActivity?: boolean;
}

/**
 * Unread count state for the store
 */
export interface UnreadState extends CommonState {
  unreadCounts: Record<string, ChannelUnreadCount>;
  mutedChannels: Set<string>;
  processedMessageIds: Set<string>;
  teamUnreadCounts: Record<string, TeamUnreadCount>;
  lastFetchTimes: Record<string, number>;
}

/**
 * Unread counts updated event data
 */
export interface UnreadCountsUpdatedEvent {
  teamId?: string;
  channelId?: string;
  counts: Record<string, { msg_count: number; mention_count: number }>;
  timestamp: number;
}
