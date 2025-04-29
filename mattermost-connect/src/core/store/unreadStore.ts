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
  EventType,
  ErrorSource,
  UnreadState,
} from "../../types";
import { unreadService } from "../services/unreadService";
import { createCommonSlice } from "./slices/commonSlice";
import { emitEvent } from "../api/eventUtils";
import { handleError } from "./errorStore";

/**
 * Unread store implementation with Zustand
 * Uses immer middleware for immutable state updates
 * Uses subscribeWithSelector for observing state changes
 */
export const useUnreadStore = create<
  UnreadState & {
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

    // Reset
    reset: () => void;
  }
>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<UnreadState>(set);

      return {
        // Include common slice for standardized state
        ...commonSlice,

        // Initial state
        unreadCounts: {},
        mutedChannels: new Set<string>(),
        processedMessageIds: new Set<string>(),
        teamUnreadCounts: {},

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
          try {
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
              state.lastUpdated = Date.now();
            });

            // Get updated unread count for event
            const unreadCount = get().unreadCounts[channelId];

            // Emit unread updated event
            emitEvent(EventType.UNREAD_UPDATED, {
              channelId,
              unreadCount,
              timestamp: Date.now(),
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "updateUnreadCount",
              channelId,
              msgCount,
              mentionCount,
            });
          }
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
          try {
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
              state.lastUpdated = Date.now();
            });

            // Get updated unread count for event
            const unreadCount = get().unreadCounts[channelId];

            // Emit unread updated event
            emitEvent(EventType.UNREAD_UPDATED, {
              channelId,
              unreadCount,
              timestamp: Date.now(),
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "incrementUnreadCount",
              channelId,
              messageIncrement,
              mentionIncrement,
              messageId,
            });
          }
        },

        /**
         * Marks a channel as read
         * @param channelId Channel ID
         */
        markAsRead: (channelId: string) => {
          try {
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

              // Update unread counts
              state.unreadCounts[channelId] = {
                ...existingUnread,
                msg_count: 0,
                mention_count: 0,
                lastViewedAt: Date.now(),
                isMuted: state.mutedChannels.has(channelId),
              };

              // Update last fetch time
              state.lastFetchTimes[channelId] = Date.now();
              state.lastUpdated = Date.now();
            });

            // Emit marked read event
            unreadService.notifyMarkedRead(channelId);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "markAsRead",
              channelId,
            });
          }
        },

        /**
         * Marks all channels in a team as read
         * @param teamId Team ID
         * @param channelIds Optional specific channel IDs
         */
        markAllAsRead: (teamId: string, channelIds?: string[]) => {
          try {
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
              state.lastUpdated = now;
            });

            // Emit team marked read event
            emitEvent(EventType.UNREAD_MARKED_READ, {
              teamId,
              channelIds: channelIds || Object.keys(get().unreadCounts),
              timestamp: Date.now(),
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "markAllAsRead",
              teamId,
              channelIds,
            });
          }
        },

        /**
         * Sets whether a channel is muted
         * @param channelId Channel ID
         * @param isMuted Whether to mute
         */
        setChannelMuted: (channelId: string, isMuted: boolean) => {
          try {
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

              state.lastUpdated = Date.now();
            });

            // Emit settings changed event for muted channel
            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: "MUTED_CHANNELS",
              channelId,
              value: isMuted,
              timestamp: Date.now(),
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setChannelMuted",
              channelId,
              isMuted,
            });
          }
        },

        /**
         * Adds a message ID to the processed set
         * @param messageId Message ID
         * @param channelId Optional channel ID for scoping
         */
        addProcessedMessageId: (messageId: string, channelId?: string) => {
          try {
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

              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "addProcessedMessageId",
              messageId,
              channelId,
            });
          }
        },

        /**
         * Clears all processed message IDs
         */
        clearProcessedMessageIds: () => {
          try {
            set((state) => {
              state.processedMessageIds.clear();
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "clearProcessedMessageIds",
            });
          }
        },

        /**
         * Gets unread count for a channel
         * @param channelId Channel ID
         * @returns Channel unread count
         */
        getChannelUnreadCount: (channelId: string): ChannelUnreadCount => {
          try {
            const { unreadCounts, mutedChannels } = get();

            return (
              unreadCounts[channelId] || {
                msg_count: 0,
                mention_count: 0,
                isMuted: mutedChannels.has(channelId),
              }
            );
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getChannelUnreadCount",
              channelId,
            });

            // Return safe default
            return {
              msg_count: 0,
              mention_count: 0,
              isMuted: false,
            };
          }
        },

        /**
         * Checks if a channel has unread messages
         * @param channelId Channel ID
         * @returns Whether channel has unreads
         */
        hasUnreadsInChannel: (channelId: string): boolean => {
          try {
            const unreadCount = get().getChannelUnreadCount(channelId);
            return unreadCount.msg_count > 0 || unreadCount.mention_count > 0;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "hasUnreadsInChannel",
              channelId,
            });
            return false;
          }
        },

        /**
         * Checks if a channel has mentions
         * @param channelId Channel ID
         * @returns Whether channel has mentions
         */
        hasMentionsInChannel: (channelId: string): boolean => {
          try {
            const unreadCount = get().getChannelUnreadCount(channelId);
            return unreadCount.mention_count > 0;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "hasMentionsInChannel",
              channelId,
            });
            return false;
          }
        },

        /**
         * Checks if a channel is muted
         * @param channelId Channel ID
         * @returns Whether channel is muted
         */
        isChannelMuted: (channelId: string): boolean => {
          try {
            return get().mutedChannels.has(channelId);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "isChannelMuted",
              channelId,
            });
            return false;
          }
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
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getTeamUnreadCount",
              teamId,
              channelCount: channels.length,
            });

            // Return safe default
            return { msg_count: 0, mention_count: 0 };
          }
        },

        /**
         * Checks if a team has unread messages
         * @param teamId Team ID
         * @param channels Team channels
         * @returns Whether team has unreads
         */
        hasUnreadsInTeam: (teamId: string, channels: Channel[]): boolean => {
          try {
            const counts = get().getTeamUnreadCount(teamId, channels);
            return counts.msg_count > 0 || counts.mention_count > 0;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "hasUnreadsInTeam",
              teamId,
            });
            return false;
          }
        },

        /**
         * Checks if a team has mentions
         * @param teamId Team ID
         * @param channels Team channels
         * @returns Whether team has mentions
         */
        hasMentionsInTeam: (teamId: string, channels: Channel[]): boolean => {
          try {
            const counts = get().getTeamUnreadCount(teamId, channels);
            return counts.mention_count > 0;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "hasMentionsInTeam",
              teamId,
            });
            return false;
          }
        },

        /**
         * Gets total unread count across all teams
         * @returns Total unread counts
         */
        getTotalUnreadCount: (): {
          msg_count: number;
          mention_count: number;
        } => {
          try {
            let totalMessages = 0;
            let totalMentions = 0;

            // Calculate manually to avoid circular dependencies
            Object.entries(get().unreadCounts).forEach(
              ([channelId, counts]) => {
                const isMuted = get().mutedChannels.has(channelId);

                // Always count mentions
                totalMentions += counts.mention_count;

                // Only count messages for non-muted channels
                if (!isMuted) {
                  totalMessages += counts.msg_count;
                }
              },
            );

            return { msg_count: totalMessages, mention_count: totalMentions };
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getTotalUnreadCount",
            });

            // Return safe default
            return { msg_count: 0, mention_count: 0 };
          }
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          try {
            set((state) => {
              // Reset domain-specific state
              state.unreadCounts = {};
              state.mutedChannels = new Set();
              state.processedMessageIds = new Set();
              state.teamUnreadCounts = {};

              // Reset common state from CommonSlice
              state.isLoading = false;
              state.loadingIds = [];
              state.error = null;
              state.errors = {};
              state.lastFetchTimes = {};
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "reset",
            });
          }
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
  try {
    return useUnreadStore.getState().getTeamUnreadCount(teamId, channels);
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getTeamUnreadCounts",
      teamId,
    });
    return { msg_count: 0, mention_count: 0 };
  }
}

/**
 * Helper function to get total unread counts
 * @returns Total unread counts
 */
export function getTotalUnreadCounts(): {
  msg_count: number;
  mention_count: number;
} {
  try {
    return useUnreadStore.getState().getTotalUnreadCount();
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getTotalUnreadCounts",
    });
    return { msg_count: 0, mention_count: 0 };
  }
}

/**
 * Formats unread counts for display
 * @param channelId Channel ID
 * @param maxCount Maximum count to display before abbreviating
 * @returns Formatted unread count display
 */
export function formatUnreadDisplay(
  channelId: string,
  maxCount: number = 99,
): string {
  try {
    const unreadStore = useUnreadStore.getState();
    const { msg_count, mention_count } =
      unreadStore.getChannelUnreadCount(channelId);

    if (mention_count > 0) {
      // Priority to mentions
      return mention_count > maxCount
        ? `${maxCount}+`
        : mention_count.toString();
    } else if (msg_count > 0) {
      // Then unreads
      return msg_count > maxCount ? `${maxCount}+` : msg_count.toString();
    }

    return "";
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "formatUnreadDisplay",
      channelId,
    });
    return "";
  }
}
