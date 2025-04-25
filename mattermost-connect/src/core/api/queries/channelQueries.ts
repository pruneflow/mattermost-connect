// src/core/api/queries/channelQueries.ts
/**
 * React Query hooks for channel operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import {
  Channel,
  ChannelUnreadCount,
  useChannelStore,
  getChannelUnreadCount,
} from "../../store/channelStore";
import { useTeamStore } from "../../store/teamStore";
import { useAuthStore } from "../../store/authStore";

/**
 * Fetches channels for a team
 * @param teamId Team ID
 * @returns Query hook for channels
 */
export const useChannelsQuery = (teamId: string | undefined) => {
  const { setChannels, setLoading, setError } = useChannelStore();

  return useQuery({
    queryKey: teamId
      ? QUERY_KEYS.channels.byTeam(teamId)
      : ["channels", "byTeam", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        return [];
      }

      setLoading(teamId, true);
      try {
        const response = await apiClient.get<Channel[]>(
          `users/me/teams/${teamId}/channels`,
        );
        const channels = response.data;

        // Update store
        setChannels(teamId, channels);

        // Fetch unread counts for all channels
        // This could be optimized by batching, but we'll keep it simple for now
        for (const channel of channels) {
          try {
            const unreadResponse = await apiClient.get<ChannelUnreadCount>(
              `users/me/channels/${channel.id}/unread`,
            );
            const unreadData = unreadResponse.data;

            // Update store with unread counts
            useChannelStore
              .getState()
              .updateUnreadCount(
                channel.id,
                unreadData.messageCount,
                unreadData.mentionCount,
                unreadData.lastMessageId,
                unreadData.lastViewedAt,
                channel.total_msg_count,
              );
          } catch (unreadError) {
            console.error(
              `Error fetching unread counts for channel ${channel.id}:`,
              unreadError,
            );
          }
        }

        return channels;
      } catch (error) {
        setError(teamId, error as Error);
        throw error;
      }
    },
    // Don't run query if teamId is not provided
    enabled: !!teamId,
    // Cache data for 2 minutes
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetches a specific channel by ID
 * @param channelId Channel ID
 * @returns Query hook for a channel
 */
export const useChannelQuery = (channelId: string | undefined) => {
  const { setChannel, getChannelById, setLoading, setError } =
    useChannelStore();

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

      try {
        const response = await apiClient.get<Channel>(`channels/${channelId}`);
        const channel = response.data;

        // Update store
        setChannel(channel);

        // Also fetch unread count for this channel
        try {
          const unreadResponse = await apiClient.get<ChannelUnreadCount>(
            `users/me/channels/${channel.id}/unread`,
          );
          const unreadData = unreadResponse.data;

          // Update store with unread counts
          useChannelStore
            .getState()
            .updateUnreadCount(
              channel.id,
              unreadData.messageCount,
              unreadData.mentionCount,
              unreadData.lastMessageId,
              unreadData.lastViewedAt,
              channel.total_msg_count,
            );
        } catch (unreadError) {
          console.error(
            `Error fetching unread counts for channel ${channel.id}:`,
            unreadError,
          );
        }

        return channel;
      } catch (error) {
        setError(channelId, error as Error);
        throw error;
      }
    },
    // Don't run query if channelId is not provided
    enabled: !!channelId,
    // Cache data for 2 minutes
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetches unread count for a channel
 * @param channelId Channel ID
 * @returns Query hook for channel unread count
 */
export const useChannelUnreadCountQuery = (channelId: string | undefined) => {
  const { updateUnreadCount } = useChannelStore();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: channelId
      ? QUERY_KEYS.channels.unreadCount(channelId)
      : ["channelUnreadCount", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      const response = await apiClient.get<ChannelUnreadCount>(
        `users/me/channels/${channelId}/unread`,
      );
      const unreadData = response.data;

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
        unreadData.messageCount,
        unreadData.mentionCount,
        unreadData.lastMessageId,
        unreadData.lastViewedAt,
        totalMsgCount,
      );

      return unreadData;
    },
    // Don't run query if channelId is not provided
    enabled: !!channelId,
    // Cache data for 30 seconds
    staleTime: 30 * 1000,
  });
};

/**
 * Fetches unread counts for all channels in a team
 * @param teamId Team ID
 * @returns Query hook for channel unread counts
 */
