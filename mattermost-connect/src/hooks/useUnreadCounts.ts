import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { client } from '../api/client';
import { useErrorHandler } from './useErrorHandler';
import type { ChannelMember } from '../api/types';

// Official Mattermost unread interfaces
export interface TeamUnread {
  team_id: string;
  msg_count: number;
  mention_count: number;
}

export interface ChannelUnread {
  team_id: string;
  channel_id: string;
  msg_count: number;
  mention_count: number;
}

export interface ThreadMentionCount {
  mention_count: number;
  thread_count: number;
}

export interface ThreadMentionCounts {
  [channel_id: string]: ThreadMentionCount;
}

// Channel notification preferences from Mattermost
export interface ChannelNotifyProps {
  email: 'true' | 'false' | 'default';
  push: 'all' | 'mention' | 'none' | 'default';
  desktop: 'all' | 'mention' | 'none' | 'default';
  mark_unread: 'all' | 'mention'; // KEY: 'mention' = muted channel
}

interface UnreadState {
  teamUnreads: Map<string, TeamUnread>;
  channelUnreads: Map<string, ChannelUnread>;
  threadMentions: Map<string, Record<string, number>>;
  isLoading: boolean;
  lastFetch: number;
}

/**
 * Advanced unread counts following official Mattermost patterns
 * Handles muted channels, thread unreads, and proper filtering
 */
