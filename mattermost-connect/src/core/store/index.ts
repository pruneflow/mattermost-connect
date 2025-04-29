// src/core/store/index.ts
/**
 * Central export point for all stores
 * Provides easy access to all stores and their helpers
 */

// Import all stores directly for internal use
import { useAuthStore } from "./authStore";
import { useUserStore } from "./userStore";
import { useTeamStore } from "./teamStore";
import { useChannelStore } from "./channelStore";
import { useMessageStore } from "./messageStore";
import { useUnreadStore } from "./unreadStore";
import { useWsStore } from "./wsStore";
import { useErrorStore } from "./errorStore";
import { useUserSettingsStore } from "./userSettingsStore";

// Re-export everything
// Authentication
export { useAuthStore } from "./authStore";

// Users
export {
  useUserStore,
  formatUserName,
  getUserStatus,
  getUserDisplayName,
} from "./userStore";

// Teams
export { useTeamStore } from "./teamStore";

// Channels
export {
  useChannelStore,
  getChannelsByType,
  isDirectChannel,
  isGroupChannel,
  isDirectOrGroupChannel,
} from "./channelStore";

// Messages
export {
  useMessageStore,
  getSortedChannelMessages,
  getSortedThreadMessages,
} from "./messageStore";

// Unread Counts
export {
  useUnreadStore,
  getTeamUnreadCounts,
  getTotalUnreadCounts,
} from "./unreadStore";

// WebSocket - Updated exports with new pattern
export { useWsStore, registerWsHandler, registerWsHandlers } from "./wsStore";

// Error Handling
export { useErrorStore, handleError } from "./errorStore";

// User Settings
export { useUserSettingsStore } from "./userSettingsStore";

// Event utilities - Now exported from api/eventUtils
export { emitEvent, onEvent, onEvents } from "../api/eventUtils";

/**
 * Resets all stores to their initial state
 * Useful for logout or testing
 */
export const resetAllStores = () => {
  useWsStore.getState().reset();
  useAuthStore.getState().reset();
  useUserStore.getState().reset();
  useTeamStore.getState().reset();
  useChannelStore.getState().reset();
  useMessageStore.getState().reset();
  useUnreadStore.getState().reset();
  useErrorStore.getState().reset();
  useUserSettingsStore.getState().reset();
};