export const useChannelUnreadCountsQuery = (teamId: string | undefined) => {
  const { channelsByTeam } = useChannelStore();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: teamId
      ? QUERY_KEYS.channels.unreadCounts(teamId)
      : ["channelUnreadCounts", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      const channels = channelsByTeam[teamId] || [];
      const unreadCounts: Record<string, ChannelUnreadCount> = {};

      // Fetch unread counts for all channels in parallel
      const promises = channels.map(async (channel) => {
        try {
          const response = await apiClient.get<ChannelUnreadCount>(
            `users/me/channels/${channel.id}/unread`,
          );
          return { channelId: channel.id, data: response.data };
        } catch (error) {
          console.error(
            `Error fetching unread count for channel ${channel.id}:`,
            error,
          );
          return { channelId: channel.id, data: null };
        }
      });

      const results = await Promise.all(promises);

      // Process results and update store
      results.forEach(({ channelId, data }) => {
        if (data) {
          unreadCounts[channelId] = data;

          // Update store with unread counts
          useChannelStore
            .getState()
            .updateUnreadCount(
              channelId,
              data.messageCount,
              data.mentionCount,
              data.lastMessageId,
              data.lastViewedAt,
              channels.find((c) => c.id === channelId)?.total_msg_count,
            );
        }
      });

      return unreadCounts;
    },
    // Don't run query if teamId is not provided
    enabled: !!teamId,
    // Cache data for 1 minute
    staleTime: 60 * 1000,
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.byTeam(newChannel.team_id),
      });

      // Update channel store
      const { setChannel } = useChannelStore.getState();
      setChannel(newChannel);
    },
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.byId(updatedChannel.id),
      });

      // Update channel in store
      const { setChannel } = useChannelStore.getState();
      setChannel(updatedChannel);
    },
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
      await apiClient.delete(`channels/${channelId}`);
      return { channelId, teamId: channel?.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      if (teamId) {
        // Invalidate team channels query
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.byTeam(teamId),
        });
      }

      // Update channel store
      const { setChannels, channelsByTeam, setActiveChannel, activeChannel } =
        useChannelStore.getState();

      if (teamId && channelsByTeam[teamId]) {
        const updatedChannels = channelsByTeam[teamId].filter(
          (channel) => channel.id !== channelId,
        );
        setChannels(teamId, updatedChannels);
      }

      // If the deleted channel was active, set active to null
      if (activeChannel?.id === channelId) {
        setActiveChannel(null);
      }
    },
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.byTeam(teamId),
      });

      // Update channel store
      const { setChannel } = useChannelStore.getState();
      setChannel(channel);
    },
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
      await apiClient.delete(`channels/${channelId}/members/me`);
      return { channelId, teamId: channel?.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      if (teamId) {
        // Invalidate team channels query
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.byTeam(teamId),
        });
      }

      // Update channel store
      const { setChannels, channelsByTeam, setActiveChannel, activeChannel } =
        useChannelStore.getState();

      if (teamId && channelsByTeam[teamId]) {
        const updatedChannels = channelsByTeam[teamId].filter(
          (channel) => channel.id !== channelId,
        );
        setChannels(teamId, updatedChannels);
      }

      // If the left channel was active, set active to null
      if (activeChannel?.id === channelId) {
        setActiveChannel(null);
      }
    },
  });
};

/**
 * Marks a channel as viewed
 */
export const useViewChannelMutation = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();

  return useMutation({
    mutationFn: async (channelId: string) => {
      await apiClient.post("channels/members/me/view", {
        channel_id: channelId,
      });
      return channelId;
    },
    onSuccess: (channelId) => {
      // Optimistically update the store immediately
      const { markAsRead } = useChannelStore.getState();
      markAsRead(channelId);

      // Invalidate the unread count query for this channel
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCount(channelId),
      });

      // Also invalidate the channel queries since last_viewed_at might have changed
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.byId(channelId),
      });

      // Get the channel to find its team
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (channel?.team_id) {
        // Invalidate the team unread counts
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.unreadCounts(channel.team_id),
        });
      }
    },
  });
};

/**
 * Marks all channels in a team as read
 */
export const useMarkAllChannelsAsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await apiClient.post(`teams/${teamId}/channels/read`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Optimistically update the store immediately
      const { markAllAsRead } = useChannelStore.getState();
      markAllAsRead(teamId);

      // Invalidate team channels query to refresh unread counts
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.byTeam(teamId),
      });

      // Invalidate unread counts for this team
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCounts(teamId),
      });

      // Update individual channel unread counts in the store
      const teamChannels =
        useChannelStore.getState().channelsByTeam[teamId] || [];
      teamChannels.forEach((channel) => {
        useChannelStore.getState().markAsRead(channel.id);
      });
    },
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
    onSuccess: ({ channelId, muted }) => {
      // Update our local state
      useChannelStore.getState().setChannelMuted(channelId, muted);

      // Get the channel to find its team
      const channel = useChannelStore.getState().getChannelById(channelId);
      if (channel?.team_id) {
        // Invalidate team unread counts
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.unreadCounts(channel.team_id),
        });
      }
    },
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.byTeam(teamId),
      });

      // Optimistically update channel in store
      const { setChannel, getChannelById } = useChannelStore.getState();
      const channel = getChannelById(channelId);

      if (channel) {
        setChannel({
          ...channel,
          is_favorite: true,
        });
      }
    },
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.byTeam(teamId),
      });

      // Optimistically update channel in store
      const { setChannel, getChannelById } = useChannelStore.getState();
      const channel = getChannelById(channelId);

      if (channel) {
        setChannel({
          ...channel,
          is_favorite: false,
        });
      }
    },
  });
};

/**
 * Fetches channel members
 * @param channelId Channel ID
 * @returns Query hook for channel members
 */
export const useChannelMembersQuery = (channelId: string | undefined) => {
  return useQuery({
    queryKey: channelId
      ? ["channelMembers", channelId]
      : ["channelMembers", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      const response = await apiClient.get(`channels/${channelId}/members`);
      return response.data;
    },
    enabled: !!channelId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
