import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ChannelMember } from '../api/types';

// Query keys
export const channelMemberKeys = {
  all: ['channelMembers'] as const,
  lists: () => [...channelMemberKeys.all, 'list'] as const,
  list: (channelId: string) => [...channelMemberKeys.lists(), channelId] as const,
  detail: (channelId: string, userId: string) => [...channelMemberKeys.list(channelId), userId] as const,
  bulk: (channelId: string, userIds: string[]) => [...channelMemberKeys.list(channelId), 'bulk', userIds.sort().join(',')] as const,
};

interface UseChannelMemberOptions {
  channelId: string;
  userId: string;
  enabled?: boolean;
}

interface UseChannelMembersOptions {
  channelId: string;
  userIds: string[];
  enabled?: boolean;
}

// Export pour corriger l'erreur de compilation dans le hook individuel
export interface UseChannelMembersResult {
  members: ChannelMember[];
  isLoading: boolean;
  isError: boolean;
  error: any;
}

/**
 * Hook for fetching a single channel member - DÉPRÉCIÉ
 * Utilise maintenant useChannelMembers avec un seul userId pour le bulk
 */
export function useChannelMember({ channelId, userId, enabled = true }: UseChannelMemberOptions) {
  // Déléguer au hook bulk avec un seul userId
  const bulkResult = useChannelMembers({
    channelId,
    userIds: [userId],
    enabled,
  });
  
  return {
    data: bulkResult.data?.find(m => m.user_id === userId) || null,
    isLoading: bulkResult.isLoading,
    isError: bulkResult.isError,
    error: bulkResult.error,
  };
}

/**
 * NOUVEAU: Hook for fetching multiple channel members - BULK ENDPOINT
 * Utilise POST /channels/{channel_id}/members/ids pour performance optimale
 */
export function useChannelMembers({ channelId, userIds, enabled = true }: UseChannelMembersOptions) {
  const query = useQuery<ChannelMember[]>({
    queryKey: channelMemberKeys.bulk(channelId, userIds),
    queryFn: async (): Promise<ChannelMember[]> => {
      if (userIds.length === 0) return [];
      
      try {
        // NOUVEAU: Utiliser l'endpoint bulk de Mattermost
        console.log(`[CHANNEL-MEMBERS] Bulk fetching ${userIds.length} members for channel ${channelId}`);
        const response = await api.post<ChannelMember[]>(`/channels/${channelId}/members/ids`, userIds);
        
        console.log(`[CHANNEL-MEMBERS] Successfully fetched ${response.data.length} members`);
        return response.data;
      } catch (error) {
        console.error('Error bulk fetching channel members:', error);
        return [];
      }
    },
    enabled: enabled && !!channelId && userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - data doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for fetching ALL channel members for a channel
 * Utilise l'endpoint standard GET /channels/{channel_id}/members
 */
export function useAllChannelMembers(channelId: string, enabled: boolean = true) {
  return useQuery<ChannelMember[]>({
    queryKey: channelMemberKeys.list(channelId),
    queryFn: async (): Promise<ChannelMember[]> => {
      const response = await api.get<ChannelMember[]>(`/channels/${channelId}/members`);
      return response.data;
    },
    enabled: enabled && !!channelId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * NOUVEAU: Hook for fetching ALL channel members for a TEAM
 * Utilise l'endpoint BULK /users/me/teams/{team_id}/channels/members
 * Retourne TOUS les membres de TOUS les channels de la team en un seul appel
 */
export function useTeamChannelMembers(teamId: string, enabled: boolean = true) {
  return useQuery<ChannelMember[]>({
    queryKey: ['teamChannelMembers', teamId],
    queryFn: async (): Promise<ChannelMember[]> => {
      try {
        console.log(`[TEAM-MEMBERS] Bulk fetching ALL channel members for team ${teamId}`);
        const response = await api.get<ChannelMember[]>(`/users/me/teams/${teamId}/channels/members`);
        
        console.log(`[TEAM-MEMBERS] Successfully fetched ${response.data.length} total members across all team channels`);
        return response.data;
      } catch (error) {
        console.error('Error bulk fetching team channel members:', error);
        return [];
      }
    },
    enabled: enabled && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes - team membership doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}