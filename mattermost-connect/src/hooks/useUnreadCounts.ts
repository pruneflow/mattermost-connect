import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  selectCurrentUserId,
  selectChannelUnreadCount,
  selectChannelMentionCount,
  getTeamsUnreadStatuses,
} from '../store/selectors';
import { 
  setChannelUnread,
  incrementChannelUnreadCount,
  resetChannelUnreadCount,
  incrementTeamUnreadCount,
  resetTeamUnreadCount
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
  const channelMembers = useAppSelector(state => state.entities.channels.myMembers);
  const channels = useAppSelector(state => state.entities.channels.channels);

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



  const hasChannelUnread = useCallback((channelId: string): boolean => {
    const unread = channelUnreads[channelId];
    if (!unread) return false;
    
    const isMuted = isChannelMuted(channelId);
    const unreadCount = isMuted ? 0 : unread.msg_count;
    const mentionCount = unread.mention_count;
    
    return unreadCount > 0 || mentionCount > 0;
  }, [channelUnreads, isChannelMuted]);

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
          
          // Update channel unread count
          dispatch(incrementChannelUnreadCount({
            channelId,
            msgCount: 1,
            mentionCount,
            fromCurrentUser: false
          }));

          // Update team unread count
          const channel = channels[channelId];
          if (channel && channel.team_id) {
            dispatch(incrementTeamUnreadCount({
              teamId: channel.team_id,
              msgCount: 1,
              mentionCount
            }));
          }
        }
        break;

      case 'channel_viewed':
        if (data.channel_id) {
          const channelId = data.channel_id;
          const channelUnread = channelUnreads[channelId];
          
          // Reset channel unread count
          dispatch(resetChannelUnreadCount(channelId));
          
          // Decrement team unread count by the amount that was in this channel
          const channel = channels[channelId];
          if (channel && channel.team_id && channelUnread) {
            // Check if channel is muted
            const membership = channelMembers[channelId];
            const isMuted = membership?.notify_props?.mark_unread === 'mention';
            
            // Decrement team counts by what was reset in the channel
            const msgCountToDecrement = isMuted ? 0 : channelUnread.msg_count;
            const mentionCountToDecrement = channelUnread.mention_count;
            
            if (msgCountToDecrement > 0 || mentionCountToDecrement > 0) {
              dispatch(incrementTeamUnreadCount({
                teamId: channel.team_id,
                msgCount: -msgCountToDecrement, // Negative to decrement
                mentionCount: -mentionCountToDecrement // Negative to decrement
              }));
            }
          }
        }
        break;

      case 'channel_member_updated':
        if (data.channel_member?.user_id === currentUserId) {
          // Could reload channel data if needed
        }
        break;
    }
  }, [currentUserId, dispatch, channels, channelUnreads, channelMembers]);

  return {
    // Channel functions - return selectors directly
    getChannelUnreadCount: selectChannelUnreadCount,
    getChannelMentionCount: selectChannelMentionCount,
    hasChannelUnread,
    
    // Team functions - use getTeamsUnreadStatuses
    getTeamsUnreadStatuses,
    
    // Actions
    markChannelAsRead,
    loadChannelUnread,
    
    // Utilities
    isChannelMuted,
    handleWebSocketEvent,
  };
};

export default useUnreadCounts;