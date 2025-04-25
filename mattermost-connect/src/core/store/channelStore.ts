// src/core/store/channelStore.ts
/**
 * Zustand store for channels state
 */
import { create } from "zustand";
import { combine, devtools } from "zustand/middleware";

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
  msg_count: number;
  /** Number of unread mentions */
  mention_count: number;
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
 * Initial state for the channel store
 */
interface ChannelState {
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
  /** Marks a channel as read (clears unread counts) */
  markAsRead: (channelId: string) => void;
  /** Adds a processed message ID to avoid duplicates */
  addProcessedMessageId: (messageId: string) => void;
}

/**
 * Default initial state
 */
const initialState: ChannelState = {
  channelsByTeam: {},
  activeChannel: null,
  loadingStates: {},
  errors: {},
  lastFetchTimes: {},
  unreadCounts: {},
  typingUsers: {},
  mutedChannels: new Set<string>(),
  processedMessageIds: new Set<string>(),
  markAsRead: () => {},
  addProcessedMessageId: () => {},
};

/**
 * Default unread count
 */
const DEFAULT_UNREAD_COUNT: ChannelUnreadCount = {
  msg_count: 0,
  mention_count: 0,
  isMuted: false,
};

/**
 * Create the channels store with devtools middleware for better debugging
 */
export const useChannelStore = create(
  devtools(
    combine(initialState, (set, get) => ({
      /**
       * Sets channels for a team
       * @param teamId Team ID
       * @param channels List of channels
       */
      setChannels: (teamId: string, channels: Channel[]) => {
        set(
          {
            channelsByTeam: {
              ...get().channelsByTeam,
              [teamId]: channels,
            },
            loadingStates: {
              ...get().loadingStates,
              [teamId]: false,
            },
            lastFetchTimes: {
              ...get().lastFetchTimes,
              [teamId]: Date.now(),
            },
            errors: {
              ...get().errors,
              [teamId]: null,
            },
          },
          false,
          "channels/setChannels",
        );
      },

      /**
       * Sets or updates a single channel
       * @param channel Channel to set or update
       */
      setChannel: (channel: Channel) => {
        const teamId = channel.team_id;
        const teamChannels = [...(get().channelsByTeam[teamId] || [])];
        const channelIndex = teamChannels.findIndex((c) => c.id === channel.id);

        // Update or add the channel
        if (channelIndex >= 0) {
          teamChannels[channelIndex] = channel;
        } else {
          teamChannels.push(channel);
        }

        set(
          {
            channelsByTeam: {
              ...get().channelsByTeam,
              [teamId]: teamChannels,
            },
          },
          false,
          "channels/setChannel",
        );
      },

      /**
       * Sets the active channel
       * @param channel Channel to set as active
       */
      setActiveChannel: (channel: Channel | null) => {
        set({ activeChannel: channel }, false, "channels/setActiveChannel");

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
        set(
          {
            loadingStates: {
              ...get().loadingStates,
              [teamId]: isLoading,
            },
          },
          false,
          "channels/setLoading",
        );
      },

      /**
       * Sets the error state for a team
       * @param teamId Team ID
       * @param error Error to set
       */
      setError: (teamId: string, error: Error | null) => {
        set(
          {
            errors: {
              ...get().errors,
              [teamId]: error,
            },
            loadingStates: {
              ...get().loadingStates,
              [teamId]: false,
            },
          },
          false,
          "channels/setError",
        );
      },

      /**
       * Updates the unread count for a channel
       * @param channelId Channel ID
       * @param msg_count Number of unread messages
       * @param mention_count Number of unread mentions
       * @param lastMessageId ID of the last message
       * @param lastViewedAt Time when the channel was last viewed
       * @param totalMessageCount Total message count for the channel
       */
      updateUnreadCount: (
        channelId: string,
        msg_count: number,
        mention_count: number,
        lastMessageId?: string,
        lastViewedAt?: number,
        totalMessageCount?: number,
      ) => {
        // Get existing unread data for the channel
        const existingUnread =
          get().unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

        set(
          {
            unreadCounts: {
              ...get().unreadCounts,
              [channelId]: {
                ...existingUnread,
                msg_count,
                mention_count,
                lastMessageId: lastMessageId || existingUnread.lastMessageId,
                lastViewedAt: lastViewedAt || existingUnread.lastViewedAt,
                totalMessageCount:
                  totalMessageCount || existingUnread.totalMessageCount,
              },
            },
          },
          false,
          "channels/updateUnreadCount",
        );
      },

      /**
       * Increments the unread count for a channel
       * Optimized to avoid unnecessary updates in certain conditions
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

        // Get existing unread data for the channel
        const existingUnread =
          get().unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

        // Don't increment if channel is muted and there are no direct mentions
        if (existingUnread.isMuted && !mentionsUserId) {
          return;
        }

        set(
          {
            unreadCounts: {
              ...get().unreadCounts,
              [channelId]: {
                ...existingUnread,
                msg_count: Math.max(
                  0,
                  existingUnread.msg_count + messageIncrement,
                ),
                mention_count: Math.max(
                  0,
                  existingUnread.mention_count + mentionIncrement,
                ),
                lastMessageId: messageId || existingUnread.lastMessageId,
              },
            },
          },
          false,
          "channels/incrementUnreadCount",
        );
      },

      /**
       * Marks a channel as read
       * @param channelId Channel ID
       */
      markAsRead: (channelId: string) => {
        const existingUnread =
          get().unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

        set(
          {
            unreadCounts: {
              ...get().unreadCounts,
              [channelId]: {
                ...existingUnread,
                msg_count: 0,
                mention_count: 0,
                lastViewedAt: Date.now(),
              },
            },
          },
          false,
          "channels/markAsRead",
        );
      },

      /**
       * Marks all channels in a team as read
       * @param teamId Team ID
       */
      markAllAsRead: (teamId: string) => {
        const teamChannels = get().channelsByTeam[teamId] || [];
        const updatedUnreadCounts = { ...get().unreadCounts };
        const now = Date.now();

        // Reset unread counts for all channels in the team
        teamChannels.forEach((channel) => {
          const existingUnread =
            updatedUnreadCounts[channel.id] || DEFAULT_UNREAD_COUNT;
          updatedUnreadCounts[channel.id] = {
            ...existingUnread,
            msg_count: 0,
            mention_count: 0,
            lastViewedAt: now,
          };
        });

        set(
          {
            unreadCounts: updatedUnreadCounts,
          },
          false,
          "channels/markAllAsRead",
        );
      },

      /**
       * Mutes or unmutes a channel
       * @param channelId Channel ID
       * @param isMuted Whether the channel should be muted
       */
      setChannelMuted: (channelId: string, isMuted: boolean) => {
        const mutedChannels = new Set(get().mutedChannels);
        const existingUnread =
          get().unreadCounts[channelId] || DEFAULT_UNREAD_COUNT;

        if (isMuted) {
          mutedChannels.add(channelId);
        } else {
          mutedChannels.delete(channelId);
        }

        set(
          {
            mutedChannels,
            unreadCounts: {
              ...get().unreadCounts,
              [channelId]: {
                ...existingUnread,
                isMuted,
              },
            },
          },
          false,
          "channels/setChannelMuted",
        );
      },

      /**
       * Updates the typing users for a channel
       * @param channelId Channel ID
       * @param userIds IDs of users who are typing
       */
      updateTypingUsers: (channelId: string, userIds: string[]) => {
        set(
          {
            typingUsers: {
              ...get().typingUsers,
              [channelId]: userIds,
            },
          },
          false,
          "channels/updateTypingUsers",
        );
      },

      /**
       * Adds a processed message ID to avoid duplicates
       * @param messageId Message ID to add
       */
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

        set({ processedMessageIds }, false, "channels/addProcessedMessageId");
      },

      /**
       * Gets a channel by ID
       * @param channelId Channel ID
       * @returns Channel or null if not found
       */
      getChannelById: (
        channelId: string | null | undefined,
      ): Channel | null => {
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
        set(initialState, false, "channels/reset");
      },
    })),
    { name: "channelStore" },
  ),
);

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
 * Optimized for performance by memoizing frequently accessed data
 * @param teamId Team ID
 * @returns Object containing total message and mention counts
 */
