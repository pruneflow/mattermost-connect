// src/hooks/useUnreadCounts.tsx
/**
 * Hook for managing unread counts across channels and teams
 * Optimized to minimize API calls and rely primarily on WebSocket updates
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useChannelStore,
  getTeamUnreadCounts,
  getTotalUnreadCounts,
  ChannelUnreadCount,
} from "../core/store/channelStore";
import { Channel } from "../core/store/channelStore";
import {
  useViewChannelMutation,
  useMarkAllChannelsAsReadMutation,
  useToggleChannelMutedMutation,
} from "../core/api/queries/channelQueries";
import { useAuthStore } from "../core/store/authStore";
import { Team } from "../core/store/teamStore";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS, invalidateQueries } from "../core/api/queryClient";
import { registerWsHandlers } from "../core/store/wsStore";
import { WebSocketEventType } from "../core/services/wsService";
import { apiClient } from "../core/api/client";

/**
 * Hook that provides utilities for working with unread counts
 * Optimized to load counts once and then rely on WebSocket updates
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
  const initialLoadCompleted = useRef(false);

  // Get query client for prefetching
  const queryClient = useQueryClient();

  // Get mutations
  const viewChannelMutation = useViewChannelMutation();
  const markAllChannelsAsReadMutation = useMarkAllChannelsAsReadMutation();
  const toggleChannelMutedMutation = useToggleChannelMutedMutation();

  function broadcastUnreadCountsUpdate() {
    // Créer un événement personnalisé
    const event = new CustomEvent("unreadCountsUpdated", {
      detail: getTeamUnreadCountsMap,
    });
    window.dispatchEvent(event);
  }

  /**
   * Loads initial unread counts for all channels in all teams
   * This is called once at startup to populate the initial unread state
   */
  const loadInitialUnreadCounts = useCallback(async () => {
    if (!currentUser || initialLoadCompleted.current) return;

    try {
      // 1. For each team, fetch team-level unread counts which include channel breakdowns
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

      broadcastUnreadCountsUpdate();

      // Mark initial load as completed
      initialLoadCompleted.current = true;
    } catch (error) {
      console.error("Error loading initial unread counts:", error);
    }
  }, [currentUser, channelsByTeam, updateUnreadCount]);

  /**
   * Prefetches unread counts for all teams to optimize the initial user experience
   * @param teams List of teams to prefetch counts for
   * @returns Promise that resolves when all prefetching is complete
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

              // Extraction des données de la réponse
              const unreadData = response.data;

              // Mettre à jour l'état global avec les compteurs de l'équipe
              const teamUnreads = {
                msg_count: unreadData.msg_count,
                mention_count: unreadData.mention_count,
              };

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

              return teamUnreads;
            } catch (error) {
              console.error(
                `Error prefetching unread counts for team ${team.id}:`,
                error,
              );
              return { msg_count: 0, mention_count: 0 };
            }
          },
          // Cache pendant 60 secondes
          staleTime: 60 * 1000,
        });

        prefetchPromises.push(prefetchPromise);
      }

      // Attendre que toutes les requêtes soient terminées
      return Promise.all(prefetchPromises)
        .then(() => {
          if (!initialLoadCompleted.current) {
            initialLoadCompleted.current = true;
          }
        })
        .catch((error) => {
          console.error(
            "Error during prefetching of team unread counts:",
            error,
          );
        });
    },
    [currentUser, queryClient, updateUnreadCount],
  );

  // Set up WebSocket handlers for managing unread counts
  useEffect(() => {
    if (!currentUser) return;

    // Load initial unread counts on first mount
    loadInitialUnreadCounts();

    // Set up WebSocket handlers to update unread counts in real-time
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
          // For active channel, we don't increment, but will mark as read after a delay
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
      },

      // Message deleted
      [WebSocketEventType.POST_DELETED]: (data) => {
        // Currently we don't decrement counts on deletion
        // This is consistent with Mattermost's behavior
      },

      // Channel viewed (by current user)
      [WebSocketEventType.CHANNEL_VIEWED]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
        }
      },

      // Team marked as read
      ["team_marked_read"]: (data) => {
        const { team_id: teamId, user_id: userId } = data;

        if (userId === currentUser.id && teamId) {
          markAllAsRead(teamId);
        }
      },

      // Channel marked as read
      ["channel_marked_read"]: (data) => {
        const { channel_id: channelId, user_id: userId } = data;

        if (userId === currentUser.id && channelId) {
          markAsRead(channelId);
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
    // Calculate from local state
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
   * Marks a channel as read
   * @param channelId Channel ID to mark as read
   * @returns Promise resolving to the channel ID
   */
  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      // Optimistically update the local state
      markAsRead(channelId);

      // Call the API
      return viewChannelMutation.mutateAsync(channelId);
    },
    [markAsRead, viewChannelMutation],
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

      // Call the API
      return markAllChannelsAsReadMutation.mutateAsync(teamId);
    },
    [markAllAsRead, markAllChannelsAsReadMutation],
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

      // Call the API
      return toggleChannelMutedMutation.mutateAsync({ channelId, muted });
    },
    [setChannelMuted, toggleChannelMutedMutation],
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
   * Gets formatted unread counts for all teams
   * @returns Record of team IDs to unread counts
   */
  const getTeamUnreadCountsMap = useMemo(() => {
    const result: Record<string, { msg_count: number; mention_count: number }> =
      {};

    Object.keys(channelsByTeam).forEach((teamId) => {
      result[teamId] = getTeamUnreadCounts(teamId);
    });

    return result;
  }, [channelsByTeam]);

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

  return {
    // State
    unreadCounts,
    totalUnreadCounts: getAllUnreadCounts(),
    teamUnreadCounts: getTeamUnreadCountsMap,
    initialLoadCompleted: initialLoadCompleted.current,

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
  };
}

/**
 * Hook that provides simplified unread counts for a specific channel
 * @param channelId Channel ID to get unread counts for
 * @returns Unread count state and actions for the specific channel
 */
export function useChannelUnreadCount(channelId: string | undefined) {
  const {
    getChannelUnreadCount,
    markChannelAsRead,
    toggleChannelMuted,
    isChannelMuted,
  } = useUnreadCounts();

  // Get unread count for this channel from local state
  const unreadCount = useMemo(() => {
    if (!channelId) return { msg_count: 0, mention_count: 0, isMuted: false };
    return getChannelUnreadCount(channelId);
  }, [channelId, getChannelUnreadCount]);

  // Check if channel has unreads or mentions
  const hasUnreads = useMemo(() => {
    return unreadCount.msg_count > 0;
  }, [unreadCount.msg_count]);

  const hasMentions = useMemo(() => {
    return unreadCount.mention_count > 0;
  }, [unreadCount.mention_count]);

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
    isLoading: false, // We're using local state, so never loading
  };
}

/**
 * Hook that provides simplified unread counts for a specific team
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
    isLoading: false, // We're using local state, so never loading
  };
}
