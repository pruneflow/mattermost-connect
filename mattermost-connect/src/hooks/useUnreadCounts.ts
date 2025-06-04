import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  selectCurrentUserId,
  selectChannelUnreadCount,
  selectChannelMentionCount,
  selectChannelHasUnreads,
  selectIsChannelMuted,
  getTeamsUnreadStatuses,
  selectChannelUnreads,
  selectChannelMembers,
  selectChannelsData
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
 * Hook for managing unread counts
 * Uses memoized selectors to avoid recreation issues
 */
export const useUnreadCounts = () => {
  const dispatch = useAppDispatch();
  const { handleError } = useErrorHandler();

  const currentUserId = useAppSelector(selectCurrentUserId);
  const channelUnreads = useAppSelector(selectChannelUnreads);
  const channelMembers = useAppSelector(selectChannelMembers);
  const channels = useAppSelector(selectChannelsData);

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

  // Helper functions using selectors instead of inline logic
  const isChannelMuted = useCallback((channelId: string): boolean => {
    return selectIsChannelMuted(channelId)({ entities: { channels: { myMembers: channelMembers } } } as any);
  }, [channelMembers]);

  const hasChannelUnread = useCallback((channelId: string): boolean => {
    return selectChannelHasUnreads(channelId)({ 
      entities: { 
        channels: { 
          unreads: channelUnreads, 
          myMembers: channelMembers 
        } 
      } 
    } as any);
  }, [channelUnreads, channelMembers]);

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
    // Channel functions - return selector references
    getChannelUnreadCount: selectChannelUnreadCount,
    getChannelMentionCount: selectChannelMentionCount,
    getChannelHasUnreads: selectChannelHasUnreads,
    getIsChannelMuted: selectIsChannelMuted,
    
    // Legacy functions for backward compatibility
    hasChannelUnread,
    isChannelMuted,
    
    // Team functions
    getTeamsUnreadStatuses,
    
    // Actions
    markChannelAsRead,
    loadChannelUnread,
    
    // Utilities
    handleWebSocketEvent,
  };
};

export default useUnreadCounts;