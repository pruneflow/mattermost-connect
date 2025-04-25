// src/core/store/channelStore.ts
/**
 * Zustand store for channels state
 */
import { create } from "zustand";

/**
 * Channel interface
 */
export interface Channel {
  id: string;
  team_id: string;
  name: string;
  display_name: string;
  type: "O" | "P" | "D" | "G";
  header?: string;
  purpose?: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  total_msg_count?: number;
  last_post_at?: number;
  is_favorite?: boolean;
  mention_count?: number;
}

/**
 * Channel unread count interface
 */
export interface ChannelUnreadCount {
  /** Number of unread messages */
  messageCount: number;
  /** Number of unread mentions */
  mentionCount: number;
  /** ID of the last message in the channel */
  lastMessageId?: string;
  /** Timestamp when the channel was last viewed */
  lastViewedAt?: number;
  /** Total message count for the channel */
  totalMessageCount?: number;
  /** Whether the channel is muted */
  isMuted?: boolean;
}

/**
 * Channel grouping types
 */
export type ChannelGroupType =
  | "public"
  | "private"
  | "direct"
  | "group"
  | "favorite";

/**
 * Channels state
 */
export interface ChannelState {
  // State
  /** Channels by team ID */
  channelsByTeam: Record<string, Channel[]>;
  /** Currently active channel */
  activeChannel: Channel | null;
  /** Loading states by team ID */
  loadingStates: Record<string, boolean>;
  /** Errors by team ID */
  errors: Record<string, Error | null>;
  /** Last fetch times by team ID */
  lastFetchTimes: Record<string, number>;
  /** Unread counts by channel ID */
  unreadCounts: Record<string, ChannelUnreadCount>;
  /** Typing users by channel ID */
  typingUsers: Record<string, string[]>;
  /** Muted channels by channel ID */
  mutedChannels: Set<string>;
  /** Last processed message IDs to avoid duplicates */
  processedMessageIds: Set<string>;

  // Actions
  /** Sets channels for a team */
  setChannels: (teamId: string, channels: Channel[]) => void;
  /** Sets or updates a single channel */
  setChannel: (channel: Channel) => void;
  /** Sets the active channel */
  setActiveChannel: (channel: Channel | null) => void;
  /** Sets the loading state for a team */
  setLoading: (teamId: string, isLoading: boolean) => void;
  /** Sets the error state for a team */
  setError: (teamId: string, error: Error | null) => void;
  /** Updates the unread count for a channel */
  updateUnreadCount: (
    channelId: string,
    messageCount: number,
    mentionCount: number,
    lastMessageId?: string,
    lastViewedAt?: number,
    totalMessageCount?: number,
  ) => void;
  /** Increments the unread count for a channel */
  incrementUnreadCount: (
    channelId: string,
    messageIncrement: number,
    mentionIncrement: number,
    messageId?: string,
    mentionsUserId?: boolean,
  ) => void;
  /** Marks a channel as read */
  markAsRead: (channelId: string) => void;
  /** Marks all channels in a team as read */
  markAllAsRead: (teamId: string) => void;
  /** Mutes or unmutes a channel */
  setChannelMuted: (channelId: string, isMuted: boolean) => void;
  /** Updates the typing users for a channel */
  updateTypingUsers: (channelId: string, userIds: string[]) => void;
  /** Adds a processed message ID to avoid duplicates */
  addProcessedMessageId: (messageId: string) => void;
  /** Gets a channel by ID */
  getChannelById: (channelId: string | null | undefined) => Channel | null;
  /** Resets the channels state */
  reset: () => void;
}

/**
 * Default unread count
 */
const DEFAULT_UNREAD_COUNT: ChannelUnreadCount = {
  messageCount: 0,
  mentionCount: 0,
  isMuted: false,
};

/**
 * Create the channels store
 */
