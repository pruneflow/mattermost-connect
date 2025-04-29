// src/core/api/queries/channelQueries.ts
/**
 * React Query hooks for channel operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS } from "../queryClient";
import { Channel, ChannelMember } from "../../../types";
import { useAuthStore, useChannelStore } from "../../store";

/**
 * Fetches channels for a team
 * @param teamId Team ID
 * @returns Query hook for channels
 */
export const useChannelsQuery = (teamId: string | undefined) => {
  const { setChannels } = useChannelStore();

  return useQuery({
    queryKey: teamId
      ? QUERY_KEYS.channels.byTeam(teamId)
      : ["channels", "byTeam", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        return [];
      }

      try {
        const response = await apiClient.get<Channel[]>(
          `users/me/teams/${teamId}/channels`,
        );
        const channels = response.data;

        // Update store
        setChannels(teamId, channels);

        return channels;
      } catch (error) {
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
  const { getChannelById, setChannel } = useChannelStore();

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

        return channel;
      } catch (error) {
        throw error;
      }
    },
    // Don't run query if channelId is not provided
    enabled: !!channelId,
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetches unread count for a channel
 * @param channelId Channel ID
 * @returns Query hook for channel unread count
 */
export const useChannelUnreadCountQuery = (channelId: string | undefined) => {
  const { getState } = useAuthStore;

  return useQuery({
    queryKey: channelId
      ? QUERY_KEYS.channels.unreadCount(channelId)
      : ["channelUnreadCount", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      // Get current user from auth store state
      const currentUser = getState().currentUser;
      if (!currentUser) {
        throw new Error("User must be authenticated");
      }

      // Use the correct Mattermost API endpoint
      const response = await apiClient.get<{
        msg_count: number;
        mention_count: number;
        last_viewed_at: number;
        last_update_at: number;
      }>(`users/${currentUser.id}/channels/${channelId}/unread`);

      // Map response to our internal ChannelUnreadCount format
      // Get the channel to find its team
      return {
        msg_count: response.data.msg_count,
        mention_count: response.data.mention_count,
        lastViewedAt: response.data.last_viewed_at,
      };
    },
    // Don't run query if channelId is not provided or user not authenticated
    enabled: !!channelId && !!getState().currentUser,
    // Cache data for 30 seconds
    staleTime: 30 * 1000,
  });
};

/**
 * Creates a new channel
 */
export const useCreateChannelMutation = () => {
  const queryClient = useQueryClient();
  const { setChannel } = useChannelStore();

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
      setChannel(newChannel);
    },
  });
};

/**
 * Updates an existing channel
 */
export const useUpdateChannelMutation = () => {
  const queryClient = useQueryClient();
  const { updateChannel } = useChannelStore();

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
      updateChannel(updatedChannel);
    },
  });
};

/**
 * Deletes a channel
 */
export const useDeleteChannelMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, removeChannel } = useChannelStore();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const channel = getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.delete(`channels/${channelId}`);
      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      if (teamId) {
        // Invalidate team channels query
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.byTeam(teamId),
        });
      }

      // Update channel store
      removeChannel(channelId);

      // Invalidate unread counts
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCount(channelId),
      });
    },
  });
};

/**
 * Joins a channel
 */
export const useJoinChannelMutation = () => {
  const queryClient = useQueryClient();
  const { setChannel } = useChannelStore();

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
      setChannel(channel);
    },
  });
};

/**
 * Leaves a channel
 */
export const useLeaveChannelMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, removeChannel } = useChannelStore();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const channel = getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.delete(`channels/${channelId}/members/me`);
      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      if (teamId) {
        // Invalidate team channels query
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.byTeam(teamId),
        });
      }

      // Update channel store
      removeChannel(channelId);

      // Invalidate unread counts
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCount(channelId),
      });
    },
  });
};

/**
 * Marks a channel as viewed
 */
export const useViewChannelMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById } = useChannelStore();

  return useMutation({
    mutationFn: async (channelId: string) => {
      await apiClient.post("channels/members/me/view", {
        channel_id: channelId,
      });
      return channelId;
    },
    onSuccess: (channelId) => {
      // Invalidate the unread count query for this channel
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCount(channelId),
      });

      // Get the channel to find its team
      const channel = getChannelById(channelId);
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
      await apiClient.post(`teams/${teamId}/channels/members/me/mark_read`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Invalidate all unread counts for this team
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCounts(teamId),
      });

      // Also invalidate team-level unread counts
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.unread.byTeam(teamId),
      });
    },
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
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Adds a channel to favorites
 */
export const useAddChannelToFavoritesMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, setChannelProperty } = useChannelStore();

  return useMutation({
    mutationFn: async (channelId: string) => {
      // First get the channel to ensure we have team_id
      const channel = getChannelById(channelId);
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
      setChannelProperty(channelId, "is_favorite", true);
    },
  });
};

/**
 * Removes a channel from favorites
 */
export const useRemoveChannelFromFavoritesMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, setChannelProperty } = useChannelStore();

  return useMutation({
    mutationFn: async (channelId: string) => {
      // First get the channel to ensure we have team_id
      const channel = getChannelById(channelId);
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
      setChannelProperty(channelId, "is_favorite", false);
    },
  });
};

/**
 * Marks a channel as muted/unmuted
 */
export const useToggleChannelMutedMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById } = useChannelStore();

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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCount(channelId),
      });

      // Get the channel to find its team
      const channel = getChannelById(channelId);
      if (channel?.team_id) {
        // Invalidate team unread counts
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.unreadCounts(channel.team_id),
        });
      }
    },
  });
};
