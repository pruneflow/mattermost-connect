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
import { useDirectChannelStore } from "./directChannelStore";
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
export { useTeamStore, getFormattedTeamName, isTeamAdmin } from "./teamStore";

// Channels
export {
  useChannelStore,
  getChannelsByType,
  isDirectChannel,
  isGroupChannel,
  isDirectOrGroupChannel,
  getChannelDisplayName,
} from "./channelStore";

// Direct Channels
export {
  useDirectChannelStore,
  getDirectChannelDisplayName,
  hasDirectChannelStatus,
} from "./directChannelStore";

// Messages
export {
  useMessageStore,
  getSortedChannelMessages,
  getSortedThreadMessages,
  getMessageDisplayText,
} from "./messageStore";

// Unread Counts
export {
  useUnreadStore,
  getTeamUnreadCounts,
  getTotalUnreadCounts,
  formatUnreadDisplay,
} from "./unreadStore";

// WebSocket
export {
  useWsStore,
  registerWsHandler,
  registerWsHandlers,
  isWsConnected,
} from "./wsStore";

// Error Handling
export { useErrorStore, handleError } from "./errorStore";

// User Settings
export { useUserSettingsStore } from "./userSettingsStore";

// Event utilities - exported from api/eventUtils
export { emitEvent, onEvent, onEvents } from "../api/eventUtils";

/**
 * Resets all stores to their initial state
 * Useful for logout or testing
 */
export const resetAllStores = () => {
  try {
    // Reset in specific order to handle dependencies properly
    // WebSocket first to close connections
    useWsStore.getState().reset();

    // Auth related
    useAuthStore.getState().reset();
    useUserStore.getState().reset();

    // Data stores
    useTeamStore.getState().reset();
    useChannelStore.getState().reset();
    useDirectChannelStore.getState().reset();
    useMessageStore.getState().reset();
    useUnreadStore.getState().reset();

    // Settings
    useUserSettingsStore.getState().reset();

    // Error store last to clear any errors that might have occurred during reset
    useErrorStore.getState().reset();
  } catch (error) {
    console.error("Error resetting stores:", error);
  }
};

/**
 * Creates a snapshot of the current store state
 * Useful for debugging
 * @returns Object with current state of all stores
 */
export const getStoresSnapshot = () => {
  return {
    auth: useAuthStore.getState(),
    user: useUserStore.getState(),
    team: useTeamStore.getState(),
    channel: useChannelStore.getState(),
    directChannel: useDirectChannelStore.getState(),
    message: useMessageStore.getState(),
    unread: useUnreadStore.getState(),
    ws: useWsStore.getState(),
    error: useErrorStore.getState(),
    userSettings: useUserSettingsStore.getState(),
  };
};
