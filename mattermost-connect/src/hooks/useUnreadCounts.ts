import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useChannels } from './useChannels';

// Query keys for unread counts
export const unreadKeys = {
  all: ['unread'] as const,
  counts: () => [...unreadKeys.all, 'counts'] as const,
  channelCounts: (teamId: string) => [...unreadKeys.counts(), 'channels', { teamId }] as const,
};

// Team unread interface (from API)
export interface TeamUnread {
  team_id: string;
  msg_count: number;
  mention_count: number;
}

// Channel unread interface (from API)
export interface ChannelUnread {
  team_id: string;
  channel_id: string;
  msg_count: number;
  mention_count: number;
}

/**
 * Hook for managing unread message counts per team and channel
 */
export function useUnreadCounts(activeTeamId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get channels for the active team to fetch their unread counts individually
  const { channels } = useChannels(activeTeamId || '');
  
  // Get unread counts for all teams
  const teamUnreadQuery = useQuery({
    queryKey: unreadKeys.counts(),
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      
      console.debug('Fetching team unread counts for all teams');
      const response = await api.get<TeamUnread[]>(`users/${user.id}/teams/unread`);
      
      console.debug(`Received ${response.data.length} team unread counts`);
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Consider fresh for 30 seconds
  });

  // Get unread counts for channels in active team (individual calls)
  const channelUnreadQuery = useQuery({
    queryKey: unreadKeys.channelCounts(activeTeamId || ''),
    queryFn: async () => {
      if (!user?.id || !activeTeamId || !channels || channels.length === 0) {
        return [];
      }
      
      console.debug(`Fetching unread counts for ${channels.length} channels in team ${activeTeamId}`);
      
      try {
        // Make individual API calls for each channel
        const promises = channels.map(async (channel) => {
          try {
            const response = await api.get<{
              team_id: string;
              channel_id: string;
              msg_count: number;
              mention_count: number;
            }>(`users/${user.id}/channels/${channel.id}/unread`);
            
            return {
              team_id: activeTeamId,
              channel_id: channel.id,
              msg_count: response.data.msg_count || 0,
              mention_count: response.data.mention_count || 0,
            } as ChannelUnread;
          } catch (error) {
            console.warn(`Failed to fetch unread count for channel ${channel.id}:`, error);
            // Return zero counts for failed channels
            return {
              team_id: activeTeamId,
              channel_id: channel.id,
              msg_count: 0,
              mention_count: 0,
            } as ChannelUnread;
          }
        });
        
        const results = await Promise.all(promises);
        const totalUnreads = results.reduce((sum, r) => sum + r.msg_count, 0);
        
        console.debug(`Successfully fetched unread counts: ${totalUnreads} total unread messages across ${results.length} channels`);
        
        return results;
      } catch (error) {
        console.error('Error fetching channel unread counts:', error);
        throw error;
      }
    },
    enabled: !!user?.id && !!activeTeamId && !!channels && channels.length > 0,
    staleTime: 30000, // Consider fresh for 30 seconds
  });
  
  // Mark channel as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (channelId: string) => {
      console.debug(`Marking channel ${channelId} as read`);
      await api.post(`channels/members/me/view`, { channel_id: channelId });
      return channelId;
    },
    onSuccess: (channelId) => {
      console.debug(`Channel ${channelId} marked as read, updating cache`);
      resetChannelCount(channelId);
    },
  });

  // Utility functions
  const getTeamUnreadCount = (teamId: string): number => {
    const count = teamUnreadQuery.data?.find(t => t.team_id === teamId);
    return count?.msg_count || 0;
  };

  const getTeamMentionCount = (teamId: string): number => {
    const count = teamUnreadQuery.data?.find(t => t.team_id === teamId);
    return count?.mention_count || 0;
  };

  const getChannelUnreadCount = (channelId: string): number => {
    const count = channelUnreadQuery.data?.find(c => c.channel_id === channelId);
    return count?.msg_count || 0;
  };

  const getChannelMentionCount = (channelId: string): number => {
    const count = channelUnreadQuery.data?.find(c => c.channel_id === channelId);
    return count?.mention_count || 0;
  };

  // Increment both channel and team unread counts
  const incrementUnreadCount = (channelId: string, teamId: string, mentionCount = 0) => {
    console.debug(`Incrementing unread count for channel ${channelId} in team ${teamId}, mentions: ${mentionCount}`);
    
    // Update channel unread counts
    queryClient.setQueryData<ChannelUnread[]>(
      unreadKeys.channelCounts(activeTeamId || ''),
      (old = []) => {
        const existingIndex = old.findIndex(count => count.channel_id === channelId);
        
        if (existingIndex >= 0) {
          // Update existing count
          const updated = [...old];
          updated[existingIndex] = {
            ...updated[existingIndex],
            msg_count: updated[existingIndex].msg_count + 1,
            mention_count: updated[existingIndex].mention_count + mentionCount,
          };
          return updated;
        } else {
          // Add new count entry
          return [...old, {
            channel_id: channelId,
            team_id: teamId,
            msg_count: 1,
            mention_count: mentionCount,
          }];
        }
      }
    );

    // Update team unread counts
    queryClient.setQueryData<TeamUnread[]>(
      unreadKeys.counts(),
      (old = []) => {
        const existingIndex = old.findIndex(count => count.team_id === teamId);
        
        if (existingIndex >= 0) {
          // Update existing count
          const updated = [...old];
          updated[existingIndex] = {
            ...updated[existingIndex],
            msg_count: updated[existingIndex].msg_count + 1,
            mention_count: updated[existingIndex].mention_count + mentionCount,
          };
          return updated;
        } else {
          // Add new count entry
          return [...old, {
            team_id: teamId,
            msg_count: 1,
            mention_count: mentionCount,
          }];
        }
      }
    );
  };

  // Decrement both channel and team unread counts
  const decrementUnreadCount = (channelId: string, teamId: string, mentionCount = 0) => {
    console.debug(`Decrementing unread count for channel ${channelId} in team ${teamId}`);
    
    // Update channel unread counts
    queryClient.setQueryData<ChannelUnread[]>(
      unreadKeys.channelCounts(activeTeamId || ''),
      (old = []) => old.map(count => 
        count.channel_id === channelId && count.msg_count > 0
          ? { 
              ...count, 
              msg_count: count.msg_count - 1,
              mention_count: Math.max(0, count.mention_count - mentionCount)
            }
          : count
      )
    );

    // Update team unread counts
    queryClient.setQueryData<TeamUnread[]>(
      unreadKeys.counts(),
      (old = []) => old.map(count => 
        count.team_id === teamId && count.msg_count > 0
          ? { 
              ...count, 
              msg_count: count.msg_count - 1,
              mention_count: Math.max(0, count.mention_count - mentionCount)
            }
          : count
      )
    );
  };

  // Reset channel count and adjust team count accordingly
  const resetChannelCount = (channelId: string) => {
    if (!activeTeamId) return;
    
    console.debug(`Resetting unread count for channel ${channelId}`);
    
    // Get current channel count before reset
    const currentChannelCount = getChannelUnreadCount(channelId);
    const currentChannelMentions = getChannelMentionCount(channelId);
    
    // Reset channel unread counts
    queryClient.setQueryData<ChannelUnread[]>(
      unreadKeys.channelCounts(activeTeamId),
      (old = []) => old.map(count => 
        count.channel_id === channelId 
          ? { ...count, msg_count: 0, mention_count: 0 }
          : count
      )
    );

    // Adjust team unread counts by subtracting the reset channel counts
    queryClient.setQueryData<TeamUnread[]>(
      unreadKeys.counts(),
      (old = []) => old.map(count => 
        count.team_id === activeTeamId 
          ? { 
              ...count, 
              msg_count: Math.max(0, count.msg_count - currentChannelCount),
              mention_count: Math.max(0, count.mention_count - currentChannelMentions)
            }
          : count
      )
    );
  };

  return {
    // Data
    teamUnreads: teamUnreadQuery.data || [],
    channelUnreads: channelUnreadQuery.data || [],
    isLoading: teamUnreadQuery.isLoading || channelUnreadQuery.isLoading,
    isError: teamUnreadQuery.isError || channelUnreadQuery.isError,
    error: teamUnreadQuery.error || channelUnreadQuery.error,
    
    // Actions
    markAsRead: markAsReadMutation.mutateAsync,
    isMarkingAsRead: markAsReadMutation.isPending,
    
    // Utility functions
    getTeamUnreadCount,
    getTeamMentionCount,
    getChannelUnreadCount,
    getChannelMentionCount,
    incrementUnreadCount,
    decrementUnreadCount,
    resetChannelCount,
    
    // Refetch
    refetchTeams: teamUnreadQuery.refetch,
    refetchChannels: channelUnreadQuery.refetch,
  };
}