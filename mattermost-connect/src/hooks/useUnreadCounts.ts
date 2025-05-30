import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  selectCurrentUserId,
} from '../store/selectors';
import { 
  setChannelUnread,
  incrementChannelUnreadCount,
  resetChannelUnreadCount
} from "../store";
import { client } from '../api/client';
import { useErrorHandler } from './useErrorHandler';
import type { ChannelUnreadResponse } from '../api/types';

/**
 * Unread counts hook - READ-ONLY following Mattermost pattern
 * Initial data loaded by useAppInitialization, this handles WebSocket sync + on-demand actions
 */
export const useUnreadCounts = () => {
  const dispatch = useAppDispatch();
  const { handleError } = useErrorHandler();

  const currentUserId = useAppSelector(selectCurrentUserId);
  const channelUnreads = useAppSelector(state => state.entities.channels.unreads);
  const teamUnreads = useAppSelector(state => state.entities.teams.unreads);
  const channelMembers = useAppSelector(state => state.entities.channels.myMembers);

  // On-demand channel unread loading (when needed)
  const loadChannelUnread = useCallback(async (channelId: string) => {
    if (!currentUserId) return;

    try {
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

      const channelUnread: ChannelUnreadResponse = await response.json();

      dispatch(setChannelUnread({
        channelId: channelUnread.channel_id,
        msg_count: channelUnread.msg_count,
        mention_count: channelUnread.mention_count
      }));
    } catch (error) {
      handleError(error, { action: `Failed to fetch unread count for channel ${channelId}` });
    }
  }, [currentUserId, dispatch, handleError]);

  const isChannelMuted = useCallback((channelId: string): boolean => {
    const membership = channelMembers[channelId];
    return membership?.notify_props?.mark_unread === 'mention';
  }, [channelMembers]);

  const getChannelUnreadCount = useCallback((channelId: string): number => {
    const unread = channelUnreads[channelId];
    if (!unread) return 0;
    const isMuted = isChannelMuted(channelId);
    return isMuted ? 0 : unread.msg_count;
  }, [channelUnreads, isChannelMuted]);

  const getChannelMentionCount = useCallback((channelId: string): number => {
    const unread = channelUnreads[channelId];
    return unread?.mention_count || 0;
  }, [channelUnreads]);

  const getTeamUnreadCount = useCallback((teamId: string): number => {
    const unread = teamUnreads[teamId];
    return unread?.msg_count || 0;
  }, [teamUnreads]);

  const getTeamMentionCount = useCallback((teamId: string): number => {
    const unread = teamUnreads[teamId];
    return unread?.mention_count || 0;
  }, [teamUnreads]);

  const hasChannelUnread = useCallback((channelId: string): boolean => {
    const unreadCount = getChannelUnreadCount(channelId);
    const mentionCount = getChannelMentionCount(channelId);
    return unreadCount > 0 || mentionCount > 0;
  }, [getChannelUnreadCount, getChannelMentionCount]);

  const markChannelAsRead = useCallback(async (channelId: string): Promise<void> => {
    try {
      await client.viewMyChannel(channelId);
      dispatch(resetChannelUnreadCount(channelId));
    } catch (error) {
      handleError(error, { action: 'Failed to mark channel as read' });
    }
  }, [dispatch, handleError]);

  // WebSocket events handler (called by useWebSocket)
  const handleWebSocketEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'posted':
        if (data.post && data.post.user_id !== currentUserId) {
          const channelId = data.post.channel_id;
          const mentionCount = data.post.message?.includes(`@${currentUserId}`) ? 1 : 0;
          
          dispatch(incrementChannelUnreadCount({
            channelId,
            msgCount: 1,
            mentionCount,
            fromCurrentUser: false
          }));
        }
        break;

      case 'channel_viewed':
        if (data.channel_id) {
          dispatch(resetChannelUnreadCount(data.channel_id));
        }
        break;

      case 'channel_member_updated':
        if (data.channel_member?.user_id === currentUserId) {
          // Could reload channel data if needed
        }
        break;
    }
  }, [currentUserId, dispatch]);

  return {
    // Channel functions
    getChannelUnreadCount,
    getChannelMentionCount,
    hasChannelUnread,
    
    // Team functions
    getTeamUnreadCount,
    getTeamMentionCount,
    
    // Actions
    markChannelAsRead,
    loadChannelUnread,
    
    // Utilities
    isChannelMuted,
    handleWebSocketEvent,
  };
};

export default useUnreadCounts;