export const useChannelStore = create<ChannelState>()((set, get) => ({
  // Initial state
  channelsByTeam: {},
  activeChannel: null,
  loadingStates: {},
  errors: {},
  lastFetchTimes: {},
  unreadCounts: {},
  typingUsers: {},
  mutedChannels: new Set<string>(),
  processedMessageIds: new Set<string>(),

  /**
   * Sets channels for a team
   * @param teamId Team ID
   * @param channels List of channels
   */
  setChannels: (teamId: string, channels: Channel[]) => {
    set((state) => ({
      channelsByTeam: {
        ...state.channelsByTeam,
        [teamId]: channels,
      },
      loadingStates: {
        ...state.loadingStates,
        [teamId]: false,
      },
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [teamId]: Date.now(),
      },
      errors: {
        ...state.errors,
        [teamId]: null,
      },
    }));
  },

  /**
   * Sets or updates a single channel
   * @param channel Channel to set or update
   */
  setChannel: (channel: Channel) => {
    const teamId = channel.team_id;

    set((state) => {
      // Get current channels for the team
      const teamChannels = [...(state.channelsByTeam[teamId] || [])];

      // Find existing channel index
      const channelIndex = teamChannels.findIndex((c) => c.id === channel.id);

      // Update or add the channel
      if (channelIndex >= 0) {
        teamChannels[channelIndex] = channel;
      } else {
        teamChannels.push(channel);
      }

      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: teamChannels,
        },
      };
    });
  },

  /**
   * Sets the active channel
   * @param channel Channel to set as active
   */
  setActiveChannel: (channel: Channel | null) => {
    set({ activeChannel: channel });

    // Also mark as read if a channel is being activated
    if (channel) {
      get().markAsRead(channel.id);
    }
  },

  /**
   * Sets the loading state for a team
   * @param teamId Team ID
   * @param isLoading Whether channels are being loaded
   */
  setLoading: (teamId: string, isLoading: boolean) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [teamId]: isLoading,
      },
    }));
  },

  /**
   * Sets the error state for a team
   * @param teamId Team ID
   * @param error Error to set
   */
  setError: (teamId: string, error: Error | null) => {
    set((state) => ({
      errors: {
        ...state.errors,
        [teamId]: error,
      },
      loadingStates: {
        ...state.loadingStates,
        [teamId]: false,
      },
    }));
  },

  /**
   * Updates the unread count for a channel
   * @param channelId Channel ID
   * @param messageCount Number of unread messages
   * @param mentionCount Number of unread mentions
   * @param lastMessageId ID of the last message
   * @param lastViewedAt Time when the channel was last viewed
   * @param totalMessageCount Total message count for the channel
   */
  updateUnreadCount: (
    channelId: string,
    messageCount: number,
    mentionCount: number,
    lastMessageId?: string,
    lastViewedAt?: number,
    totalMessageCount?: number,
  ) => {
    set((state) => {
      // Get existing unread data for the channel
      const existingUnread =
        state.unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

      return {
        unreadCounts: {
          ...state.unreadCounts,
          [channelId]: {
            ...existingUnread,
            messageCount,
            mentionCount,
            lastMessageId: lastMessageId || existingUnread.lastMessageId,
            lastViewedAt: lastViewedAt || existingUnread.lastViewedAt,
            totalMessageCount:
              totalMessageCount || existingUnread.totalMessageCount,
          },
        },
      };
    });
  },

  /**
   * Increments the unread count for a channel
   * @param channelId Channel ID
   * @param messageIncrement Number of messages to increment by
   * @param mentionIncrement Number of mentions to increment by
   * @param messageId ID of the message causing the increment
   * @param mentionsUserId Whether the current user is mentioned in the message
   */
  incrementUnreadCount: (
    channelId: string,
    messageIncrement: number,
    mentionIncrement: number,
    messageId?: string,
    mentionsUserId: boolean = false,
  ) => {
    // Don't increment if channel is active
    const activeChannel = get().activeChannel;
    if (activeChannel && activeChannel.id === channelId) {
      return;
    }

    // Don't increment if we've already processed this message
    if (messageId && get().processedMessageIds.has(messageId)) {
      return;
    }

    // Add to processed message IDs if provided
    if (messageId) {
      get().addProcessedMessageId(messageId);
    }

    set((state) => {
      // Get existing unread data for the channel
      const existingUnread =
        state.unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

      // Don't increment if channel is muted and there are no direct mentions
      if (existingUnread.isMuted && !mentionsUserId) {
        return state;
      }

      return {
        unreadCounts: {
          ...state.unreadCounts,
          [channelId]: {
            ...existingUnread,
            messageCount: Math.max(
              0,
              existingUnread.messageCount + messageIncrement,
            ),
            mentionCount: Math.max(
              0,
              existingUnread.mentionCount + mentionIncrement,
            ),
            lastMessageId: messageId || existingUnread.lastMessageId,
          },
        },
      };
    });
  },

  /**
   * Marks a channel as read
   * @param channelId Channel ID
   */
  markAsRead: (channelId: string) => {
    set((state) => {
      const existingUnread =
        state.unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

      return {
        unreadCounts: {
          ...state.unreadCounts,
          [channelId]: {
            ...existingUnread,
            messageCount: 0,
            mentionCount: 0,
            lastViewedAt: Date.now(),
          },
        },
      };
    });
  },

  /**
   * Marks all channels in a team as read
   * @param teamId Team ID
   */
  markAllAsRead: (teamId: string) => {
    set((state) => {
      const teamChannels = state.channelsByTeam[teamId] || [];
      const updatedUnreadCounts = { ...state.unreadCounts };

      // Reset unread counts for all channels in the team
      teamChannels.forEach((channel) => {
        const existingUnread =
          updatedUnreadCounts[channel.id] || DEFAULT_UNREAD_COUNT;
        updatedUnreadCounts[channel.id] = {
          ...existingUnread,
          messageCount: 0,
          mentionCount: 0,
          lastViewedAt: Date.now(),
        };
      });

      return {
        unreadCounts: updatedUnreadCounts,
      };
    });
  },

  /**
   * Mutes or unmutes a channel
   * @param channelId Channel ID
   * @param isMuted Whether the channel should be muted
   */
  setChannelMuted: (channelId: string, isMuted: boolean) => {
    set((state) => {
      const mutedChannels = new Set(state.mutedChannels);
      const existingUnread =
        state.unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

      if (isMuted) {
        mutedChannels.add(channelId);
      } else {
        mutedChannels.delete(channelId);
      }

      return {
        mutedChannels,
        unreadCounts: {
          ...state.unreadCounts,
          [channelId]: {
            ...existingUnread,
            isMuted,
          },
        },
      };
    });
  },

  /**
   * Updates the typing users for a channel
   * @param channelId Channel ID
   * @param userIds IDs of users who are typing
   */
  updateTypingUsers: (channelId: string, userIds: string[]) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: userIds,
      },
    }));
  },

  /**
   * Adds a processed message ID to avoid duplicates
   * @param messageId Message ID to add
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
   * Gets a channel by ID
   * @param channelId Channel ID
   * @returns Channel or null if not found
   */
  getChannelById: (channelId: string | null | undefined): Channel | null => {
    if (!channelId) return null;

    const { channelsByTeam } = get();

    // Search through all teams' channels
    for (const teamChannels of Object.values(channelsByTeam)) {
      const channel = teamChannels.find((c) => c.id === channelId);
      if (channel) return channel;
    }

    return null;
  },

  /**
   * Resets the channels state
   */
  reset: () => {
    set({
      channelsByTeam: {},
      activeChannel: null,
      loadingStates: {},
      errors: {},
      lastFetchTimes: {},
      unreadCounts: {},
      typingUsers: {},
      mutedChannels: new Set<string>(),
      processedMessageIds: new Set<string>(),
    });
  },
}));

