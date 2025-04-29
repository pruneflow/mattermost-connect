// src/core/api/queries/channelQueries.ts
/**
 * React Query hooks for channel operations
 * Standardized queries for channel-related operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS } from "../queryClient";
import { createQueryOptions, createMutationOptions } from "../queryUtils";
import { emitEvent } from "../eventUtils";
import { EventType, ErrorSource } from "../../../types";
import { useAuthStore, useChannelStore, handleError } from "../../store";
import { channelService } from "../../services/channelService";

import {
  Channel,
  ChannelMember,
  CreateChannelParams,
  UpdateChannelParams,
  ApiError,
} from "../../../types";

/**
 * Fetches channels for a team
 * @param teamId Team ID
 * @returns Query hook for channels
 */
export const useChannelsQuery = (teamId: string | undefined) => {
  const { setChannels, setLoading, setError } = useChannelStore();

  return useQuery<Channel[], ApiError>({
    queryKey: teamId
      ? QUERY_KEYS.channels.byTeam(teamId)
      : ["channels", "byTeam", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        return [];
      }

      setLoading(true);
      try {
        const response = await apiClient.get<Channel[]>(
          `users/me/teams/${teamId}/channels`,
        );
        const channels = response.data;

        // Update store
        setChannels(teamId, channels);

        return channels;
      } catch (error) {
        setError(error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          teamId,
          method: "fetchChannels",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    // Don't run query if teamId is not provided
    enabled: !!teamId,
    ...createQueryOptions("channel", {
      // Cache data for 2 minutes
      staleTime: 2 * 60 * 1000,
    }),
  });
};

/**
 * Fetches a specific channel by ID
 * @param channelId Channel ID
 * @returns Query hook for a channel
 */
export const useChannelQuery = (channelId: string | undefined) => {
  const { getChannelById, setChannel, setLoadingId, setErrorForId } =
    useChannelStore();

  return useQuery<Channel, ApiError>({
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

        return channel;
      } catch (error) {
        setErrorForId(channelId, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId,
          method: "fetchChannel",
        });
        throw error;
      } finally {
        setLoadingId(channelId, false);
      }
    },
    // Don't run query if channelId is not provided
    enabled: !!channelId,
    ...createQueryOptions("channel", {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
    }),
  });
};

/**
 * Fetches unread count for a channel
 * @param channelId Channel ID
 * @returns Query hook for channel unread count
 */
export const useChannelUnreadCountQuery = (channelId: string | undefined) => {
  const { currentUser } = useAuthStore();
  const { setLoadingId, setErrorForId } = useChannelStore();

  return useQuery<
    {
      msg_count: number;
      mention_count: number;
      lastViewedAt: number;
    },
    ApiError
  >({
    queryKey: channelId
      ? QUERY_KEYS.channels.unreadCount(channelId)
      : ["channelUnreadCount", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      if (!currentUser) {
        throw new Error("User must be authenticated");
      }

      setLoadingId(`unread_${channelId}`, true);
      try {
        // Use the correct Mattermost API endpoint
        const response = await apiClient.get<{
          msg_count: number;
          mention_count: number;
          last_viewed_at: number;
          last_update_at: number;
        }>(`users/${currentUser.id}/channels/${channelId}/unread`);

        // Map response to our internal format
        return {
          msg_count: response.data.msg_count,
          mention_count: response.data.mention_count,
          lastViewedAt: response.data.last_viewed_at,
        };
      } catch (error) {
        setErrorForId(`unread_${channelId}`, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId,
          method: "fetchChannelUnreadCount",
        });
        throw error;
      } finally {
        setLoadingId(`unread_${channelId}`, false);
      }
    },
    // Don't run query if channelId is not provided or user not authenticated
    enabled: !!channelId && !!currentUser,
    ...createQueryOptions("unread", {
      // Cache data for 30 seconds
      staleTime: 30 * 1000,
    }),
  });
};

/**
 * Creates a new channel
 */
export const useCreateChannelMutation = () => {
  const queryClient = useQueryClient();
  const { setChannel } = useChannelStore();

  return useMutation<Channel, ApiError, CreateChannelParams>({
    mutationFn: async (channelData) => {
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

      // Notify channel created
      channelService.notifyChannelUpdate(newChannel, "created");
    },
    ...createMutationOptions(),
  });
};

/**
 * Updates an existing channel
 */
export const useUpdateChannelMutation = () => {
  const queryClient = useQueryClient();
  const { updateChannel } = useChannelStore();

  return useMutation<
    Channel,
    ApiError,
    { channelId: string; channelData: UpdateChannelParams }
  >({
    mutationFn: async ({ channelId, channelData }) => {
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

      // Notify channel updated
      channelService.notifyChannelUpdate(updatedChannel, "updated");
    },
    ...createMutationOptions(),
  });
};

/**
 * Deletes a channel
 */
