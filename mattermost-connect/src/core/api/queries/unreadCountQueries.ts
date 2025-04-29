// src/core/api/queries/unreadCountQueries.ts
/**
 * React Query hooks for unread count operations
 * Optimized hooks for fetching and managing unread counts
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { useAuthStore, useUnreadStore, useChannelStore } from "../../store";
import { ChannelUnreadCount, Message, ApiError } from "../../../types";
import { createQueryOptions, createMutationOptions } from "../queryUtils";

/**
 * Response type for unread messages query
 */
interface UnreadMessagesResponse {
  messages: Message[];
  msg_count: number;
  mention_count: number;
}

/**
 * Hook that fetches unread count for a specific channel
 * @param channelId Channel ID
 * @returns Query hook for the channel's unread count
 */
export const useChannelUnreadCountQuery = (channelId: string | undefined) => {
  const { updateUnreadCount } = useUnreadStore();
  const { currentUser } = useAuthStore();

  return useQuery<ChannelUnreadCount, ApiError>({
    queryKey: channelId
      ? QUERY_KEYS.channels.unreadCount(channelId)
      : ["channelUnreadCount", "undefined"],
    queryFn: async () => {
      if (!channelId || !currentUser) {
        throw new Error("Channel ID and current user are required");
      }

      // Use the correct Mattermost API endpoint
      const response = await apiClient.get<{
        msg_count: number;
        mention_count: number;
        last_viewed_at: number;
        last_update_at: number;
      }>(`users/${currentUser.id}/channels/${channelId}/unread`);

      // Map response to our internal ChannelUnreadCount format
      const unreadData: ChannelUnreadCount = {
        msg_count: response.data.msg_count,
        mention_count: response.data.mention_count,
        lastViewedAt: response.data.last_viewed_at,
      };

      // Get the channel for totalMessageCount
      let totalMsgCount: number | undefined;
      try {
        const channel = useChannelStore.getState().getChannelById(channelId);
        totalMsgCount = channel?.total_msg_count;

        // Update the unreadCount in the store
        updateUnreadCount(
          channelId,
          unreadData.msg_count,
          unreadData.mention_count,
          undefined, // last message ID (not available from this API)
          unreadData.lastViewedAt,
          totalMsgCount,
        );
      } catch (error) {
        console.error(
          `Error updating unread count for channel ${channelId}:`,
          error,
        );
      }

      return unreadData;
    },
    // Only run query if we have required parameters
    enabled: !!channelId && !!currentUser,
    ...createQueryOptions("unread", {
      // Cache data for 30 seconds
      staleTime: 30 * 1000,
    }),
  });
};

/**
 * Hook that fetches unread counts for a team
 * @param teamId Team ID
 * @returns Query hook for the team's unread counts
 */
export const useTeamUnreadCountQuery = (teamId: string | undefined) => {
  const { updateUnreadCount } = useUnreadStore();
  const { currentUser } = useAuthStore();

  return useQuery<{ msg_count: number; mention_count: number }, ApiError>({
    queryKey: teamId
      ? QUERY_KEYS.unread.byTeam(teamId)
      : ["teamUnreadCount", "undefined"],
    queryFn: async () => {
      if (!teamId || !currentUser) {
        throw new Error("Team ID and current user are required");
      }

      // Use the correct Mattermost API endpoint
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
            const mention_count =
              response.data.mention_count_by_channel?.[channelId] || 0;

            // Update the store with per-channel data
            updateUnreadCount(channelId, msgCount, mention_count);
          },
        );
      }

      return {
        msg_count: response.data.msg_count,
        mention_count: response.data.mention_count,
      };
    },
    // Only run query if we have required parameters
    enabled: !!teamId && !!currentUser,
    ...createQueryOptions("unread", {
      // Cache data for 30 seconds
      staleTime: 30 * 1000,
    }),
  });
};

/**
 * Hook that fetches unread messages for a channel since a specific time
 * @param channelId Channel ID
 * @param sinceTimestamp Timestamp to fetch messages from
 * @returns Query hook for the channel's unread messages
 */