/**
 * Gets the unread count for a channel
 * @param channelId Channel ID
 * @returns Channel unread count
 */
export const getChannelUnreadCount = (
  channelId: string,
): ChannelUnreadCount => {
  return (
    useChannelStore.getState().unreadCounts[channelId] || DEFAULT_UNREAD_COUNT
  );
};

/**
 * Gets channels by type for a team
 * @param teamId Team ID
 * @param type Channel type
 * @returns List of channels of the specified type
 */
export const getChannelsByType = (
  teamId: string,
  type: ChannelGroupType,
): Channel[] => {
  const channels = useChannelStore.getState().channelsByTeam[teamId] || [];

  switch (type) {
    case "public":
      return channels.filter((c) => c.type === "O");
    case "private":
      return channels.filter((c) => c.type === "P");
    case "direct":
      return channels.filter((c) => c.type === "D");
    case "group":
      return channels.filter((c) => c.type === "G");
    case "favorite":
      return channels.filter((c) => c.is_favorite);
    default:
      return channels;
  }
};

/**
 * Gets typing users for a channel
 * @param channelId Channel ID
 * @returns IDs of users who are typing
 */
export const getTypingUsers = (channelId: string): string[] => {
  return useChannelStore.getState().typingUsers[channelId] || [];
};

/**
 * Gets whether a channel is muted
 * @param channelId Channel ID
 * @returns Whether the channel is muted
 */
export const isChannelMuted = (channelId: string): boolean => {
  const unreadCount = getChannelUnreadCount(channelId);
  return unreadCount.isMuted || false;
};

/**
 * Gets total unread counts for all channels in a team
 * @param teamId Team ID
 * @returns Object containing total message and mention counts
 */
export const getTeamUnreadCounts = (
  teamId: string,
): { messageCount: number; mentionCount: number } => {
  const state = useChannelStore.getState();
  const teamChannels = state.channelsByTeam[teamId] || [];

  let totalMessages = 0;
  let totalMentions = 0;

  teamChannels.forEach((channel) => {
    const unreadCount = state.unreadCounts[channel.id] || DEFAULT_UNREAD_COUNT;
    if (!unreadCount.isMuted) {
      totalMessages += unreadCount.messageCount || 0;
      totalMentions += unreadCount.mentionCount || 0;
    } else {
      // For muted channels, only count mentions
      totalMentions += unreadCount.mentionCount || 0;
    }
  });

  return { messageCount: totalMessages, mentionCount: totalMentions };
};

/**
 * Gets total unread counts across all teams
 * @returns Object containing total message and mention counts
 */
export const getTotalUnreadCounts = (): {
  messageCount: number;
  mentionCount: number;
} => {
  const state = useChannelStore.getState();
  let totalMessages = 0;
  let totalMentions = 0;

  Object.values(state.channelsByTeam).forEach((teamChannels) => {
    teamChannels.forEach((channel) => {
      const unreadCount =
        state.unreadCounts[channel.id] || DEFAULT_UNREAD_COUNT;
      if (!unreadCount.isMuted) {
        totalMessages += unreadCount.messageCount || 0;
        totalMentions += unreadCount.mentionCount || 0;
      } else {
        // For muted channels, only count mentions
        totalMentions += unreadCount.mentionCount || 0;
      }
    });
  });

  return { messageCount: totalMessages, mentionCount: totalMentions };
};
