import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  setChannel,
  setChannelMember,
  addChannelToTeam,
  removeChannelFromTeam,
  addSingleChannelToTeam
} from '../store/slices/entitiesSlice';
import { selectCurrentUserId } from '../store/selectors';
import { client } from '../api/client';
import { handleError } from '../services/errorService';

/**
 * Hook for handling channel-related WebSocket events
 * Processes real-time channel updates from any team
 */
export const useChannelWebSocket = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Handle incoming WebSocket events for channels
  const handleChannelEvent = useCallback((event: string, data: Record<string, any>, broadcast?: Record<string, any>) => {
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
        const channelId = broadcast?.channel_id;
        const addedUserId = data.user_id;
        const teamId = data.team_id;
        
        if (!channelId || !addedUserId || !teamId) break;
        
        if (addedUserId === currentUserId) {
          // Current user was added to a channel - use complete setup like loadChannelsForTeam
          dispatch(addSingleChannelToTeam({ channelId, teamId }))
            .catch(error => handleError(error, { action: 'Failed to add channel after user_added event' }));
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