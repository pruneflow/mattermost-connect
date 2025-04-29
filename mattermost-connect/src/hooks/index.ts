// src/hooks/index.ts
/**
 * Central export point for all hooks
 * Provides easy access to all hooks in the application
 */

// Auth hooks
export { useAuth, useRequireAuth } from "./useAuth";

// Team hooks
export { useTeams, useTeam, useTeamCreation } from "./useTeams";

// Channel hooks
export { useChannels, useChannel, useChannelCreation } from "./useChannels";

// Direct channel hooks
export {
  useDirectChannels,
  useDirectChannelUsers,
  useDirectChannel,
} from "./useDirectChannels";

// Message hooks
export {
  useMessages,
  useThread,
  usePinnedMessages,
  useMessageComposer,
  useMessageReactions,
} from "./useMessages";

// WebSocket hooks - Newly refactored
export {
  useWebSocket,
  useWebSocketEvent,
  useWebSocketEvents,
  useWebSocketMessageEvents,
  useWebSocketTypingEvents,
  useTypingIndicator,
  useUnreadWebSocketEvents,
  useWebSocketConnectionMonitor,
} from "./useWebSocket";

// User hooks
export {
  useUser,
  useUsers,
  useUserSearch,
  useUserProfile,
  useTypingUsers,
} from "./useUsers";

// Unread count hooks
export {
  useUnreadCounts,
  useChannelUnreadCount,
  useTeamUnreadCount,
  useUnreadCountsListener,
} from "./useUnreadCounts";

// Entity query hook
export { useEntityQuery } from "./useEntityQuery";
