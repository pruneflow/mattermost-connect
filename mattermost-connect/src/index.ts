// src/index.ts
/**
 * MattermostConnect library
 * A React library for integrating Mattermost into any application
 */
// Export providers
export {
  MattermostProvider,
  MattermostDirectProvider,
  MattermostProxyProvider,
} from "./providers/MattermostProvider";
export type { MattermostProviderProps } from "./providers/MattermostProvider";

// Export hooks
export { useAuth, useRequireAuth } from "./hooks/useAuth";
export { useTeams, useTeam, useTeamCreation } from "./hooks/useTeams";
export {
  useChannels,
  useChannel,
  useChannelCreation,
} from "./hooks/useChannels";
export {
  useMessages,
  useThread,
  useMessageReactions,
  useFileInfo,
} from "./hooks/useMessages";
export {
  useWebSocket,
  useWebSocketEvent,
  useWebSocketEvents,
  useWebSocketMessageEvents,
  useWebSocketTypingEvents,
  useTypingIndicator,
} from "./hooks/useWebSocket";
export {
  useUser,
  useUsers,
  useUserSearch,
  useUserProfile,
} from "./hooks/useUsers";

// Export utility functions
export * from "./utils/mattermostUtils";

// For custom API requests, expose the API client
export { apiClient } from "./core/api/client";
export { queryClient } from "./core/api/queryClient";

// Export React Query helpers for custom queries
export { QUERY_KEYS, invalidateQueries } from "./core/api/queryClient";

// Export all components
export * from "./components";
