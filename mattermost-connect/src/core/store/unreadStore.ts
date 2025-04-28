// src/core/store/unreadStore.ts
/**
 * Unread store
 * Manages unread counts for channels and teams
 */
import { create } from "zustand";
import {
  UnreadState,
  ChannelUnreadCount,
  ChannelUnreadOptions,
} from "../../types/unread.types";
import { Channel } from "../../types/channel.types";
import { emitEvent } from "./eventStore";
import { EventType } from "../../types/event.types";

/**
 * Unread store state and actions
 */
interface UnreadStoreState extends UnreadState {
  // Actions - Basic updates
  updateUnreadCount: (
    channelId: string,
    msgCount: number,
    mentionCount: number,
    lastMessageId?: string,
    lastViewedAt?: number,
    totalMessageCount?: number,
  ) => void;
  incrementUnreadCount: (
    channelId: string,
    messageIncrement: number,
    mentionIncrement: number,
    messageId?: string,
  ) => void;
  markAsRead: (channelId: string) => void;
  markAllAsRead: (teamId: string, channelIds?: string[]) => void;

  // Actions - Mute management
  setChannelMuted: (channelId: string, isMuted: boolean) => void;

  // Actions - Message tracking
  addProcessedMessageId: (messageId: string) => void;
  clearProcessedMessageIds: () => void;

  // Selectors - Channel unread state
  getChannelUnreadCount: (channelId: string) => ChannelUnreadCount;
  hasUnreadsInChannel: (channelId: string) => boolean;
  hasMentionsInChannel: (channelId: string) => boolean;
  isChannelMuted: (channelId: string) => boolean;

  // Selectors - Team unread state
  getTeamUnreadCount: (
    teamId: string,
    channels: Channel[],
  ) => { msg_count: number; mention_count: number };
  hasUnreadsInTeam: (teamId: string, channels: Channel[]) => boolean;
  hasMentionsInTeam: (teamId: string, channels: Channel[]) => boolean;

  // Selectors - Global unread state
  getTotalUnreadCount: () => { msg_count: number; mention_count: number };

  // Reset
  reset: () => void;
}

/**
 * Unread store for managing unread counts
 */