export const getTeamUnreadCounts = (
  teamId: string,
): { msg_count: number; mention_count: number } => {
  const state = useChannelStore.getState();
  const teamChannels = state.channelsByTeam[teamId] || [];

  let totalMessages = 0;
  let totalMentions = 0;

  // Use a for loop for better performance with large arrays
  for (let i = 0; i < teamChannels.length; i++) {
    const channel = teamChannels[i];
    const unreadCount = state.unreadCounts[channel.id] || DEFAULT_UNREAD_COUNT;

    if (!unreadCount.isMuted) {
      totalMessages += unreadCount.msg_count || 0;
      totalMentions += unreadCount.mention_count || 0;
    } else {
      // For muted channels, only count mentions
      totalMentions += unreadCount.mention_count || 0;
    }
  }

  return { msg_count: totalMessages, mention_count: totalMentions };
};

/**
 * Gets total unread counts across all teams
 * @returns Object containing total message and mention counts
 */
export const getTotalUnreadCounts = (): {
  msg_count: number;
  mention_count: number;
} => {
  const state = useChannelStore.getState();
  let totalMessages = 0;
  let totalMentions = 0;

  // First, get all teams
  const teamIds = Object.keys(state.channelsByTeam);

  // Then calculate totals for each team
  for (const teamId of teamIds) {
    const teamCounts = getTeamUnreadCounts(teamId);
    totalMessages += teamCounts.msg_count;
    totalMentions += teamCounts.mention_count;
  }

  return { msg_count: totalMessages, mention_count: totalMentions };
};
