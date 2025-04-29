// src/hooks/index.ts
/**
 * Central export point for all hooks
 * Provides easy access to all application hooks
 */

// Authentication hooks
export {
  useAuth,
  useRequireAuth,
  useAuthInitialize,
  useCurrentUser,
} from "./useAuth";

// Team hooks
export { useTeams, useTeam, useTeamCreation } from "./useTeams";

// Channel hooks
export { useChannels, useChannel, useChannelCreation } from "./useChannels";

// Direct channel hooks
export { useDirectChannels, useDirectChannel } from "./useDirectChannels";
export { useDirectChannelUsers } from "./useDirectChannelUsers";

// Message hooks
export {
  useMessages,
  useThread,
  useMessageReactions,
  useFileInfo,
} from "./useMessages";

// Unread count hooks
export {
  useChannelUnreadCount,
  useTeamUnreadCount,
  useTotalUnreadCount,
  useUnreadChannels,
} from "./useUnreadCounts";

// User hooks
export { useUser, useUsers, useUserSearch, useUserProfile } from "./useUsers";

// WebSocket hooks
export {
  useWebSocket,
  useWebSocketEvent,
  useWebSocketEvents,
  useWebSocketMessageEvents,
  useWebSocketTypingEvents,
  useTypingIndicator,
} from "./useWebSocket";
