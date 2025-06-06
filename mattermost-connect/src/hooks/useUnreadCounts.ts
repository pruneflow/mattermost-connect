import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  selectCurrentUserId,
  selectChannelById,
} from '../store/selectors';
import {
  incrementChannelUnreadCount,
  resetChannelUnreadCount,
  incrementTeamUnreadCount,
  resetTeamUnreadCount,
} from "../store";
import { client } from '../api/client';
import { useErrorHandler } from './useErrorHandler';

/**
 * Hook for managing unread counts with single source of truth
 * - Initial unreads calculated from channel/member data and stored in channels.unreads
 * - WebSocket events update channels.unreads directly
 * - Selectors read from channels.unreads only
 */
export const useUnreadCounts = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const { handleError } = useErrorHandler();

  // Get channel data using new selector
  const getChannelData = useCallback((channelId: string) => {
    return selectChannelById(channelId);
  }, []);

  const markChannelAsRead = useCallback(async (channelId: string): Promise<void> => {
    try {
      if (!currentUserId) return;

      // Call API to mark channel as read
      await client.viewMyChannel(channelId);
      
      // Reset unread count in store
      dispatch(resetChannelUnreadCount(channelId));
      
    } catch (error) {
      handleError(error, { action: `Failed to mark channel ${channelId} as read` });
    }
  }, [currentUserId, dispatch, handleError]);

  const markTeamAsRead = useCallback(async (teamId: string): Promise<void> => {
    try {
      if (!currentUserId) return;

      // Reset team unread count in store
      dispatch(resetTeamUnreadCount(teamId));
      
    } catch (error) {
      handleError(error, { action: `Failed to mark team ${teamId} as read` });
    }
  }, [currentUserId, dispatch, handleError]);

  // Handle WebSocket events for unreads - single source of truth updates
  const handleWebSocketEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'posted':
        if (data.post && data.post.user_id !== currentUserId) {
          const channelId = data.post.channel_id;
          const teamId = data.team_id;
          const mentionCount = data.post.message?.includes(`@${currentUserId}`) ? 1 : 0;
          
          // Update channel unread count in channels.unreads
          dispatch(incrementChannelUnreadCount({
            channelId,
            msgCount: 1,
            mentionCount,
            fromCurrentUser: false,
          }));

          // Update team unread count
          if (teamId) {
            dispatch(incrementTeamUnreadCount({
              teamId,
              msgCount: 1,
              mentionCount,
            }));
          }
        }
        break;
        
      case 'channel_viewed':
        if (data.channel_id) {
          // Reset channel unread count in channels.unreads
          dispatch(resetChannelUnreadCount(data.channel_id));
        }
        break;
        
      default:
        // Ignore other events
        break;
    }
  }, [currentUserId, dispatch]);

  return {
    // Channel functions
    getChannelData,
    markChannelAsRead,
    markTeamAsRead,
    
    // WebSocket handler - updates single source of truth
    handleWebSocketEvent,
  };
};

export default useUnreadCounts;