export const useUnreadMessagesQuery = (
  channelId: string | undefined,
  sinceTimestamp?: number,
) => {
  const { incrementUnreadCount } = useUnreadStore();
  const { currentUser } = useAuthStore();

  return useQuery<UnreadMessagesResponse, ApiError>({
    queryKey:
      channelId && sinceTimestamp
        ? QUERY_KEYS.messages.since(channelId, sinceTimestamp)
        : ["unreadMessages", "undefined"],
    queryFn: async () => {
      if (!channelId || !sinceTimestamp || !currentUser) {
        throw new Error("Channel ID, timestamp, and current user are required");
      }

      // Convert milliseconds to seconds for Mattermost API
      const sinceSeconds = Math.floor(sinceTimestamp / 1000);

      // Fetch unread messages
      const response = await apiClient.get<{
        order: string[];
        posts: Record<string, Message>;
      }>(`channels/${channelId}/posts?since=${sinceSeconds}`);

      // Process messages
      const messages: Message[] = [];
      let mention_count = 0;

      response.data.order.forEach((postId) => {
        const message = response.data.posts[postId];

        // Skip messages from the current user
        if (message.user_id === currentUser.id) {
          return;
        }

        messages.push(message);

        // Check for mentions
        if (
          message.props &&
          message.props.mentions &&
          Array.isArray(message.props.mentions) &&
          message.props.mentions.includes(currentUser.id)
        ) {
          mention_count++;
        }
      });

      // Update store
      if (messages.length > 0) {
        incrementUnreadCount(
          channelId,
          messages.length,
          mention_count,
          // Use the most recent message ID if available
          messages.length > 0 ? messages[0].id : undefined,
        );
      }

      return {
        messages,
        msg_count: messages.length,
        mention_count,
      };
    },
    enabled: !!channelId && !!sinceTimestamp && !!currentUser,
    ...createQueryOptions("unread", {
      // Don't cache for too long
      staleTime: 15 * 1000, // 15 seconds
    }),
  });
};

/**
 * Hook for marking a channel as viewed
 * @returns Mutation hook for marking a channel as viewed
 */
export const useViewChannelMutation = () => {
  const { markAsRead } = useUnreadStore();
  const { getChannelById } = useChannelStore();

  return useMutation<string, ApiError, string>({
    mutationFn: async (channelId: string) => {
      await apiClient.post("channels/members/me/view", {
        channel_id: channelId,
      });
      return channelId;
    },
    onSuccess: (channelId) => {
      // Optimistically update store
      markAsRead(channelId);

      // Invalidate queries to ensure fresh data
      invalidateQueries.channelUnreadCount(channelId);

      // Get the channel to find its team
      const channel = getChannelById(channelId);
      if (channel?.team_id) {
        invalidateQueries.allUnreadCounts();
      }
    },
    ...createMutationOptions(),
  });
};

/**
 * Hook for marking all channels in a team as read
 * @returns Mutation hook for marking all channels as read
 */
export const useMarkAllChannelsAsReadMutation = () => {
  const { markAllAsRead } = useUnreadStore();

  return useMutation<string, ApiError, string>({
    mutationFn: async (teamId: string) => {
      await apiClient.post(`teams/${teamId}/channels/members/me/mark_read`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Optimistically update store
      markAllAsRead(teamId);

      // Invalidate queries to ensure fresh data
      invalidateQueries.allUnreadCounts();
    },
    ...createMutationOptions(),
  });
};

/**
 * Hook for toggling channel muted state
 * @returns Mutation hook for toggling muted state
 */
export const useToggleChannelMutedMutation = () => {
  const { setChannelMuted } = useUnreadStore();

  return useMutation<
    { channelId: string; muted: boolean },
    ApiError,
    { channelId: string; muted: boolean }
  >({
    mutationFn: async ({ channelId, muted }) => {
      // Create preference object
      const preference = {
        user_id: "me",
        category: "channel_notifications",
        name: channelId,
        value: muted ? "true" : "false",
      };

      // Save preference
      await apiClient.post("preferences", [preference]);
      return { channelId, muted };
    },
    onSuccess: ({ channelId, muted }) => {
      // Optimistically update store
      setChannelMuted(channelId, muted);

      // Invalidate queries to ensure fresh data
      invalidateQueries.channelUnreadCount(channelId);
    },
    ...createMutationOptions(),
  });
};

/**
 * Hook for acknowledging a new message without marking entire channel as read
 * @returns Mutation hook for acknowledging a message
 */
export const useAcknowledgeNewMessageMutation = () => {
  return useMutation<
    { channelId: string; postId: string },
    ApiError,
    { channelId: string; postId: string }
  >({
    mutationFn: async ({ channelId, postId }) => {
      // Tell Mattermost server we acknowledged this message
      await apiClient.post(`channels/${channelId}/posts/${postId}/ack`);
      return { channelId, postId };
    },
    onSuccess: ({ channelId }) => {
      // Invalidate relevant queries
      invalidateQueries.channelUnreadCount(channelId);
    },
    ...createMutationOptions(),
  });
};
