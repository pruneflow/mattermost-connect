// src/hooks/useUnreadCounts.tsx
/**
 * Hook for managing unread counts across channels and teams
 * Optimized to minimize API calls and rely on WebSocket updates
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useChannelStore,
  getTeamUnreadCounts,
  getTotalUnreadCounts,
  ChannelUnreadCount,
  Channel,
} from "../core/store/channelStore";
import {
  useViewChannelMutation,
  useMarkAllChannelsAsReadMutation,
  useToggleChannelMutedMutation,
} from "../core/api/queries/channelQueries";
import { useAuthStore } from "../core/store/authStore";
import { Team } from "../core/store/teamStore";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../core/api/queryClient";
import { registerWsHandlers } from "../core/store/wsStore";
import { WebSocketEventType } from "../core/services/wsService";
import { apiClient } from "../core/api/client";
import { debounce } from "../utils/mattermostUtils";

/**
 * Custom event interface for unread count updates
 */
interface UnreadCountsUpdatedEvent extends CustomEvent {
  detail: Record<string, { msg_count: number; mention_count: number }>;
}

/**
 * Hook that provides utilities for working with unread counts
 * Optimized to load counts once and rely on WebSocket updates
 */
export function useUnreadCounts() {
  // Get store state and actions
  const {
    unreadCounts,
    channelsByTeam,
    activeChannel,
    updateUnreadCount,
    incrementUnreadCount,
    markAsRead,
    markAllAsRead,
    setChannelMuted,
  } = useChannelStore();

  // Get current user
  const { currentUser } = useAuthStore();

  // Track if initial unread counts have been loaded
  const initialLoadCompletedRef = useRef(false);

  // Get query client for prefetching
  const queryClient = useQueryClient();

  // Get mutations
  const viewChannelMutation = useViewChannelMutation();
  const markAllChannelsAsReadMutation = useMarkAllChannelsAsReadMutation();
  const toggleChannelMutedMutation = useToggleChannelMutedMutation();

  /**
   * Broadcasts an event when unread counts are updated
   * UI components can listen to this event to refresh their state
   */
  const broadcastUnreadCountsUpdate = useCallback(() => {
    // Create a custom event with the current team unread counts
    const teamUnreadCounts = getTeamUnreadCountsMap();
    const event = new CustomEvent("unreadCountsUpdated", {
      detail: teamUnreadCounts,
    });
    window.dispatchEvent(event);
  }, []);

  /**
   * Debounced version of the broadcast function to prevent excessive events
   */
  const debouncedBroadcastUpdate = useMemo(
    () => debounce(broadcastUnreadCountsUpdate, 150),
    [broadcastUnreadCountsUpdate],
  );

  /**
   * Loads initial unread counts for all channels in all teams
   * Called once at startup to populate the initial unread state
   */
  const loadInitialUnreadCounts = useCallback(async () => {
    if (!currentUser || initialLoadCompletedRef.current) return;

    try {
      // For each team, fetch team-level unread counts which include channel breakdowns
      // This is more efficient than individual channel requests
      const teamIds = Object.keys(channelsByTeam);

      for (const teamId of teamIds) {
        try {
          const response = await apiClient.get<{
            msg_count: number;
            mention_count: number;
            mention_count_by_channel?: Record<string, number>;
            msg_count_by_channel?: Record<string, number>;
          }>(`users/${currentUser.id}/teams/${teamId}/unread`);

          // If we have per-channel breakdowns, update each channel's unread counts
          if (
            response.data.mention_count_by_channel &&
            response.data.msg_count_by_channel
          ) {
            Object.entries(response.data.msg_count_by_channel).forEach(
              ([channelId, msgCount]) => {
                const mentionCount =
                  response.data.mention_count_by_channel?.[channelId] || 0;

                // Update store with per-channel data
                updateUnreadCount(channelId, msgCount, mentionCount);
              },
            );
          }
        } catch (error) {
          console.error(
            `Error loading unread counts for team ${teamId}:`,
            error,
          );
        }
      }

      // Broadcast updates to any listening components
      debouncedBroadcastUpdate();

      // Mark initial load as completed
      initialLoadCompletedRef.current = true;
    } catch (error) {
      console.error("Error loading initial unread counts:", error);
    }
  }, [
    currentUser,
    channelsByTeam,
    updateUnreadCount,
    debouncedBroadcastUpdate,
  ]);

  /**
   * Prefetches unread counts for all teams to optimize initial user experience
   * @param teams List of teams to prefetch counts for
   * @returns Promise that resolves when prefetching is complete
   */
  const prefetchAllTeamUnreadCounts = useCallback(
    async (teams: Team[]): Promise<void> => {
      if (!currentUser || teams.length === 0) {
        return Promise.resolve();
      }

      const prefetchPromises: Promise<any>[] = [];

      for (const team of teams) {
        const prefetchPromise = queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.unread.byTeam(team.id),
          queryFn: async () => {
            try {
              const response = await apiClient.get<{
                msg_count: number;
                mention_count: number;
                mention_count_by_channel?: Record<string, number>;
                msg_count_by_channel?: Record<string, number>;
              }>(`users/${currentUser.id}/teams/${team.id}/unread`);

              // Extract data from response
              const unreadData = response.data;

              // If we have per-channel breakdowns, update channel unread counts
              if (
                unreadData.mention_count_by_channel &&
                unreadData.msg_count_by_channel
              ) {
                Object.entries(unreadData.msg_count_by_channel).forEach(
                  ([channelId, msgCount]) => {
                    const mentionCount =
                      unreadData.mention_count_by_channel?.[channelId] || 0;

                    updateUnreadCount(channelId, msgCount, mentionCount);
                  },
                );
              }

              // Return team-level totals
              return {
                msg_count: unreadData.msg_count,
                mention_count: unreadData.mention_count,
              };
            } catch (error) {
              console.error(
                `Error prefetching unread counts for team ${team.id}:`,
                error,
              );
              return { msg_count: 0, mention_count: 0 };
            }
          },
          // Cache for 60 seconds
          staleTime: 60 * 1000,
        });

        prefetchPromises.push(prefetchPromise);
      }

      // Wait for all prefetch requests to complete
      return Promise.all(prefetchPromises)
        .then(() => {
          if (!initialLoadCompletedRef.current) {
            initialLoadCompletedRef.current = true;
            debouncedBroadcastUpdate();
          }
        })
        .catch((error) => {
          console.error("Error during team unread counts prefetching:", error);
        });
    },
    [currentUser, queryClient, updateUnreadCount, debouncedBroadcastUpdate],
  );

  // Set up WebSocket handlers for managing unread counts in real-time
  useEffect(() => {
    if (!currentUser) return;

    // Load initial unread counts on first mount if needed
    if (!initialLoadCompletedRef.current) {
      loadInitialUnreadCounts();
    }

    // Set up WebSocket handlers for real-time unread count updates
    const unsubscribe = registerWsHandlers({
      // New message posted
      [WebSocketEventType.POSTED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId || !currentUser) return;

        // Parse the post data
        const postData = typeof post === "string" ? JSON.parse(post) : post;

        // Don't increment for own messages
        if (postData.user_id === currentUser.id) return;

        // Check if this is the active channel
        const activeChannelId = activeChannel?.id;
        if (activeChannelId === channelId) {
          // For active channel, don't increment, but mark as read after delay
          setTimeout(() => markAsRead(channelId), 2000);
          return;
        }

        // Check for mentions
        const mentionsUser =
          postData.props?.mentions?.includes(currentUser.id) || false;

        // Increment unread counts
        incrementUnreadCount(
          channelId,
          1, // One new message
          mentionsUser ? 1 : 0, // Increment mentions if mentioned
          postData.id,
        );

        // Broadcast updates for real-time UI reactions
        debouncedBroadcastUpdate();
      },

      // Message edited (could add a mention)
      [WebSocketEventType.POST_EDITED]: (data) => {
        const { post, channel_id: channelId } = data;

        if (!post || !channelId || !currentUser) return;

        // Parse the post data
        const postData = typeof post === "string" ? JSON.parse(post) : post;

        // Check if this edit added a mention to the current user
        const mentionsUser =
          postData.props?.mentions?.includes(currentUser.id) || false;

        if (mentionsUser) {
          // Get current unread state for this channel
          const channelUnread = useChannelStore.getState().unreadCounts[
            channelId
          ] || {
            msg_count: 0,
            mention_count: 0,
          };

          // If we're already counting as unread but no mention, add a mention
          if (
            channelUnread.msg_count > 0 &&
            channelUnread.mention_count === 0
          ) {
            incrementUnreadCount(channelId, 0, 1, postData.id);
            debouncedBroadcastUpdate();
          }
        }
      },

      // Channel viewed (by current user)
      [WebSocketEventType.CHANNEL_VIEWED]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
          debouncedBroadcastUpdate();
        }
      },

      // Team marked as read
      ["team_marked_read"]: (data) => {
        const { team_id: teamId, user_id: userId } = data;

        if (userId === currentUser.id && teamId) {
          markAllAsRead(teamId);
          debouncedBroadcastUpdate();
        }
      },

      // Channel marked as read
      ["channel_marked_read"]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
          debouncedBroadcastUpdate();
        }
      },
    });

    return unsubscribe;
  }, [
    currentUser,
    activeChannel,
    incrementUnreadCount,
    markAsRead,
    markAllAsRead,
    loadInitialUnreadCounts,
    debouncedBroadcastUpdate,
  ]);

  /**
   * Gets unread count for a specific channel
   * @param channelId Channel ID
   * @returns Unread count object or default empty counts
   */
  const getChannelUnreadCount = useCallback(
    (channelId: string): ChannelUnreadCount => {
      return (
        unreadCounts[channelId] || {
          msg_count: 0,
          mention_count: 0,
          isMuted: false,
        }
      );
    },
    [unreadCounts],
  );

  /**
   * Gets total unread counts for a team
   * @param teamId Team ID
   * @returns Object with message and mention counts
   */
  const getUnreadCountsByTeam = useCallback((teamId: string) => {
    return getTeamUnreadCounts(teamId);
  }, []);

  /**
   * Gets total unread counts across all teams
   * @returns Object with message and mention counts
   */
  const getAllUnreadCounts = useCallback(() => {
    return getTotalUnreadCounts();
  }, []);

  /**
   * Gets unread counts for all channels in a team
   * @param teamId Team ID
   * @returns Record of channel IDs to unread counts
   */
  const getChannelUnreadCountsByTeam = useCallback(
    (teamId: string): Record<string, ChannelUnreadCount> => {
      const teamChannels = channelsByTeam[teamId] || [];
      const result: Record<string, ChannelUnreadCount> = {};

      teamChannels.forEach((channel) => {
        result[channel.id] = getChannelUnreadCount(channel.id);
      });

      return result;
    },
    [channelsByTeam, getChannelUnreadCount],
  );

  /**
   * Gets formatted unread counts for all teams
   * @returns Record of team IDs to unread counts
   */
  const getTeamUnreadCountsMap = useCallback(() => {
    const result: Record<string, { msg_count: number; mention_count: number }> =
      {};

    Object.keys(channelsByTeam).forEach((teamId) => {
      result[teamId] = getTeamUnreadCounts(teamId);
    });

    return result;
  }, [channelsByTeam]);

  /**
   * Marks a channel as read
   * @param channelId Channel ID to mark as read
   * @returns Promise resolving to the channel ID
   */
  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      // Optimistically update the local state
      markAsRead(channelId);

      // Notify UI components of the change
      debouncedBroadcastUpdate();

      // Call the API to confirm the change
      return viewChannelMutation.mutateAsync(channelId);
    },
    [markAsRead, viewChannelMutation, debouncedBroadcastUpdate],
  );

  /**
   * Marks all channels in a team as read
   * @param teamId Team ID
   * @returns Promise resolving to the team ID
   */
  const markTeamAsRead = useCallback(
    async (teamId: string) => {
      // Optimistically update the local state
      markAllAsRead(teamId);

      // Notify UI components of the change
      debouncedBroadcastUpdate();

      // Call the API to confirm the change
      return markAllChannelsAsReadMutation.mutateAsync(teamId);
    },
    [markAllAsRead, markAllChannelsAsReadMutation, debouncedBroadcastUpdate],
  );

  /**
   * Toggles whether a channel is muted
   * @param channelId Channel ID
   * @param muted Whether the channel should be muted
   * @returns Promise resolving when completed
   */
  const toggleChannelMuted = useCallback(
    async (channelId: string, muted: boolean) => {
      // Optimistically update the local state
      setChannelMuted(channelId, muted);

      // Notify UI components of the change
      debouncedBroadcastUpdate();

      // Call the API to confirm the change
      return toggleChannelMutedMutation.mutateAsync({ channelId, muted });
    },
    [setChannelMuted, toggleChannelMutedMutation, debouncedBroadcastUpdate],
  );

  /**
   * Checks if there are any unread messages in a team
   * @param teamId Team ID
   * @returns True if there are unread messages or mentions
   */
  const hasUnreadsInTeam = useCallback((teamId: string): boolean => {
    const counts = getTeamUnreadCounts(teamId);
    return counts.msg_count > 0 || counts.mention_count > 0;
  }, []);

  /**
   * Checks if there are any unread mentions in a team
   * @param teamId Team ID
   * @returns True if there are unread mentions
   */
  const hasMentionsInTeam = useCallback((teamId: string): boolean => {
    const counts = getTeamUnreadCounts(teamId);
    return counts.mention_count > 0;
  }, []);

  /**
   * Checks if a specific channel has unread messages
   * @param channelId Channel ID
   * @returns True if the channel has unread messages
   */
  const hasUnreadsInChannel = useCallback(
    (channelId: string): boolean => {
      const counts = getChannelUnreadCount(channelId);
      return counts.msg_count > 0 || counts.mention_count > 0;
    },
    [getChannelUnreadCount],
  );

  /**
   * Checks if a specific channel has unread mentions
   * @param channelId Channel ID
   * @returns True if the channel has unread mentions
   */
  const hasMentionsInChannel = useCallback(
    (channelId: string): boolean => {
      const counts = getChannelUnreadCount(channelId);
      return counts.mention_count > 0;
    },
    [getChannelUnreadCount],
  );

  /**
   * Gets whether a channel is currently muted
   * @param channelId Channel ID
   * @returns True if the channel is muted
   */
  const isChannelMuted = useCallback(
    (channelId: string): boolean => {
      const counts = getChannelUnreadCount(channelId);
      return !!counts.isMuted;
    },
    [getChannelUnreadCount],
  );

  // Use memoized value for teamUnreadCounts to improve performance
  const teamUnreadCounts = useMemo(() => {
    return getTeamUnreadCountsMap();
  }, [getTeamUnreadCountsMap, unreadCounts]);

  return {
    // State
    unreadCounts,
    totalUnreadCounts: getAllUnreadCounts(),
    teamUnreadCounts,
    initialLoadCompleted: initialLoadCompletedRef.current,

    // Loading states
    isMarkingAsRead: viewChannelMutation.isPending,
    isMarkingTeamAsRead: markAllChannelsAsReadMutation.isPending,
    isTogglingMuted: toggleChannelMutedMutation.isPending,

    // Methods
    loadInitialUnreadCounts,
    prefetchAllTeamUnreadCounts,
    getChannelUnreadCount,
    getUnreadCountsByTeam,
    getAllUnreadCounts,
    getChannelUnreadCountsByTeam,
    markChannelAsRead,
    markTeamAsRead,
    toggleChannelMuted,
    hasUnreadsInTeam,
    hasMentionsInTeam,
    hasUnreadsInChannel,
    hasMentionsInChannel,
    isChannelMuted,
    broadcastUnreadCountsUpdate,
    getTeamUnreadCountsMap,
  };
}

