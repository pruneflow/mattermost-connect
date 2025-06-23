import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  selectCurrentUserId,
  selectCurrentUser,
  selectCurrentTeamId,
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
  const currentUser = useAppSelector(selectCurrentUser);
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const channelUnreads = useAppSelector(state => state.entities.channels.unreads);
  const channels = useAppSelector(state => state.entities.channels.channels);
  const { handleError } = useErrorHandler();

  // Get channel data using stable selector pattern
  const getChannelData = useCallback((channelId: string) => {
    return (state: any) => selectChannelById(state, channelId);
  }, []);

  const markChannelAsRead = useCallback(async (channelId: string): Promise<void> => {
    try {
      if (!currentUserId || !currentTeamId) return;

      // Get current unread counts for this channel
      const currentUnreads = channelUnreads[channelId];
      if (currentUnreads) {
        // Decrement team unreads by the amount this channel had (Mattermost pattern)
        dispatch(incrementTeamUnreadCount({
          teamId: currentTeamId,
          msgCount: -currentUnreads.msg_count, // negative to decrement
          mentionCount: -currentUnreads.mention_count, // negative to decrement
        }));
      }

      // Call API to mark channel as read
      await client.viewMyChannel(channelId);
      
      // Reset channel unread count
      dispatch(resetChannelUnreadCount(channelId));
      
    } catch (error) {
      handleError(error, { action: `Failed to mark channel ${channelId} as read` });
    }
  }, [currentUserId, currentTeamId, channelUnreads, dispatch, handleError]);

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
        if (data.post) {
          const post = typeof data.post === 'string' ? JSON.parse(data.post) : data.post;
          if(post.user_id !== currentUserId) {
            const channelId = post.channel_id;
            const teamId = data.team_id;
            const channel = channels[channelId];
            
            let msgCount = 1;
            let mentionCount = 0;
            
            if (channel?.type === 'D') {
              // Direct Messages: all messages are mentions, don't increment msg_count
              msgCount = 0;
              mentionCount = 1; // Every DM message is a mention
            } else {
              // Team channels: normal logic
              msgCount = 1;
              mentionCount = post.message?.includes(`@${currentUser?.username}`) ? 1 : 0;
            }

            // Update channel unread count in channels.unreads
            dispatch(incrementChannelUnreadCount({
              channelId,
              msgCount,
              mentionCount,
              fromCurrentUser: false,
            }));

            // Update team unread count
            if (teamId) {
              dispatch(incrementTeamUnreadCount({
                teamId,
                msgCount,
                mentionCount,
              }));
            }
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
  }, [currentUserId, currentUser?.username, dispatch]);

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