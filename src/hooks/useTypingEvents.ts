import { useAppSelector } from './useAppSelector';
import { selectCurrentUserId, selectTypingEventsByChannel } from '../store/selectors';

// Re-export type for convenience
export type { TypingEvent } from '../store/slices/websocketSlice';

/**
 * Hook for typing events in a specific channel (Direct state access approach)
 * Directly accesses the specific channel's typing events to avoid global re-renders
 */
export const useTypingEventsForChannel = (channelId: string) => {
  // Direct access to only this channel's typing events with stable empty array
  const typingEventsByChannel = useAppSelector(selectTypingEventsByChannel);
  const currentUserId = useAppSelector(selectCurrentUserId);
  const channelTypingEvents = typingEventsByChannel[channelId];

  // Filter out current user and process data - handle undefined case
  const otherUserEvents = channelTypingEvents ? channelTypingEvents.filter(event => event.user_id !== currentUserId) : [];
  const uniqueUsernames = Array.from(
    new Set(otherUserEvents.map(event => event.username))
  ).filter(username => username !== 'Someone');
  
  const typingMessage = (() => {
    if (uniqueUsernames.length === 0) return '';
    if (uniqueUsernames.length === 1) return `${uniqueUsernames[0]} is typing...`;
    if (uniqueUsernames.length === 2) return `${uniqueUsernames[0]} and ${uniqueUsernames[1]} are typing...`;
    return 'Several people are typing...';
  })();

  return {
    typingUsers: uniqueUsernames,
    typingMessage,
    isAnyoneTyping: otherUserEvents.length > 0,
    typingEvents: otherUserEvents,
  };
};

export default useTypingEventsForChannel;