/**
 * Hook that provides simplified unread counts for a specific channel
 * Optimized for use in individual channel components
 * @param channelId Channel ID to get unread counts for
 * @returns Unread count state and actions for the specific channel
 */
export function useChannelUnreadCount(channelId: string | undefined) {
  const {
    getChannelUnreadCount,
    markChannelAsRead,
    toggleChannelMuted,
    isChannelMuted,
    hasMentionsInChannel,
    hasUnreadsInChannel,
  } = useUnreadCounts();

  // Get unread count for this channel from local state
  const unreadCount = useMemo(() => {
    if (!channelId) return { msg_count: 0, mention_count: 0, isMuted: false };
    return getChannelUnreadCount(channelId);
  }, [channelId, getChannelUnreadCount]);

  // Check if channel has unreads or mentions
  const hasUnreads = useMemo(() => {
    if (!channelId) return false;
    return hasUnreadsInChannel(channelId);
  }, [channelId, hasUnreadsInChannel]);

  const hasMentions = useMemo(() => {
    if (!channelId) return false;
    return hasMentionsInChannel(channelId);
  }, [channelId, hasMentionsInChannel]);

  // Check if channel is muted
  const muted = useMemo(() => {
    if (!channelId) return false;
    return isChannelMuted(channelId);
  }, [channelId, isChannelMuted]);

  // Function to mark this channel as read
  const markAsRead = useCallback(async () => {
    if (!channelId) return;
    return markChannelAsRead(channelId);
  }, [channelId, markChannelAsRead]);

  // Function to toggle mute status for this channel
  const toggleMuted = useCallback(
    async (muted: boolean) => {
      if (!channelId) return;
      return toggleChannelMuted(channelId, muted);
    },
    [channelId, toggleChannelMuted],
  );

  return {
    unreadCount,
    hasUnreads,
    hasMentions,
    muted,
    markAsRead,
    toggleMuted,
    // Using local state, so never loading
    isLoading: false,
  };
}

