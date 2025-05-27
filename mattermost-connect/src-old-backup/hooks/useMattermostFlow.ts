import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Hook qui suit EXACTEMENT le flow Mattermost comme décrit :
 * 1. /users/me/teams → 4 équipes
 * 2. /users/me/teams/{activeTeamId}/channels → channels de l'équipe active SEULEMENT
 * 3. /users/{userId}/channels/{channelId}/posts/unread → pour le channel actif
 * 4. /users/ids → pour les utilisateurs des DMs
 * 5. /users/status/ids → pour les statuts (bulk)
 */

export function useMattermostFlow(activeTeamId?: string, activeChannelId?: string) {
  const { user } = useAuth();
  const userId = user?.id;

  // 1. Get user teams
  const teamsQuery = useQuery({
    queryKey: ['mattermost-flow', 'teams'],
    queryFn: async () => {
      const response = await api.get<any[]>('users/me/teams');
      console.log(`[MATTERMOST-FLOW] Fetched ${response.data.length} teams`);
      return response.data;
    },
    enabled: !!userId,
  });

  // 2. Get channels for ACTIVE team only (not all teams)
  const activeTeamChannelsQuery = useQuery({
    queryKey: ['mattermost-flow', 'team-channels', activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      
      const response = await api.get<any[]>(`users/me/teams/${activeTeamId}/channels`);
      console.log(`[MATTERMOST-FLOW] Fetched ${response.data.length} channels for active team ${activeTeamId}`);
      return response.data;
    },
    enabled: !!userId && !!activeTeamId,
  });

  // 2.5 Get channel members for ACTIVE team (for unread calculation)
  const activeTeamChannelMembersQuery = useQuery({
    queryKey: ['mattermost-flow', 'team-channel-members', activeTeamId],
    queryFn: async () => {
      if (!activeTeamId) return [];
      
      const response = await api.get<any[]>(`users/me/teams/${activeTeamId}/channels/members`);
      console.log(`[MATTERMOST-FLOW] Fetched ${response.data.length} channel members for active team ${activeTeamId}`);
      return response.data;
    },
    enabled: !!userId && !!activeTeamId,
  });

  // 3. Get unread posts for ACTIVE channel only
  const activeChannelPostsQuery = useQuery({
    queryKey: ['mattermost-flow', 'channel-posts', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId || !userId) return null;
      
      const response = await api.get(`users/${userId}/channels/${activeChannelId}/posts/unread`, {
        limit_after: 30,
        limit_before: 30,
        skipFetchThreads: false,
        collapsedThreads: true,
        collapsedThreadsExtended: false
      });
      
      console.log(`[MATTERMOST-FLOW] Fetched unread posts for channel ${activeChannelId}`);
      return response.data;
    },
    enabled: !!userId && !!activeChannelId,
  });

  // 4. Calculate unread counts using the new approach: total_msg_count - msg_count
  const channelUnreadCounts = (() => {
    const channels = activeTeamChannelsQuery.data || [];
    const members = activeTeamChannelMembersQuery.data || [];
    const unreadCounts: Record<string, number> = {};
    
    channels.forEach((channel: any) => {
      // Find the corresponding member data for this channel
      const memberData = members.find((member: any) => member.channel_id === channel.id);
      
      if (memberData) {
        // Calculate: unread = total_msg_count - msg_count
        const totalMessages = channel.total_msg_count || 0;
        const readMessages = memberData.msg_count || 0;
        const unreadCount = Math.max(0, totalMessages - readMessages);
        
        unreadCounts[channel.id] = unreadCount;
        
        if (unreadCount > 0) {
          console.log(`[MATTERMOST-FLOW] Channel ${channel.id}: ${unreadCount} unread (${totalMessages} total - ${readMessages} read)`);
        }
      } else {
        // If no member data, assume no unread messages
        unreadCounts[channel.id] = 0;
      }
    });
    
    return unreadCounts;
  })();

  // 5. Collect all user IDs from DMs and channels - will be used for bulk calls
  const allUserIds = (() => {
    const userIds = new Set<string>();
    
    // Add current user
    if (userId) userIds.add(userId);
    
    // Add users from active team channels (members, DMs, etc.)
    (activeTeamChannelsQuery.data || []).forEach((channel: any) => {
      if (channel.type === 'D' && channel.name) {
        // For DMs, extract user IDs from channel name
        const dmUserIds = channel.name.split('__').filter((id: string) => id !== userId);
        dmUserIds.forEach((id: string) => userIds.add(id));
      }
    });
    
    return Array.from(userIds);
  })();

  // 6. Bulk fetch user info (/users/ids)
  const usersInfoQuery = useQuery({
    queryKey: ['mattermost-flow', 'users-bulk', allUserIds.sort().join(',')],
    queryFn: async () => {
      if (allUserIds.length === 0) return [];
      
      const response = await api.post<any[]>('users/ids', allUserIds);
      console.log(`[MATTERMOST-FLOW] Bulk fetched ${response.data.length} users info`);
      return response.data;
    },
    enabled: allUserIds.length > 0,
  });

  // 7. Bulk fetch user statuses (/users/status/ids)
  const usersStatusQuery = useQuery({
    queryKey: ['mattermost-flow', 'statuses-bulk', allUserIds.sort().join(',')],
    queryFn: async () => {
      if (allUserIds.length === 0) return [];
      
      const response = await api.post<any[]>('users/status/ids', allUserIds);
      console.log(`[MATTERMOST-FLOW] Bulk fetched ${response.data.length} user statuses`);
      return response.data;
    },
    enabled: allUserIds.length > 0,
  });

  return {
    // Data
    teams: teamsQuery.data || [],
    activeTeamChannels: activeTeamChannelsQuery.data || [],
    activeTeamChannelMembers: activeTeamChannelMembersQuery.data || [],
    activeChannelPosts: activeChannelPostsQuery.data,
    usersInfo: usersInfoQuery.data || [],
    usersStatus: usersStatusQuery.data || [],
    
    // Calculated unread counts (NEW APPROACH)
    channelUnreadCounts,
    
    // Utility function to get unread count for a specific channel
    getChannelUnreadCount: (channelId: string) => channelUnreadCounts[channelId] || 0,
    
    // Loading states
    isLoadingTeams: teamsQuery.isLoading,
    isLoadingChannels: activeTeamChannelsQuery.isLoading,
    isLoadingChannelMembers: activeTeamChannelMembersQuery.isLoading,
    isLoadingPosts: activeChannelPostsQuery.isLoading,
    isLoadingUsers: usersInfoQuery.isLoading,
    isLoadingStatuses: usersStatusQuery.isLoading,
    
    // Errors
    errors: {
      teams: teamsQuery.error,
      channels: activeTeamChannelsQuery.error,
      channelMembers: activeTeamChannelMembersQuery.error,
      posts: activeChannelPostsQuery.error,
      users: usersInfoQuery.error,
      statuses: usersStatusQuery.error,
    },
    
    // Refetch functions
    refetchTeams: teamsQuery.refetch,
    refetchChannels: activeTeamChannelsQuery.refetch,
    refetchChannelMembers: activeTeamChannelMembersQuery.refetch,
    refetchPosts: activeChannelPostsQuery.refetch,
    refetchUsers: usersInfoQuery.refetch,
    refetchStatuses: usersStatusQuery.refetch,
  };
}