// src/core/store/unreadStore.ts
import { create } from "zustand";
import { Channel } from "./channelStore";

export interface ChannelUnreadCount {
  msg_count: number;
  mention_count: number;
  lastMessageId?: string;
  lastViewedAt?: number;
  totalMessageCount?: number;
}

interface UnreadState {
  unreadCounts: Record<string, ChannelUnreadCount>;
  mutedChannels: Set<string>;
  processedMessageIds: Set<string>;
}

export const useUnreadStore = create<
  UnreadState & {
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
      mentionsUserId?: boolean,
    ) => void;
    markAsRead: (channelId: string) => void;
    markAllAsRead: (teamId: string, channelIds: string[]) => void;
    setChannelMuted: (channelId: string, isMuted: boolean) => void;
    addProcessedMessageId: (messageId: string) => void;
    hasUnreadsInChannel: (channelId: string) => boolean;
    hasMentionsInChannel: (channelId: string) => boolean;
    isChannelMuted: (channelId: string) => boolean;
    getChannelUnreadCount: (channelId: string) => ChannelUnreadCount;
    getTeamUnreadCount: (
      teamId: string,
      channels: Channel[],
    ) => { msg_count: number; mention_count: number };
    getTotalUnreadCount: (
      teamUnreadCounts: Record<
        string,
        { msg_count: number; mention_count: number }
      >,
    ) => { msg_count: number; mention_count: number };
    reset: () => void;
  }
>((set, get) => ({
  unreadCounts: {},
  mutedChannels: new Set<string>(),
  processedMessageIds: new Set<string>(),

  updateUnreadCount: (
    channelId: string,
    msgCount: number,
    mentionCount: number,
    lastMessageId?: string,
    lastViewedAt?: number,
    totalMessageCount?: number,
  ) => {
    const existingUnread = get().unreadCounts[channelId] || {
      msg_count: 0,
      mention_count: 0,
    };

    set({
      unreadCounts: {
        ...get().unreadCounts,
        [channelId]: {
          ...existingUnread,
          msg_count: msgCount,
          mention_count: mentionCount,
          lastMessageId: lastMessageId || existingUnread.lastMessageId,
          lastViewedAt: lastViewedAt || existingUnread.lastViewedAt,
          totalMessageCount:
            totalMessageCount || existingUnread.totalMessageCount,
        },
      },
    });
  },

  incrementUnreadCount: (
    channelId: string,
    messageIncrement: number,
    mentionIncrement: number,
    messageId?: string,
    mentionsUserId: boolean = false,
  ) => {
    // Skip if message ID is already processed
    if (messageId && get().processedMessageIds.has(messageId)) {
      return;
    }

    // Add to processed IDs if provided
    if (messageId) {
      get().addProcessedMessageId(messageId);
    }

    const existingUnread = get().unreadCounts[channelId] || {
      msg_count: 0,
      mention_count: 0,
    };

    // Don't increment if channel is muted and there are no direct mentions
    if (get().mutedChannels.has(channelId) && !mentionsUserId) {
      return;
    }

    set({
      unreadCounts: {
        ...get().unreadCounts,
        [channelId]: {
          ...existingUnread,
          msg_count: Math.max(0, existingUnread.msg_count + messageIncrement),
          mention_count: Math.max(
            0,
            existingUnread.mention_count + mentionIncrement,
          ),
          lastMessageId: messageId || existingUnread.lastMessageId,
        },
      },
    });
  },

  markAsRead: (channelId: string) => {
    const existingUnread = get().unreadCounts[channelId] || {
      msg_count: 0,
      mention_count: 0,
    };

    set({
      unreadCounts: {
        ...get().unreadCounts,
        [channelId]: {
          ...existingUnread,
          msg_count: 0,
          mention_count: 0,
          lastViewedAt: Date.now(),
        },
      },
    });
  },

  markAllAsRead: (teamId: string, channelIds: string[]) => {
    const updatedUnreadCounts = { ...get().unreadCounts };
    const now = Date.now();

    channelIds.forEach((channelId) => {
      const existingUnread = updatedUnreadCounts[channelId] || {
        msg_count: 0,
        mention_count: 0,
      };

      updatedUnreadCounts[channelId] = {
        ...existingUnread,
        msg_count: 0,
        mention_count: 0,
        lastViewedAt: now,
      };
    });

    set({ unreadCounts: updatedUnreadCounts });
  },

  setChannelMuted: (channelId: string, isMuted: boolean) => {
    const mutedChannels = new Set(get().mutedChannels);

    if (isMuted) {
      mutedChannels.add(channelId);
    } else {
      mutedChannels.delete(channelId);
    }

    set({ mutedChannels });
  },

  addProcessedMessageId: (messageId: string) => {
    const processedMessageIds = new Set(get().processedMessageIds);
    processedMessageIds.add(messageId);

    // Limit size to prevent memory issues - keep last 1000 messages
    if (processedMessageIds.size > 1000) {
      const toRemove = Array.from(processedMessageIds).slice(
        0,
        processedMessageIds.size - 1000,
      );
      toRemove.forEach((id) => processedMessageIds.delete(id));
    }

    set({ processedMessageIds });
  },

  hasUnreadsInChannel: (channelId: string) => {
    const unreadCount = get().unreadCounts[channelId];
    return (
      !!unreadCount &&
      (unreadCount.msg_count > 0 || unreadCount.mention_count > 0)
    );
  },

  hasMentionsInChannel: (channelId: string) => {
    const unreadCount = get().unreadCounts[channelId];
    return !!unreadCount && unreadCount.mention_count > 0;
  },

  isChannelMuted: (channelId: string) => {
    return get().mutedChannels.has(channelId);
  },

  getChannelUnreadCount: (channelId: string) => {
    return (
      get().unreadCounts[channelId] || {
        msg_count: 0,
        mention_count: 0,
      }
    );
  },

  getTeamUnreadCount: (teamId: string, channels: Channel[]) => {
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

  getTotalUnreadCount: (
    teamUnreadCounts: Record<
      string,
      { msg_count: number; mention_count: number }
    >,
  ) => {
    let totalMessages = 0;
    let totalMentions = 0;

    Object.values(teamUnreadCounts).forEach((count) => {
      totalMessages += count.msg_count;
      totalMentions += count.mention_count;
    });

    return { msg_count: totalMessages, mention_count: totalMentions };
  },

  reset: () => {
    set({
      unreadCounts: {},
      mutedChannels: new Set<string>(),
      processedMessageIds: new Set<string>(),
    });
  },
}));
