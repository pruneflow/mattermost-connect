// src/core/api/queries/channelQueries.ts
/**
 * React Query hooks for channel operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { Channel, ChannelMember, ChannelUnreadCount } from "../../types";
import { useChannelStore } from "../../store/channelStore";
import { useDirectChannelStore } from "../../store/directChannelStore";
import { useTeamStore } from "../../store/teamStore";
import { useAuthStore } from "../../store/authStore";
import { createQueryOptions, createMutationOptions } from "../queryUtils";

/**
 * Fetches channels for a team
 * @param teamId Team ID
 * @returns Query hook for channels
 */
export const useChannelsQuery = (teamId: string | undefined) => {
  const { setChannels, setLoading, setLoadingId, setError } = useChannelStore();
  const { refreshDirectChannelInfo } = useDirectChannelStore();
  const { currentUser } = useAuthStore();

  return useQuery({
    queryKey: teamId
      ? QUERY_KEYS.channels.byTeam(teamId)
      : ["channels", "byTeam", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        return [];
      }

      setLoading(true);
      setLoadingId(teamId, true);

      try {
        const response = await apiClient.get<Channel[]>(
          `users/me/teams/${teamId}/channels`,
        );
        const channels = response.data;

        // Update store
        setChannels(teamId, channels);

        // Refresh direct channel info for direct/group channels
        const currentUserId = currentUser?.id;
        if (currentUserId) {
          channels.forEach((channel) => {
            if (channel.type === "D" || channel.type === "G") {
              refreshDirectChannelInfo(channel.id, currentUserId);
            }
          });
        }

        return channels;
      } catch (error) {
        setError(teamId, error as Error);
        throw error;
      }
    },
    // Don't run query if teamId is not provided
    enabled: !!teamId,
    ...createQueryOptions("channel"),
  });
};

/**
 * Fetches a specific channel by ID
 * @param channelId Channel ID
 * @returns Query hook for a channel
 */
export const useChannelQuery = (channelId: string | undefined) => {
  const { setChannel, getChannelById, setLoadingId, setErrorForId } =
    useChannelStore();
  const { refreshDirectChannelInfo } = useDirectChannelStore();
  const { currentUser } = useAuthStore();

  return useQuery({
    queryKey: channelId
      ? QUERY_KEYS.channels.byId(channelId)
      : ["channels", "byId", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      // Check if channel is already in store
      const cachedChannel = getChannelById(channelId);
      if (cachedChannel) {
        return cachedChannel;
      }

      setLoadingId(channelId, true);

      try {
        const response = await apiClient.get<Channel>(`channels/${channelId}`);
        const channel = response.data;

        // Update store
        setChannel(channel);

        // Refresh direct channel info if needed
        const currentUserId = currentUser?.id;
        if (currentUserId && (channel.type === "D" || channel.type === "G")) {
          refreshDirectChannelInfo(channel.id, currentUserId);
        }

        return channel;
      } catch (error) {
        setErrorForId(channelId, error as Error);
        throw error;
      }
    },
    // Don't run query if channelId is not provided
    enabled: !!channelId,
    ...createQueryOptions("channel"),
  });
};

/**
 * Fetches unread count for a channel
 * @param channelId Channel ID
 * @returns Query hook for channel unread count
 */
export const useChannelUnreadCountQuery = (channelId: string | undefined) => {
  const { updateUnreadCount } = useUnreadStore();
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

      // Get the channel to extract total_msg_count
      let totalMsgCount: number | undefined;
      try {
        const channel = await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.channels.byId(channelId),
          queryFn: async () => {
            const channelResponse = await apiClient.get<Channel>(
              `channels/${channelId}`,
            );
            return channelResponse.data;
          },
        });
        totalMsgCount = channel.total_msg_count;
      } catch (error) {
        console.error(
          `Error fetching channel ${channelId} for total message count:`,
          error,
        );
      }

      // Update store
      updateUnreadCount(
        channelId,
        unreadData.msg_count,
        unreadData.mention_count,
        undefined, // last message ID
        unreadData.lastViewedAt,
        totalMsgCount,
      );

      return unreadData;
    },
    // Don't run query if channelId is not provided
    enabled: !!channelId && !!currentUser,
    ...createQueryOptions("unread", { staleTime: 30 * 1000 }),
  });
};

/**
 * Creates a new channel
 */
export const useCreateChannelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelData: {
      team_id: string;
      name: string;
      display_name: string;
      type: "O" | "P";
      purpose?: string;
      header?: string;
    }) => {
      const response = await apiClient.post<Channel>("channels", channelData);
      return response.data;
    },
    onSuccess: (newChannel) => {
      // Invalidate team channels query
      invalidateQueries.channels.byTeam(newChannel.team_id);

      // Update channel store
      const { setChannel } = useChannelStore.getState();
      setChannel(newChannel);
    },
    ...createMutationOptions(),
  });
};

/**
 * Updates an existing channel
 */
