import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { 
  selectTypingEvents,
  selectTypingEventsForChannel,
  selectIsAnyoneTypingInChannel,
  selectTypingUsersInChannel,
  selectTypingMessageForChannel
} from '../store/selectors';

// Re-export type for convenience
export type { TypingEvent } from '../store/slices/websocketSlice';

/**
 * Hook for typing events management using optimized selectors
 * Following Mattermost patterns for typing indicators
 */
export const useTypingEvents = () => {
  // Get all typing events (memoized)
  const typingEvents = useAppSelector(selectTypingEvents);

  // Factory functions that return selector-based functions
  const getTypingEventsForChannel = useCallback((channelId: string) => {
    return (state: any) => selectTypingEventsForChannel(channelId)(state);
  }, []);

  const isAnyoneTypingInChannel = useCallback((channelId: string) => {
    return (state: any) => selectIsAnyoneTypingInChannel(channelId)(state);
  }, []);

  const getTypingUsersInChannel = useCallback((channelId: string) => {
    return (state: any) => selectTypingUsersInChannel(channelId)(state);
  }, []);

  const getTypingMessageForChannel = useCallback((channelId: string) => {
    return (state: any) => selectTypingMessageForChannel(channelId)(state);
  }, []);

  return {
    // All typing events
    typingEvents,
    
    // Channel-specific functions (return selector functions)
    getTypingEventsForChannel,
    isAnyoneTypingInChannel,
    getTypingUsersInChannel,
    getTypingMessageForChannel,
  };
};

/**
 * Hook for typing events in a specific channel (optimized for single channel)
 * Use this when you only need typing data for one channel
 */
export const useTypingEventsForChannel = (channelId: string) => {
  const typingEvents = useAppSelector(selectTypingEventsForChannel(channelId));
  const isAnyoneTyping = useAppSelector(selectIsAnyoneTypingInChannel(channelId));
  const typingUsers = useAppSelector(selectTypingUsersInChannel(channelId));
  const typingMessage = useAppSelector(selectTypingMessageForChannel(channelId));

  return {
    typingEvents,
    isAnyoneTyping,
    typingUsers,
    typingMessage,
  };
};

export default useTypingEvents;