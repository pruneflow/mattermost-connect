import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Channel, ChannelMember, User, DirectChannelInfo } from '../api/types';
import { useChannelUtils } from './useChannelUtils';
import { formatUserName } from '../utils/formatters';
import { userKeys } from './useUsers';

// Query keys
export const channelKeys = {
  all: ['channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (teamId: string) => [...channelKeys.lists(), { teamId }] as const,
  details: () => [...channelKeys.all, 'detail'] as const,
  detail: (id: string) => [...channelKeys.details(), id] as const,
  members: (channelId: string) => [...channelKeys.detail(channelId), 'members'] as const,
};

// Create channel parameters
export interface CreateChannelParams {
  team_id: string;
  name: string;
  display_name: string;
  type: 'O' | 'P';
  purpose?: string;
  header?: string;
}

/**
 * Hook for working with channels in a team
 */
export function useChannels(teamId: string | undefined) {
  const queryClient = useQueryClient();
  const { 
    isDirectChannel, 
    isGroupChannel, 
    getUserIdsFromGroupChannel,
    getGroupChannelDisplayName 
  } = useChannelUtils();
  
  // Skip query if teamId is undefined
  const enabled = !!teamId;

  // Fetch channels for team
  const channelsQuery = useQuery({
    queryKey: channelKeys.list(teamId || ''),
    queryFn: async () => {
      if (!teamId) {
        return [];
      }
      
      const response = await api.get<Channel[]>(`users/me/teams/${teamId}/channels`);
      return response.data;
    },
    enabled,
  });

  // Fetch users for direct/group channels
  const usersQuery = useQuery({
    queryKey: ['users', 'directChannels', { teamId }],
    queryFn: async () => {
      // Get all channels
      const channels = channelsQuery.data || [];
      
      // If no channels or team, return empty array
      if (channels.length === 0) {
        return [];
      }
      
      // Find direct and group channels
      const directAndGroupChannels = channels.filter(
        channel => isDirectChannel(channel) || isGroupChannel(channel)
      );
      
      // If no direct/group channels, return empty array
      if (directAndGroupChannels.length === 0) {
        return [];
      }
      
      // Collect unique user IDs from direct and group channels
      const userIds = new Set<string>();
      
      directAndGroupChannels.forEach(channel => {
        if (isDirectChannel(channel)) {
          // Extract user ID from channel name
          const parts = channel.name.split('__');
          parts.forEach(id => userIds.add(id));
        } else if (isGroupChannel(channel)) {
          // Get user IDs from group channel name
          getUserIdsFromGroupChannel(channel).forEach(id => userIds.add(id));
        }
      });
      
      // Fetch users
      if (userIds.size === 0) {
        return [];
      }
      
      const response = await api.post<User[]>('users/ids', Array.from(userIds));
      return response.data;
    },
    // Always enable this query, but it will effectively do nothing when no channels are available
    enabled: true,
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: CreateChannelParams) => {
      const response = await api.post<Channel>('channels', channelData);
      return response.data;
    },
    onSuccess: (newChannel) => {
      // Invalidate channel list for this team
      queryClient.invalidateQueries({ queryKey: channelKeys.list(newChannel.team_id) });
    },
  });

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post<Channel>(`channels/${channelId}/members`, {
        user_id: 'me',
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate channel list for this team
      if (teamId) {
        queryClient.invalidateQueries({ queryKey: channelKeys.list(teamId) });
      }
    },
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      await api.delete(`channels/${channelId}/members/me`);
      return channelId;
    },
    onSuccess: (channelId) => {
      // Remove channel from queries
      if (teamId) {
        // Update channel list
        queryClient.setQueryData<Channel[]>(
          channelKeys.list(teamId),
          (old = []) => old.filter(channel => channel.id !== channelId)
        );
      }
    },
  });

  // Get channels by type
  const getChannelsByType = (type: 'public' | 'private' | 'direct' | 'group') => {
    const channels = channelsQuery.data || [];
    
    switch (type) {
      case 'public':
        return channels.filter(channel => channel.type === 'O');
      case 'private':
        return channels.filter(channel => channel.type === 'P');
      case 'direct':
        return channels.filter(channel => isDirectChannel(channel));
      case 'group':
        return channels.filter(channel => isGroupChannel(channel));
      default:
        return [];
    }
  };

  // Format direct channel info
  const getDirectChannelInfo = (channelId: string): DirectChannelInfo | null => {
    const channels = channelsQuery.data || [];
    const users = usersQuery.data || [];
    const currentUser = queryClient.getQueryData<User>(['users', 'me']);
    const currentUserId = currentUser?.id;
    
    // Find channel
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return null;
    
    // Check if direct channel
    if (isDirectChannel(channel)) {
      // Get user IDs
      const userIds = channel.name.split('__');
      
      // Find other user
      const otherUserId = userIds.find(id => id !== currentUserId);
      if (!otherUserId) return null;
      
      // Find user details
      const otherUser = users.find(u => u.id === otherUserId);
      
      // Use formatUserName for direct channels
      let displayName;
      
      if (otherUser) {
        // Use formatUserName for proper display name formatting
        displayName = formatUserName(otherUser);
      } else {
        // If user not found, try to fetch it first before fallback to Unknown User
        try {
          // We'll request the user data and update the cache
          api.get<User>(`users/${otherUserId}`).then(response => {
            if (response.data) {
              // Add this user to the cache
              const users = usersQuery.data || [];
              queryClient.setQueryData(
                ['users', 'directChannels', { teamId }],
                [...users, response.data]
              );
              
              // Optionally also add to individual user cache
              queryClient.setQueryData(
                userKeys.detail(otherUserId),
                response.data
              );
            }
          }).catch(err => {
            console.error(`Failed to fetch direct channel user ${otherUserId}:`, err);
          });
        } catch (error) {
          console.error(`Error fetching direct channel user ${otherUserId}:`, error);
        }
        
        // Attempt to immediately fetch user to avoid "Loading..." display
        let userId = otherUserId;
        
        // Use a synchronous approach to get user data already in localStorage if available
        try {
          const cachedUsersStr = localStorage.getItem('mattermost_cached_users');
          if (cachedUsersStr) {
            const cachedUsers = JSON.parse(cachedUsersStr);
            if (cachedUsers[userId]) {
              const user = cachedUsers[userId];
              return formatUserName(user);
            }
          }
        } catch (e) {
          console.error('Error parsing cached users:', e);
        }
         
        // Fallback if user not found - use channel display_name if it's not the default
        displayName = channel.display_name && channel.display_name !== 'Direct Channel' 
          ? channel.display_name 
          : `${userId.substring(0, 6)}...`; // Just show user ID prefix without "Loading..."
      }
      
      return {
        isDirect: true,
        isGroup: false,
        displayName,
        userIds,
        otherUserId,
      };
    } 
    // Check if group channel
    else if (isGroupChannel(channel)) {
      // Get user IDs
      const userIds = getUserIdsFromGroupChannel(channel);
      
      // Find all users in the group 
      const groupUsers = users.filter(u => userIds.includes(u.id));
      
      // Create a display name with the list of users
      let displayName = channel.display_name;
      
      // If no display name or it's the default, use the proper format with user names
      if (!displayName || displayName === 'Group Message' || displayName === 'Group Channel') {
        displayName = getGroupChannelDisplayName(groupUsers, 'Group Message');
      }
      
      return {
        isDirect: false,
        isGroup: true,
        displayName,
        userIds,
      };
    }
    
    return null;
  };

  return {
    // Data
    channels: channelsQuery.data || [],
    publicChannels: getChannelsByType('public'),
    privateChannels: getChannelsByType('private'),
    directChannels: getChannelsByType('direct'),
    groupChannels: getChannelsByType('group'),
    
    // Loading states
    isLoading: channelsQuery.isLoading || usersQuery.isLoading,
    isError: channelsQuery.isError,
    error: channelsQuery.error,
    
    // Actions
    refetch: channelsQuery.refetch,
    createChannel: createChannelMutation.mutateAsync,
    joinChannel: joinChannelMutation.mutateAsync,
    leaveChannel: leaveChannelMutation.mutateAsync,
    
    // Helpers
    getDirectChannelInfo,
  };
}