export const useUpdateChannelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      channelData,
    }: {
      channelId: string;
      channelData: Partial<{
        name: string;
        display_name: string;
        purpose: string;
        header: string;
      }>;
    }) => {
      const response = await apiClient.put<Channel>(
        `channels/${channelId}`,
        channelData,
      );
      return response.data;
    },
    onSuccess: (updatedChannel) => {
      // Invalidate specific channel query
      invalidateQueries.channels.byId(updatedChannel.id);

      // Update channel in store
      const { updateChannel } = useChannelStore.getState();
      updateChannel(updatedChannel);

      // Refresh direct channel info if needed
      if (updatedChannel.type === "D" || updatedChannel.type === "G") {
        const { refreshDirectChannelInfo } = useDirectChannelStore.getState();
        const { currentUser } = useAuthStore.getState();
        if (currentUser) {
          refreshDirectChannelInfo(updatedChannel.id, currentUser.id);
        }
      }
    },
    ...createMutationOptions(),
  });
};

/**
 * Deletes a channel
 */
export const useDeleteChannelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.delete(`channels/${channelId}`);
      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      if (teamId) {
        // Invalidate team channels query
        invalidateQueries.channels.byTeam(teamId);
      }

      // Update channel store
      const { removeChannel } = useChannelStore.getState();
      removeChannel(channelId);

      // Invalidate unread counts
      invalidateQueries.channels.unreadCount(channelId);
    },
    ...createMutationOptions(),
  });
};

/**
 * Joins a channel
 */
export const useJoinChannelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      teamId,
    }: {
      channelId: string;
      teamId: string;
    }) => {
      await apiClient.post(`channels/${channelId}/members`, {
        user_id: "me",
      });

      // Fetch the channel details
      const response = await apiClient.get<Channel>(`channels/${channelId}`);
      return { channel: response.data, teamId };
    },
    onSuccess: ({ channel, teamId }) => {
      // Invalidate team channels query
      invalidateQueries.channels.byTeam(teamId);

      // Update channel store
      const { setChannel } = useChannelStore.getState();
      setChannel(channel);

      // Refresh direct channel info if needed
      if (channel.type === "D" || channel.type === "G") {
        const { refreshDirectChannelInfo } = useDirectChannelStore.getState();
        const { currentUser } = useAuthStore.getState();
        if (currentUser) {
          refreshDirectChannelInfo(channel.id, currentUser.id);
        }
      }
    },
    ...createMutationOptions(),
  });
};

/**
 * Leaves a channel
 */
export const useLeaveChannelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.delete(`channels/${channelId}/members/me`);
      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      if (teamId) {
        // Invalidate team channels query
        invalidateQueries.channels.byTeam(teamId);
      }

      // Update channel store
      const { removeChannel } = useChannelStore.getState();
      removeChannel(channelId);

      // Invalidate unread counts
      invalidateQueries.channels.unreadCount(channelId);
    },
    ...createMutationOptions(),
  });
};

/**
 * Marks a channel as viewed
 */
export const useViewChannelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      await apiClient.post("channels/members/me/view", {
        channel_id: channelId,
      });
      return channelId;
    },
    onSuccess: (channelId) => {
      // Invalidate the unread count query for this channel
      invalidateQueries.channels.unreadCount(channelId);

      // Get the channel to find its team
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (channel?.team_id) {
        // Invalidate the team unread counts
        invalidateQueries.channels.unreadCounts(channel.team_id);
      }
    },
    ...createMutationOptions(),
  });
};

/**
 * Fetches channel members
 * @param channelId Channel ID
 * @returns Query hook for channel members
 */
export const useChannelMembersQuery = (channelId: string | undefined) => {
  const { setChannelMembers } = useChannelStore();

  return useQuery({
    queryKey: channelId
      ? ["channelMembers", channelId]
      : ["channelMembers", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      const response = await apiClient.get<ChannelMember[]>(
        `channels/${channelId}/members`,
      );
      const members = response.data;

      // Update store
      setChannelMembers(channelId, members);

      return members;
    },
    enabled: !!channelId,
    ...createQueryOptions("channel"),
  });
};

/**
 * Adds a channel to favorites
 */
export const useAddChannelToFavoritesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      // First get the channel to ensure we have team_id
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.post("preferences", [
        {
          user_id: "me",
          category: "favorite_channel",
          name: channelId,
          value: "true",
        },
      ]);

      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      // Invalidate team channels query
      invalidateQueries.channels.byTeam(teamId);

      // Optimistically update channel in store
      const { setChannelProperty } = useChannelStore.getState();
      setChannelProperty(channelId, "is_favorite", true);
    },
    ...createMutationOptions(),
  });
};

/**
 * Removes a channel from favorites
 */
export const useRemoveChannelFromFavoritesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      // First get the channel to ensure we have team_id
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.delete(`preferences/me/favorite_channel/${channelId}`);

      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      // Invalidate team channels query
      invalidateQueries.channels.byTeam(teamId);

      // Optimistically update channel in store
      const { setChannelProperty } = useChannelStore.getState();
      setChannelProperty(channelId, "is_favorite", false);
    },
    ...createMutationOptions(),
  });
};

/**
 * Marks a channel as muted/unmuted
 */
export const useToggleChannelMutedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      muted,
    }: {
      channelId: string;
      muted: boolean;
    }) => {
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
    onSuccess: ({ channelId }) => {
      // Invalidate unread counts
      invalidateQueries.channels.unreadCount(channelId);

      // Get the channel to find its team
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (channel?.team_id) {
        // Invalidate team unread counts
        invalidateQueries.channels.unreadCounts(channel.team_id);
      }
    },
    ...createMutationOptions(),
  });
};

// Import at the end to avoid circular dependencies
import { useUnreadStore } from "../../../hooks/useUnreadCounts";
