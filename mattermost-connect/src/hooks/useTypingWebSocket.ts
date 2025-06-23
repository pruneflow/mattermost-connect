import { useCallback, useRef, useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { addTypingEvent, clearExpiredTypingEvents } from '../store/slices/websocketSlice';
import { selectCurrentUserId, selectUserProfiles } from '../store/selectors';
import { displayUsername } from '../utils/userUtils';

/**
 * Hook for handling typing-related WebSocket events
 * Works with @mattermost/client WebSocketClient
 */
export const useTypingWebSocket = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const userProfiles = useAppSelector(selectUserProfiles);

  // Automatic cleanup of expired typing events (optimized frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(clearExpiredTypingEvents(Date.now()));
    }, 2500); // Check every 2.5 seconds for expired events (5s timeout / 2)
    
    return () => clearInterval(interval);
  }, [dispatch]);

  // Handle incoming WebSocket events for typing
  const handleTypingEvent = useCallback((msg: any) => {
    if (msg.event === 'typing') {
      // Extract data following Mattermost pattern: user_id in data, channel_id in broadcast
      const userId = msg.data?.user_id;
      const channelId = msg.broadcast?.channel_id;
      
      // Ignore our own typing events
      if (userId === currentUserId) {
        return;
      }

      // Validate required fields
      if (!userId || !channelId) {
        return;
      }

      // Get user info for display name
      const user = userProfiles[userId];
      const username = user ? displayUsername(user, "full_name_nickname", true) : msg.data?.username || 'Unknown User';
      
      dispatch(addTypingEvent({
        channel_id: channelId,
        user_id: userId,
        username,
        timestamp: Date.now(),
      }));
    }
  }, [dispatch, currentUserId, userProfiles]);

  // Send typing event - will be provided by useWebSocket or can be implemented later
  const sendTypingEvent = useCallback((channelId: string, parentId?: string) => {
    // This will be implemented when we have a component that needs to send typing events
  }, []);

  return {
    handleTypingEvent,
    sendTypingEvent,
  };
};

export default useTypingWebSocket;