/**
 * Hook for working with a specific channel
 */
export function useChannel(channelId: string | undefined) {
  const queryClient = useQueryClient();
  
  // Skip query if channelId is undefined
  const enabled = !!channelId;

  // Fetch channel details
  const channelQuery = useQuery({
    queryKey: channelKeys.detail(channelId || ''),
    queryFn: async () => {
      const response = await api.get<Channel>(`channels/${channelId}`);
      return response.data;
    },
    enabled,
  });

  // Fetch channel members
  const membersQuery = useQuery({
    queryKey: channelKeys.members(channelId || ''),
    queryFn: async () => {
      const response = await api.get<ChannelMember[]>(`channels/${channelId}/members`);
      return response.data;
    },
    enabled,
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async (updates: Partial<Channel>) => {
      if (!channelId) {
        throw new Error('Channel ID is required to update a channel');
      }
      
      const response = await api.put<Channel>(`channels/${channelId}`, updates);
      return response.data;
    },
    onSuccess: (updatedChannel) => {
      // Update channel in cache
      queryClient.setQueryData(
        channelKeys.detail(updatedChannel.id),
        updatedChannel
      );

      // Update channel in list cache if it exists
      queryClient.setQueryData<Channel[]>(
        channelKeys.list(updatedChannel.team_id),
        (oldChannels = []) => {
          return oldChannels.map(channel => 
            channel.id === updatedChannel.id ? updatedChannel : channel
          );
        }
      );
    },
  });

  // View channel/mark as read
  const viewChannelMutation = useMutation({
    mutationFn: async () => {
      if (!channelId) {
        throw new Error('Channel ID is required to view a channel');
      }
      
      // Use the correct API endpoint
      await api.post(`channels/members/me/view`, {
        channel_id: channelId
      });
      return channelId;
    },
  });

  return {
    // Data
    channel: channelQuery.data,
    members: membersQuery.data || [],
    
    // Loading states
    isLoading: channelQuery.isLoading || membersQuery.isLoading,
    isError: channelQuery.isError,
    error: channelQuery.error,
    
    // Actions
    updateChannel: updateChannelMutation.mutateAsync,
    viewChannel: viewChannelMutation.mutateAsync,
    refetch: channelQuery.refetch,
    refetchMembers: membersQuery.refetch,
  };
}