export const useUnreadCounts = () => {
  const dispatch = useAppDispatch();
  const { handleError } = useErrorHandler();
  
  // Get current user and team from store
  const currentUserId = useAppSelector(state => state.entities.users.currentUserId);
  const currentTeamId = useAppSelector(state => state.entities.teams.currentTeamId);
  const teams = useAppSelector(state => state.entities.teams.teams);
  const channelMemberships = useAppSelector(state => state.entities.channels.myMembers);
  
  const [state, setState] = useState<UnreadState>({
    teamUnreads: new Map(),
    channelUnreads: new Map(),
    threadMentions: new Map(),
    isLoading: false,
    lastFetch: 0,
  });

  // Check if channel is muted - following Mattermost pattern
  const isChannelMuted = useCallback((channelId: string): boolean => {
    const membership = channelMemberships[channelId];
    return membership?.notify_props?.mark_unread === 'mention';
  }, [channelMemberships]);

  // Fetch team unread counts - official API
  const fetchTeamUnreads = useCallback(async (): Promise<TeamUnread[]> => {
    try {
      const response = await client.getMyTeamUnreads();
      return response;
    } catch (error) {
      handleError(error, { action: 'Failed to fetch team unread counts' });
      return [];
    }
  }, [handleError]);

  // Fetch channel unread count using direct API call
  const fetchChannelUnread = useCallback(async (channelId: string): Promise<ChannelUnread | null> => {
    if (!currentUserId) return null;
    
    try {
      // Direct API call since Client4.getChannelUnread doesn't exist in our version
      const url = `${client.getUrl()}/api/v4/users/${currentUserId}/channels/${channelId}/unread`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${client.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      handleError(error, { action: `Failed to fetch unread count for channel ${channelId}` });
      return null;
    }
  }, [currentUserId, handleError]);

  // Skip thread mentions for now - API may not exist in all MM versions
  const fetchThreadMentions = useCallback(async (teamId: string): Promise<Record<string, number>> => {
    // Return empty object - thread mentions not supported yet
    return {};
  }, []);

  // Load specific channel unread count
  const loadChannelUnread = useCallback(async (channelId: string) => {
    const channelUnread = await fetchChannelUnread(channelId);
    if (channelUnread) {
      setState(prev => {
        const newChannelUnreads = new Map(prev.channelUnreads);
        newChannelUnreads.set(channelId, channelUnread);
        return {
          ...prev,
          channelUnreads: newChannelUnreads,
        };
      });
    }
  }, [fetchChannelUnread]);

  // Load all unread counts following Mattermost performance pattern
  const loadUnreadCounts = useCallback(async () => {
    if (!currentUserId) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // 1. Fetch team unread counts (single API call for all teams)
      const teamUnreads = await fetchTeamUnreads();
      const teamUnreadMap = new Map<string, TeamUnread>();
      teamUnreads.forEach(unread => teamUnreadMap.set(unread.team_id, unread));

      // 2. Fetch thread mentions for current team
      let threadMentions = new Map<string, Record<string, number>>();
      if (currentTeamId) {
        const mentions = await fetchThreadMentions(currentTeamId);
        threadMentions.set(currentTeamId, mentions);
      }

      setState(prev => ({
        ...prev,
        teamUnreads: teamUnreadMap,
        threadMentions,
        isLoading: false,
        lastFetch: Date.now(),
      }));
    } catch (error) {
      handleError(error, { action: 'Failed to load unread counts' });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [currentUserId, currentTeamId, fetchTeamUnreads, fetchThreadMentions, handleError]);

  // Get filtered unread count for channel (respecting muted status)
  const getChannelUnreadCount = useCallback((channelId: string): number => {
    const unread = state.channelUnreads.get(channelId);
    if (!unread) return 0;

    const isMuted = isChannelMuted(channelId);
    
    if (isMuted) {
      // Muted channels: only show mention count, ignore message count
      return 0;
    }
    
    return unread.msg_count;
  }, [state.channelUnreads, isChannelMuted]);

  // Get mention count for channel (always shown even for muted channels)
  const getChannelMentionCount = useCallback((channelId: string): number => {
    const unread = state.channelUnreads.get(channelId);
    return unread?.mention_count || 0;
  }, [state.channelUnreads]);

  // Get team unread count (excluding muted channels)
  const getTeamUnreadCount = useCallback((teamId: string): number => {
    const teamUnread = state.teamUnreads.get(teamId);
    if (!teamUnread) return 0;

    // For teams, we need to manually exclude muted channels
    // This follows the official Mattermost pattern
    let totalUnread = 0;
    
    state.channelUnreads.forEach((channelUnread, channelId) => {
      if (channelUnread.team_id === teamId && !isChannelMuted(channelId)) {
        totalUnread += channelUnread.msg_count;
      }
    });

    return totalUnread;
  }, [state.teamUnreads, state.channelUnreads, isChannelMuted]);

  // Get team mention count (includes muted channels)
  const getTeamMentionCount = useCallback((teamId: string): number => {
    const teamUnread = state.teamUnreads.get(teamId);
    if (!teamUnread) return 0;

    // Mentions are always shown, even for muted channels
    let totalMentions = 0;
    
    state.channelUnreads.forEach((channelUnread) => {
      if (channelUnread.team_id === teamId) {
        totalMentions += channelUnread.mention_count;
      }
    });

    return totalMentions;
  }, [state.teamUnreads, state.channelUnreads]);

  // Get thread mention count for channel
  const getThreadMentionCount = useCallback((channelId: string): number => {
    if (!currentTeamId) return 0;
    
    const teamThreads = state.threadMentions.get(currentTeamId);
    if (!teamThreads) return 0;
    
    return teamThreads[channelId] || 0;
  }, [currentTeamId, state.threadMentions]);

  // Check if channel has any unreads (messages or mentions)
  const hasChannelUnread = useCallback((channelId: string): boolean => {
    const unreadCount = getChannelUnreadCount(channelId);
    const mentionCount = getChannelMentionCount(channelId);
    const threadMentions = getThreadMentionCount(channelId);
    
    return unreadCount > 0 || mentionCount > 0 || threadMentions > 0;
  }, [getChannelUnreadCount, getChannelMentionCount, getThreadMentionCount]);

  // Mark channel as read - following Mattermost API
  const markChannelAsRead = useCallback(async (channelId: string): Promise<void> => {
    try {
      await client.viewMyChannel(channelId);
      
      // Update local state immediately for responsive UI
      setState(prev => {
        const newChannelUnreads = new Map(prev.channelUnreads);
        const currentUnread = newChannelUnreads.get(channelId);
        
        if (currentUnread) {
          newChannelUnreads.set(channelId, {
            ...currentUnread,
            msg_count: 0,
            mention_count: 0,
          });
        }
        
        return {
          ...prev,
          channelUnreads: newChannelUnreads,
        };
      });
    } catch (error) {
      handleError(error, { action: 'Failed to mark channel as read' });
    }
  }, [handleError]);

  // Initial load and refresh every 5 minutes (following Mattermost pattern)
  useEffect(() => {
    if (currentUserId) {
      loadUnreadCounts();
      
      const interval = setInterval(loadUnreadCounts, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [currentUserId, loadUnreadCounts]);

  // WebSocket event handlers (to be called from central WebSocket manager)
  const handleWebSocketEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'posted':
        if (data.post && data.post.user_id !== currentUserId) {
          const channelId = data.post.channel_id;
          setState(prev => {
            const newChannelUnreads = new Map(prev.channelUnreads);
            const currentUnread = newChannelUnreads.get(channelId);
            
            if (currentUnread) {
              newChannelUnreads.set(channelId, {
                ...currentUnread,
                msg_count: currentUnread.msg_count + 1,
              });
            }
            
            return {
              ...prev,
              channelUnreads: newChannelUnreads,
            };
          });
        }
        break;
        
      case 'channel_viewed':
        if (data.channel_id) {
          markChannelAsRead(data.channel_id);
        }
        break;
        
      case 'channel_member_updated':
        // Reload when notification preferences change
        if (data.channel_member?.user_id === currentUserId) {
          loadUnreadCounts();
        }
        break;
    }
  }, [currentUserId, markChannelAsRead, loadUnreadCounts]);

  return {
    // State
    isLoading: state.isLoading,
    lastFetch: state.lastFetch,
    
    // Channel functions
    getChannelUnreadCount,
    getChannelMentionCount,
    hasChannelUnread,
    
    // Team functions  
    getTeamUnreadCount,
    getTeamMentionCount,
    
    // Thread functions
    getThreadMentionCount,
    
    // Actions
    markChannelAsRead,
    loadUnreadCounts,
    loadChannelUnread,
    
    // Utilities
    isChannelMuted,
    handleWebSocketEvent,
  };
};

export default useUnreadCounts;