export const useUnreadStore = create<UnreadStoreState>()((set, get) => ({
  // Initial state
  unreadCounts: {},
  mutedChannels: new Set<string>(),
  processedMessageIds: new Set<string>(),
  teamUnreadCounts: {},
  lastFetchTimes: {},

  /**
   * Updates unread count for a channel
   * @param channelId Channel ID
   * @param msgCount Message count
   * @param mentionCount Mention count
   * @param lastMessageId Last message ID
   * @param lastViewedAt Last viewed timestamp
   * @param totalMessageCount Total message count
   */
  updateUnreadCount: (
    channelId: string,
    msgCount: number,
    mentionCount: number,
    lastMessageId,
    lastViewedAt,
    totalMessageCount,
  ) => {
    set((state) => {
      const existingUnread = state.unreadCounts[channelId] || {
        msg_count: 0,
        mention_count: 0,
      };

      const unreadCount: ChannelUnreadCount = {
        ...existingUnread,
        msg_count: msgCount,
        mention_count: mentionCount,
        lastMessageId: lastMessageId || existingUnread.lastMessageId,
        lastViewedAt: lastViewedAt || existingUnread.lastViewedAt,
        totalMessageCount:
          totalMessageCount || existingUnread.totalMessageCount,
        isMuted: state.mutedChannels.has(channelId),
      };

      // Create updated unread counts
      const unreadCounts = {
        ...state.unreadCounts,
        [channelId]: unreadCount,
      };

      // Emit unread updated event
      emitEvent(EventType.UNREAD_UPDATED, {
        channelId,
        unreadCount,
      });

      return { unreadCounts };
    });
  },

  /**
   * Increments unread counts for a channel
   * @param channelId Channel ID
   * @param messageIncrement Messages to add
   * @param mentionIncrement Mentions to add
   * @param messageId Message ID for tracking
   */
  incrementUnreadCount: (
    channelId: string,
    messageIncrement: number,
    mentionIncrement: number,
    messageId?: string,
  ) => {
    // Skip if message ID is already processed
    if (messageId && get().processedMessageIds.has(messageId)) {
      return;
    }

    // Add to processed IDs if provided
    if (messageId) {
      get().addProcessedMessageId(messageId);
    }

    set((state) => {
      const existingUnread = state.unreadCounts[channelId] || {
        msg_count: 0,
        mention_count: 0,
      };

      // Don't increment for muted channels unless there are mentions
      const isMuted = state.mutedChannels.has(channelId);
      if (isMuted && mentionIncrement === 0) {
        return state;
      }

      // Calculate new counts
      const newMsgCount = Math.max(
        0,
        existingUnread.msg_count + messageIncrement,
      );
      const newMentionCount = Math.max(
        0,
        existingUnread.mention_count + mentionIncrement,
      );

      const unreadCount: ChannelUnreadCount = {
        ...existingUnread,
        msg_count: newMsgCount,
        mention_count: newMentionCount,
        lastMessageId: messageId || existingUnread.lastMessageId,
        isMuted,
      };

      // Create updated unread counts
      const unreadCounts = {
        ...state.unreadCounts,
        [channelId]: unreadCount,
      };

      // Emit unread updated event
      emitEvent(EventType.UNREAD_UPDATED, {
        channelId,
        unreadCount,
      });

      return { unreadCounts };
    });
  },

  /**
   * Marks a channel as read
   * @param channelId Channel ID
   */
  markAsRead: (channelId: string) => {
    set((state) => {
      const existingUnread = state.unreadCounts[channelId] || {
        msg_count: 0,
        mention_count: 0,
      };

      // Channel is already read
      if (
        existingUnread.msg_count === 0 &&
        existingUnread.mention_count === 0
      ) {
        return state;
      }

      const unreadCount: ChannelUnreadCount = {
        ...existingUnread,
        msg_count: 0,
        mention_count: 0,
        lastViewedAt: Date.now(),
        isMuted: state.mutedChannels.has(channelId),
      };

      // Create updated unread counts
      const unreadCounts = {
        ...state.unreadCounts,
        [channelId]: unreadCount,
      };

      // Emit marked read event
      emitEvent(EventType.UNREAD_MARKED_READ, {
        channelId,
      });

      return { unreadCounts };
    });
  },

  /**
   * Marks all channels in a team as read
   * @param teamId Team ID
   * @param channelIds Optional specific channel IDs
   */
  markAllAsRead: (teamId: string, channelIds?: string[]) => {
    set((state) => {
      const updatedUnreadCounts = { ...state.unreadCounts };
      const now = Date.now();
      const channelsToMark = channelIds || Object.keys(updatedUnreadCounts);

      // Mark each channel as read
      channelsToMark.forEach((channelId) => {
        const existingUnread = updatedUnreadCounts[channelId];
        if (existingUnread) {
          updatedUnreadCounts[channelId] = {
            ...existingUnread,
            msg_count: 0,
            mention_count: 0,
            lastViewedAt: now,
            isMuted: state.mutedChannels.has(channelId),
          };
        }
      });

      // Emit team marked read event
      emitEvent(EventType.UNREAD_MARKED_READ, {
        teamId,
        channelIds: channelsToMark,
      });

      return { unreadCounts: updatedUnreadCounts };
    });
  },

  /**
   * Sets whether a channel is muted
   * @param channelId Channel ID
   * @param isMuted Whether to mute
   */
  setChannelMuted: (channelId: string, isMuted: boolean) => {
    set((state) => {
      const mutedChannels = new Set(state.mutedChannels);

      if (isMuted) {
        mutedChannels.add(channelId);
      } else {
        mutedChannels.delete(channelId);
      }

      // Update unread count to reflect muted status
      const existingUnread = state.unreadCounts[channelId];
      if (existingUnread) {
        const unreadCounts = {
          ...state.unreadCounts,
          [channelId]: {
            ...existingUnread,
            isMuted,
          },
        };

        return { mutedChannels, unreadCounts };
      }

      return { mutedChannels };
    });
  },

  /**
   * Adds a message ID to the processed set
   * @param messageId Message ID
   */
  addProcessedMessageId: (messageId: string) => {
    set((state) => {
      const processedMessageIds = new Set(state.processedMessageIds);
      processedMessageIds.add(messageId);

      // Limit size to prevent memory issues - keep last 1000 messages
      if (processedMessageIds.size > 1000) {
        const toRemove = Array.from(processedMessageIds).slice(
          0,
          processedMessageIds.size - 1000,
        );
        toRemove.forEach((id) => processedMessageIds.delete(id));
      }

      return { processedMessageIds };
    });
  },

  /**
   * Clears all processed message IDs
   */
  clearProcessedMessageIds: () => {
    set({ processedMessageIds: new Set<string>() });
  },

  /**
   * Gets unread count for a channel
   * @param channelId Channel ID
   * @returns Channel unread count
   */
  getChannelUnreadCount: (channelId: string): ChannelUnreadCount => {
    const { unreadCounts, mutedChannels } = get();

    return (
      unreadCounts[channelId] || {
        msg_count: 0,
        mention_count: 0,
        isMuted: mutedChannels.has(channelId),
      }
    );
  },

  /**
   * Checks if a channel has unread messages
   * @param channelId Channel ID
   * @returns Whether channel has unreads
   */
  hasUnreadsInChannel: (channelId: string): boolean => {
    const unreadCount = get().getChannelUnreadCount(channelId);
    return unreadCount.msg_count > 0 || unreadCount.mention_count > 0;
  },

  /**
   * Checks if a channel has mentions
   * @param channelId Channel ID
   * @returns Whether channel has mentions
   */
  hasMentionsInChannel: (channelId: string): boolean => {
    const unreadCount = get().getChannelUnreadCount(channelId);
    return unreadCount.mention_count > 0;
  },

  /**
   * Checks if a channel is muted
   * @param channelId Channel ID
   * @returns Whether channel is muted
   */
  isChannelMuted: (channelId: string): boolean => {
    return get().mutedChannels.has(channelId);
  },

  /**
   * Gets unread counts for a team
   * @param teamId Team ID
   * @param channels Team channels
   * @returns Team unread counts
   */
  getTeamUnreadCount: (
    teamId: string,
    channels: Channel[],
  ): { msg_count: number; mention_count: number } => {
    const { unreadCounts, mutedChannels } = get();
    let totalMessages = 0;
    let totalMentions = 0;

    for (const channel of channels) {
      if (channel.team_id !== teamId) continue;

      const unreadCount = unreadCounts[channel.id] || {
        msg_count: 0,
        mention_count: 0,
      };
      const isMuted = mutedChannels.has(channel.id);

      // Always count mentions
      totalMentions += unreadCount.mention_count;

      // Only count messages for non-muted channels
      if (!isMuted) {
        totalMessages += unreadCount.msg_count;
      }
    }

    return { msg_count: totalMessages, mention_count: totalMentions };
  },

  /**
   * Checks if a team has unread messages
   * @param teamId Team ID
   * @param channels Team channels
   * @returns Whether team has unreads
   */
  hasUnreadsInTeam: (teamId: string, channels: Channel[]): boolean => {
    const counts = get().getTeamUnreadCount(teamId, channels);
    return counts.msg_count > 0 || counts.mention_count > 0;
  },

  /**
   * Checks if a team has mentions
   * @param teamId Team ID
   * @param channels Team channels
   * @returns Whether team has mentions
   */
  hasMentionsInTeam: (teamId: string, channels: Channel[]): boolean => {
    const counts = get().getTeamUnreadCount(teamId, channels);
    return counts.mention_count > 0;
  },

  /**
   * Gets total unread count across all teams
   * @returns Total unread counts
   */
  getTotalUnreadCount: (): { msg_count: number; mention_count: number } => {
    const { unreadCounts, mutedChannels } = get();
    let totalMessages = 0;
    let totalMentions = 0;

    Object.entries(unreadCounts).forEach(([channelId, counts]) => {
      const isMuted = mutedChannels.has(channelId);

      // Always count mentions
      totalMentions += counts.mention_count;

      // Only count messages for non-muted channels
      if (!isMuted) {
        totalMessages += counts.msg_count;
      }
    });

    return { msg_count: totalMessages, mention_count: totalMentions };
  },

  /**
   * Resets the store to initial state
   */
  reset: () => {
    set({
      unreadCounts: {},
      mutedChannels: new Set<string>(),
      processedMessageIds: new Set<string>(),
      teamUnreadCounts: {},
      lastFetchTimes: {},
    });
  },
}));

/**
 * Helper function to get team unread counts
 * @param teamId Team ID
 * @param channels Channels in the team
 * @returns Unread counts for the team
 */
export function getTeamUnreadCounts(
  teamId: string,
  channels: Channel[],
): { msg_count: number; mention_count: number } {
  return useUnreadStore.getState().getTeamUnreadCount(teamId, channels);
}

/**
 * Helper function to get total unread counts
 * @returns Total unread counts
 */
export function getTotalUnreadCounts(): {
  msg_count: number;
  mention_count: number;
} {
  return useUnreadStore.getState().getTotalUnreadCount();
}
