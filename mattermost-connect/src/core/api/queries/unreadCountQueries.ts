// src/core/api/queries/unreadCountQueries.ts
/**
 * React Query hooks for unread count operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { useChannelStore, ChannelUnreadCount } from "../../store/channelStore";
import { useAuthStore } from "../../store/authStore";
import { Message } from "../../store/messageStore";

/**
 * Interface for paginated message history request
 */
export interface MessageHistoryParams {
  /** Channel ID */
  channelId: string;
  /** Last viewed timestamp to fetch from (in milliseconds) */
  sinceTimestamp: number;
  /** Page number for pagination */
  page?: number;
  /** Number of messages per page */
  perPage?: number;
}

/**
 * Fetches unread messages since the last time the user viewed a channel
 * @param params Parameters for fetching message history
 * @returns Query hook for unread message history
 */
export const useUnreadMessageHistoryQuery = (
  params: MessageHistoryParams | undefined,
) => {
  const { currentUser } = useAuthStore();
  const { incrementUnreadCount } = useChannelStore();

  return useQuery({
    queryKey: params
      ? [
          "unreadMessages",
          params.channelId,
          params.sinceTimestamp,
          params.page,
          params.perPage,
        ]
      : ["unreadMessages", "undefined"],
    queryFn: async () => {
      if (!params?.channelId) {
        throw new Error("Channel ID is required");
      }

      // Convert milliseconds to seconds for Mattermost API
      const sinceSeconds = Math.floor((params.sinceTimestamp || 0) / 1000);

      // Build query URL
      const page = params.page || 0;
      const perPage = params.perPage || 60;
      let url = `channels/${params.channelId}/posts?page=${page}&per_page=${perPage}`;

      if (sinceSeconds > 0) {
        url += `&since=${sinceSeconds}`;
      }

      // Fetch messages
      const response = await apiClient.get<{
        order: string[];
        posts: Record<string, Message>;
        next_post_id: string;
        prev_post_id: string;
      }>(url);

      // Process the messages
      const messages: Message[] = [];
      let mention_count = 0;

      response.data.order.forEach((postId) => {
        const message = response.data.posts[postId];

        // Add to the list
        messages.push(message);

        // Check if this message mentions the current user
        // This is a simplified check - in a real implementation, you'd need
        // to parse the message for @mentions based on username/nickname
        if (
          currentUser &&
          message.props &&
          message.props.mentions &&
          Array.isArray(message.props.mentions) &&
          message.props.mentions.includes(currentUser.id)
        ) {
          mention_count++;
        }
      });

      // Calculate unread count - excluding the current user's messages
      const msg_count = messages.filter(
        (msg) => currentUser && msg.user_id !== currentUser.id,
      ).length;

      // Update the channel unread count in store
      if (msg_count > 0 || mention_count > 0) {
        incrementUnreadCount(params.channelId, msg_count, mention_count);
      }

      return {
        messages,
        msg_count,
        mention_count,
        hasMore: response.data.next_post_id !== "",
      };
    },
    // Don't run query if params are not provided
    enabled: !!params?.channelId && !!params?.sinceTimestamp,
    // Cache data for a short time
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Fetches unread messages for a specific channel and updates the store
 * @param channelId Channel ID to get unread messages for
 * @returns Query hook for the channel's unread messages
 */
export const useChannelUnreadMessagesQuery = (
  channelId: string | undefined,
  lastViewedAt?: number,
) => {
  const { currentUser } = useAuthStore();
  const { incrementUnreadCount, getChannelById } = useChannelStore();

  return useQuery({
    queryKey: channelId
      ? QUERY_KEYS.channels.unreadMessages(channelId, lastViewedAt)
      : ["channelUnreadMessages", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      // Get existing channel data to check last_viewed_at
      const channel = getChannelById(channelId);
      const sinceTimestamp =
        lastViewedAt ||
        (channel && channel.last_post_at
          ? channel.last_post_at
          : Date.now() - 24 * 60 * 60 * 1000);

      // Convert to seconds for API
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
        if (currentUser && message.user_id === currentUser.id) {
          return;
        }

        messages.push(message);

        // Check for mentions
        if (
          currentUser &&
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
    enabled: !!channelId,
    // Don't cache for too long
    staleTime: 15 * 1000, // 15 seconds
  });
};

/**
 * Fetches unread count for a specific channel using the correct Mattermost API
 * @param channelId Channel ID
 * @returns Query hook for the channel's unread count
 */
export const useChannelUnreadCountQuery = (channelId: string | undefined) => {
  const { updateUnreadCount } = useChannelStore();
  const { currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useQuery({
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
    // Don't run query if channelId is not provided
    enabled: !!channelId && !!currentUser,
    // Cache data for 30 seconds
    staleTime: 30 * 1000,
  });
};

/**
 * Fetches unread counts for a team using the correct Mattermost API
 * @param teamId Team ID
 * @returns Query hook for the team's unread counts
 */
export const useTeamUnreadCountQuery = (teamId: string | undefined) => {
  const { updateUnreadCount } = useChannelStore();
  const { currentUser } = useAuthStore();

  return useQuery({
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
    // Don't run query if teamId is not provided
    enabled: !!teamId && !!currentUser,
    // Cache data for 30 seconds
    staleTime: 30 * 1000,
  });
};

/**
 * Mutation to acknowledge a new message without marking entire channel as read
 */
export const useAcknowledgeNewMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      postId,
    }: {
      channelId: string;
      postId: string;
    }) => {
      // Tell Mattermost server we acknowledged this message
      await apiClient.post(`channels/${channelId}/posts/${postId}/ack`);
      return { channelId, postId };
    },
    onSuccess: ({ channelId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCount(channelId),
      });
    },
  });
};

/**
 * Gets unread messages for a channel since a timestamp, with optional optimistic updates
 */
export const useSyncChannelUnreadCountMutation = () => {
  const queryClient = useQueryClient();
  const { updateUnreadCount } = useChannelStore();
  const { currentUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      channelId,
      sinceTimestamp,
    }: {
      channelId: string;
      sinceTimestamp: number;
    }) => {
      if (!currentUser) {
        throw new Error("Current user is required");
      }

      // Fetch unread count from API using the correct endpoint
      const unreadResponse = await apiClient.get<{
        msg_count: number;
        mention_count: number;
        last_viewed_at: number;
      }>(`users/${currentUser.id}/channels/${channelId}/unread`);

      // Map to our internal format
      const unreadData: ChannelUnreadCount = {
        msg_count: unreadResponse.data.msg_count,
        mention_count: unreadResponse.data.mention_count,
        lastViewedAt: unreadResponse.data.last_viewed_at,
      };

      return {
        channelId,
        unreadData,
      };
    },
    onSuccess: ({ channelId, unreadData }) => {
      // Update store with latest data from server
      updateUnreadCount(
        channelId,
        unreadData.msg_count,
        unreadData.mention_count,
        undefined, // last message ID
        unreadData.lastViewedAt,
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCount(channelId),
      });

      // Get the channel to find its team
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (channel?.team_id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.unreadCounts(channel.team_id),
        });
      }
    },
  });
};
