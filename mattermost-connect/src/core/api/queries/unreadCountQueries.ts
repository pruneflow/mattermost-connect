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
      let mentionCount = 0;

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
          mentionCount++;
        }
      });

      // Calculate unread count - excluding the current user's messages
      const messageCount = messages.filter(
        (msg) => currentUser && msg.user_id !== currentUser.id,
      ).length;

      // Update the channel unread count in store
      if (messageCount > 0 || mentionCount > 0) {
        incrementUnreadCount(params.channelId, messageCount, mentionCount);
      }

      return {
        messages,
        messageCount,
        mentionCount,
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
 * Fetches total unread counts for all channels (different from per-channel counts)
 * This makes a more efficient API call to get unread counts across all teams/channels
 */
export const useTotalUnreadCountsQuery = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["totalUnreadCounts"],
    queryFn: async () => {
      // Fetch total unread counts across all channels
      const response = await apiClient.get<{
        message_count: number;
        mention_count: number;
      }>("users/me/counts");

      // Get data
      const { message_count, mention_count } = response.data;

      return {
        messageCount: message_count,
        mentionCount: mention_count,
      };
    },
    // Refetch every 30 seconds or when window gains focus
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
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
      let mentionCount = 0;

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
          mentionCount++;
        }
      });

      // Update store
      if (messages.length > 0) {
        incrementUnreadCount(
          channelId,
          messages.length,
          mentionCount,
          // Use the most recent message ID if available
          messages.length > 0 ? messages[0].id : undefined,
        );
      }

      return {
        messages,
        messageCount: messages.length,
        mentionCount,
      };
    },
    enabled: !!channelId,
    // Don't cache for too long
    staleTime: 15 * 1000, // 15 seconds
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

  return useMutation({
    mutationFn: async ({
      channelId,
      sinceTimestamp,
    }: {
      channelId: string;
      sinceTimestamp: number;
    }) => {
      // Fetch unread count from API
      const unreadResponse = await apiClient.get<ChannelUnreadCount>(
        `users/me/channels/${channelId}/unread`,
      );

      return {
        channelId,
        unreadData: unreadResponse.data,
      };
    },
    onSuccess: ({ channelId, unreadData }) => {
      // Update store with latest data from server
      updateUnreadCount(
        channelId,
        unreadData.messageCount,
        unreadData.mentionCount,
        unreadData.lastMessageId,
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
