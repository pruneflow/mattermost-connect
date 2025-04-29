// src/core/store/unreadStore.ts
/**
 * Unread store
 * Manages unread counts for channels and teams
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Channel,
  ChannelUnreadCount,
  Message,
  UnreadState,
  EventType,
} from "../../types";
import { unreadService } from "../services/unreadService";
import { createLoadingSlice } from "../store/storeUtils";
import { emitEvent } from "./eventStore";

/**
 * Enhanced unread store state with actions
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
  addProcessedMessageId: (messageId: string, channelId?: string) => void;
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

  // Loading/Error State
  setLoading: (isLoading: boolean) => void;
  setLoadingId: (id: string, isLoading: boolean) => void;
  setError: (error: Error | null) => void;

  // Reset
  reset: () => void;
}

/**
 * Creates the unread store with immer middleware for easy updates
 * and subscribeWithSelector for observing state changes
 */
export const useUnreadStore = create<UnreadStoreState>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create loading slice for standardized loading/error state management
      const loadingSlice = createLoadingSlice<UnreadStoreState>(set);

      return {
        // Initial state
        unreadCounts: {},
        mutedChannels: new Set<string>(),
        processedMessageIds: new Set<string>(),
        teamUnreadCounts: {},
        lastFetchTimes: {},

        // Include loading/error state from slice
        isLoading: loadingSlice.isLoading,
        loadingIds: loadingSlice.loadingIds,
        error: loadingSlice.error,
        errors: {},

        // Include loading/error actions from slice
        setLoading: loadingSlice.setLoading,
        setLoadingId: loadingSlice.setLoadingId,
        setError: loadingSlice.setError,

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
            state.unreadCounts[channelId] = unreadCount;

            // Update last fetch time
            state.lastFetchTimes[channelId] = Date.now();

            // Emit unread updated event
            emitEvent(EventType.UNREAD_UPDATED, {
              channelId,
              unreadCount,
            });
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
          if (messageId) {
            const isProcessed = unreadService.isMessageProcessed(
              messageId,
              get().processedMessageIds,
              channelId,
            );

            if (isProcessed) {
              return;
            }

            // Add to processed IDs if provided
            get().addProcessedMessageId(messageId, channelId);
          }

          set((state) => {
            const existingUnread = state.unreadCounts[channelId] || {
              msg_count: 0,
              mention_count: 0,
            };

            // Don't increment for muted channels unless there are mentions
            const isMuted = state.mutedChannels.has(channelId);
            if (isMuted && mentionIncrement === 0) {
              return;
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

            // Update unread counts
            state.unreadCounts[channelId] = unreadCount;

            // Update last fetch time
            state.lastFetchTimes[channelId] = Date.now();

            // Emit unread updated event
            emitEvent(EventType.UNREAD_UPDATED, {
              channelId,
              unreadCount,
            });
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
              return;
            }

            const unreadCount: ChannelUnreadCount = {
              ...existingUnread,
              msg_count: 0,
              mention_count: 0,
              lastViewedAt: Date.now(),
              isMuted: state.mutedChannels.has(channelId),
            };

            // Update unread counts
            state.unreadCounts[channelId] = unreadCount;

            // Update last fetch time
            state.lastFetchTimes[channelId] = Date.now();

            // Emit marked read event
            emitEvent(EventType.UNREAD_MARKED_READ, {
              channelId,
            });
          });
        },

        /**
         * Marks all channels in a team as read
         * @param teamId Team ID
         * @param channelIds Optional specific channel IDs
         */
        markAllAsRead: (teamId: string, channelIds?: string[]) => {
          set((state) => {
            const now = Date.now();
            const channelsToMark =
              channelIds || Object.keys(state.unreadCounts);

            // Mark each channel as read
            channelsToMark.forEach((channelId) => {
              const existingUnread = state.unreadCounts[channelId];
              if (existingUnread) {
                state.unreadCounts[channelId] = {
                  ...existingUnread,
                  msg_count: 0,
                  mention_count: 0,
                  lastViewedAt: now,
                  isMuted: state.mutedChannels.has(channelId),
                };
              }
            });

            // Update team last fetch time
            state.lastFetchTimes[teamId] = now;

            // Emit team marked read event
            emitEvent(EventType.UNREAD_MARKED_READ, {
              teamId,
              channelIds: channelsToMark,
            });
          });
        },

        /**
         * Sets whether a channel is muted
         * @param channelId Channel ID
         * @param isMuted Whether to mute
         */
        setChannelMuted: (channelId: string, isMuted: boolean) => {
          set((state) => {
            // Update muted channels set
            if (isMuted) {
              state.mutedChannels.add(channelId);
            } else {
              state.mutedChannels.delete(channelId);
            }

            // Update unread count to reflect muted status
            const existingUnread = state.unreadCounts[channelId];
            if (existingUnread) {
              state.unreadCounts[channelId] = {
                ...existingUnread,
                isMuted,
              };
            }
          });
        },

        /**
         * Adds a message ID to the processed set
         * @param messageId Message ID
         * @param channelId Optional channel ID for scoping
         */
        addProcessedMessageId: (messageId: string, channelId?: string) => {
          set((state) => {
            // Generate key for the processed message
            const key = unreadService.createProcessedMessageKey(
              messageId,
              channelId,
            );

            // Add to processed IDs set
            state.processedMessageIds.add(key);

            // Limit size to prevent memory issues - keep last 1000 messages
            if (state.processedMessageIds.size > 1000) {
              const messagesArray = Array.from(state.processedMessageIds);
              const toKeep = messagesArray.slice(-1000); // Keep most recent 1000
              state.processedMessageIds = new Set(toKeep);
            }
          });
        },

        /**
         * Clears all processed message IDs
         */
        clearProcessedMessageIds: () => {
          set((state) => {
            state.processedMessageIds.clear();
          });
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
          // Create a map of channels by team for calculation
          const channelsByTeam: Record<string, Channel[]> = {
            [teamId]: channels.filter((c) => c.team_id === teamId),
          };

          // Use the unread service for calculation
          return unreadService.calculateTeamUnreadCounts(
            channelsByTeam,
            get(),
            teamId,
          );
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
        getTotalUnreadCount: (): {
          msg_count: number;
          mention_count: number;
        } => {
          const channelsByTeam: Record<string, Channel[]> = {};
          let totalMessages = 0;
          let totalMentions = 0;

          // Calculate manually to avoid circular dependencies
          Object.entries(get().unreadCounts).forEach(([channelId, counts]) => {
            const isMuted = get().mutedChannels.has(channelId);

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
          set((state) => {
            state.unreadCounts = {};
            state.mutedChannels.clear();
            state.processedMessageIds.clear();
            state.teamUnreadCounts = {};
            state.lastFetchTimes = {};
            state.isLoading = false;
            state.loadingIds = [];
            state.error = null;
            state.errors = {};
          });
        },
      };
    }),
  ),
);

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
