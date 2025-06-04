import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  setChannel,
  setChannelMember,
  addChannelToTeam,
  removeChannelFromTeam
} from '../store/slices/entitiesSlice';
import { selectCurrentUserId } from '../store/selectors';
import { client } from '../api/client';
import { useErrorHandler } from './useErrorHandler';

/**
 * Hook for handling channel-related WebSocket events
 * Processes real-time channel updates from any team
 */
export const useChannelWebSocket = () => {
  const dispatch = useAppDispatch();
  const { handleError } = useErrorHandler();
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Handle incoming WebSocket events for channels
  const handleChannelEvent = useCallback((event: string, data: Record<string, any>) => {
    switch (event) {
      case 'channel_created':
        if (data.channel) {
          dispatch(setChannel(data.channel));
          if (data.channel.team_id) {
            dispatch(addChannelToTeam({ 
              teamId: data.channel.team_id, 
              channelId: data.channel.id 
            }));
          }
        }
        break;

      case 'channel_updated':
        if (data.channel) {
          dispatch(setChannel(data.channel));
        }
        break;

      case 'user_added':
        if (data.user_id === currentUserId && data.channel_id) {
          // Current user was added to a channel - fetch member info
          client.getChannelMember(data.channel_id, currentUserId)
            .then(member => {
              dispatch(setChannelMember(member));
            })
            .catch(error => handleError(error, { action: 'Failed to fetch channel member' }));
        }
        break;

      case 'user_removed':
        if (data.user_id === currentUserId && data.channel_id && data.team_id) {
          // Current user was removed from a channel
          dispatch(removeChannelFromTeam({ 
            teamId: data.team_id, 
            channelId: data.channel_id 
          }));
        }
        break;

      case 'channel_deleted':
        if (data.channel_id && data.team_id) {
          dispatch(removeChannelFromTeam({ 
            teamId: data.team_id, 
            channelId: data.channel_id 
          }));
        }
        break;
    }
  }, [dispatch, currentUserId, handleError]);

  return {
    handleChannelEvent,
  };
};

export default useChannelWebSocket;