/**
 * Hook that provides simplified unread counts for a specific team
 * Optimized for use in individual team components
 * @param teamId Team ID to get unread counts for
 * @returns Unread count state and actions for the specific team
 */
export function useTeamUnreadCount(teamId: string | undefined) {
  const {
    getUnreadCountsByTeam,
    markTeamAsRead,
    hasUnreadsInTeam,
    hasMentionsInTeam,
  } = useUnreadCounts();

  // Get unread counts for this team from local state
  const unreadCount = useMemo(() => {
    if (!teamId) return { msg_count: 0, mention_count: 0 };
    return getUnreadCountsByTeam(teamId);
  }, [teamId, getUnreadCountsByTeam]);

  // Check if team has unreads or mentions
  const hasUnreads = useMemo(() => {
    if (!teamId) return false;
    return hasUnreadsInTeam(teamId);
  }, [teamId, hasUnreadsInTeam]);

  const hasMentions = useMemo(() => {
    if (!teamId) return false;
    return hasMentionsInTeam(teamId);
  }, [teamId, hasMentionsInTeam]);

  // Function to mark all channels in this team as read
  const markAllAsRead = useCallback(async () => {
    if (!teamId) return;
    return markTeamAsRead(teamId);
  }, [teamId, markTeamAsRead]);

  return {
    unreadCount,
    hasUnreads,
    hasMentions,
    markAllAsRead,
    // Using local state, so never loading
    isLoading: false,
  };
}

/**
 * Hook to listen for unread count updates via custom events
 * @param onUpdate Callback to run when unread counts are updated
 */
export function useUnreadCountsListener(
  onUpdate: (
    counts: Record<string, { msg_count: number; mention_count: number }>,
  ) => void,
) {
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as UnreadCountsUpdatedEvent;
      onUpdate(customEvent.detail);
    };

    window.addEventListener("unreadCountsUpdated", handleUpdate);
    return () => {
      window.removeEventListener("unreadCountsUpdated", handleUpdate);
    };
  }, [onUpdate]);
}