export const useDeleteChannelMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, removeChannel } = useChannelStore();

  return useMutation<{ channelId: string; teamId?: string }, ApiError, string>({
    mutationFn: async (channelId) => {
      const channel = getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.delete(`channels/${channelId}`);
      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }, _, context) => {
      // Get channel before removing from store for notification
      const channel = getChannelById(channelId);

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

      // Notify channel deleted if we still have the channel info
      if (channel) {
        channelService.notifyChannelUpdate(channel, "deleted");
      }
    },
    ...createMutationOptions(),
  });
};

/**
 * Joins a channel
 */
export const useJoinChannelMutation = () => {
  const queryClient = useQueryClient();
  const { setChannel } = useChannelStore();

  return useMutation<
    { channel: Channel; teamId: string },
    ApiError,
    { channelId: string; teamId: string }
  >({
    mutationFn: async ({ channelId, teamId }) => {
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

      // Notify channel joined
      channelService.notifyChannelUpdate(channel, "joined");
    },
    ...createMutationOptions(),
  });
};

/**
 * Leaves a channel
 */
export const useLeaveChannelMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, removeChannel } = useChannelStore();

  return useMutation<{ channelId: string; teamId?: string }, ApiError, string>({
    mutationFn: async (channelId) => {
      const channel = getChannelById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await apiClient.delete(`channels/${channelId}/members/me`);
      return { channelId, teamId: channel.team_id };
    },
    onSuccess: ({ channelId, teamId }) => {
      // Get channel before removing from store for notification
      const channel = getChannelById(channelId);

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

      // Notify channel left if we still have the channel info
      if (channel) {
        channelService.notifyChannelUpdate(channel, "left");
      }
    },
    ...createMutationOptions(),
  });
};

/**
 * Marks a channel as viewed
 */
export const useViewChannelMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById } = useChannelStore();

  return useMutation<string, ApiError, string>({
    mutationFn: async (channelId) => {
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

        // Also invalidate team-level unread counts
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.unread.byTeam(channel.team_id),
        });
      }

      // Emit channel viewed event
      emitEvent(EventType.CHANNEL_VIEWED, {
        channelId,
        timestamp: Date.now(),
      });
    },
    ...createMutationOptions(),
  });
};

/**
 * Marks all channels in a team as read
 */
export const useMarkAllChannelsAsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<string, ApiError, string>({
    mutationFn: async (teamId) => {
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

      // Emit team marked read event
      emitEvent(EventType.UNREAD_MARKED_READ, {
        teamId,
        timestamp: Date.now(),
      });
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
  const { setChannelMembers, setLoadingId, setErrorForId } = useChannelStore();

  return useQuery<ChannelMember[], ApiError>({
    queryKey: channelId
      ? ["channelMembers", channelId]
      : ["channelMembers", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required");
      }

      setLoadingId(`members_${channelId}`, true);
      try {
        const response = await apiClient.get<ChannelMember[]>(
          `channels/${channelId}/members`,
        );
        const members = response.data;

        // Update store
        setChannelMembers(channelId, members);

        return members;
      } catch (error) {
        setErrorForId(`members_${channelId}`, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId,
          method: "fetchChannelMembers",
        });
        throw error;
      } finally {
        setLoadingId(`members_${channelId}`, false);
      }
    },
    enabled: !!channelId,
    ...createQueryOptions("channel", {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
    }),
  });
};

/**
 * Adds a channel to favorites
 */
export const useAddChannelToFavoritesMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, setChannelProperty } = useChannelStore();

  return useMutation<{ channelId: string; teamId?: string }, ApiError, string>({
    mutationFn: async (channelId) => {
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
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.byTeam(teamId),
        });
      }

      // Optimistically update channel in store
      setChannelProperty(channelId, "is_favorite", true);

      // Emit settings changed event
      emitEvent(EventType.SETTINGS_CHANGED, {
        setting: "favorites",
        channelId,
        value: true,
        timestamp: Date.now(),
      });
    },
    ...createMutationOptions(),
  });
};

/**
 * Removes a channel from favorites
 */
export const useRemoveChannelFromFavoritesMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById, setChannelProperty } = useChannelStore();

  return useMutation<{ channelId: string; teamId?: string }, ApiError, string>({
    mutationFn: async (channelId) => {
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
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.channels.byTeam(teamId),
        });
      }

      // Optimistically update channel in store
      setChannelProperty(channelId, "is_favorite", false);

      // Emit settings changed event
      emitEvent(EventType.SETTINGS_CHANGED, {
        setting: "favorites",
        channelId,
        value: false,
        timestamp: Date.now(),
      });
    },
    ...createMutationOptions(),
  });
};

/**
 * Marks a channel as muted/unmuted
 */
export const useToggleChannelMutedMutation = () => {
  const queryClient = useQueryClient();
  const { getChannelById } = useChannelStore();

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

      // Emit settings changed event
      emitEvent(EventType.SETTINGS_CHANGED, {
        setting: "muted_channels",
        channelId,
        value: muted,
        timestamp: Date.now(),
      });
    },
    ...createMutationOptions(),
  });
};
