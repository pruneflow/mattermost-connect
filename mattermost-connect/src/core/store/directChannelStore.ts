// src/core/store/directChannelStore.ts
/**
 * Direct channel store
 * Manages direct and group message channel data
 */
import "./storeConfig";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  DirectChannelInfo,
  UserStatus,
  ErrorSource,
  DirectChannelState,
  DirectChannelStore,
  Channel,
} from "../../types";
import { channelService } from "../services/channelService";
import { channelLoadingService } from "../services/channelLoadingService";
import { createCommonSlice } from "./slices/commonSlice";
import { handleError } from "./errorStore";
import { useChannelStore } from "./channelStore";
import { useUserStore } from "./userStore";

/**
 * Default direct channel info object
 */
const DEFAULT_CHANNEL_INFO: DirectChannelInfo = {
  isDirect: false,
  isGroup: false,
  displayName: "",
  userIds: [],
  status: "complete",
};

/**
 * Direct channel store for managing direct and group message channels
 * Uses immer middleware for immutable state updates
 * Uses subscribeWithSelector for observing state changes
 */
export const useDirectChannelStore = create<
  DirectChannelState & DirectChannelStore
>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<DirectChannelState>(set);

      return {
        // Include common slice for standardized state
        ...commonSlice,

        // Initial state
        directChannelInfoById: {},
        pendingUserIds: [],

        /**
         * Sets information for a direct/group channel
         * @param channelId Channel ID
         * @param info Channel information
         */
        setDirectChannelInfo: (channelId: string, info: DirectChannelInfo) => {
          try {
            set((state) => {
              state.directChannelInfoById[channelId] = info;
              state.lastFetchTimes[channelId] = Date.now();
              state.lastUpdated = Date.now();

              // Clear loading state
              state.loadingIds = state.loadingIds.filter(
                (id: string) => id !== channelId,
              );
            });

            // Clear channel loading flag in service
            channelLoadingService.setChannelLoading(channelId, false);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setDirectChannelInfo",
              channelId,
            });
          }
        },

        /**
         * Updates a specific property of direct channel info
         * @param channelId Channel ID
         * @param key Property key
         * @param value Property value
         */
        updateDirectChannelInfo: <K extends keyof DirectChannelInfo>(
          channelId: string,
          key: K,
          value: DirectChannelInfo[K],
        ) => {
          try {
            set((state) => {
              if (!state.directChannelInfoById[channelId]) {
                state.directChannelInfoById[channelId] = {
                  ...DEFAULT_CHANNEL_INFO,
                };
              }

              state.directChannelInfoById[channelId][key] = value;
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "updateDirectChannelInfo",
              channelId,
              key: String(key),
            });
          }
        },

        /**
         * Sets user status for a direct channel
         * @param channelId Channel ID
         * @param status User status
         */
        setDirectChannelUserStatus: (channelId: string, status: UserStatus) => {
          try {
            set((state) => {
              const info = state.directChannelInfoById[channelId];
              if (info && info.isDirect) {
                info.userStatus = status;
                state.lastUpdated = Date.now();
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setDirectChannelUserStatus",
              channelId,
              status,
            });
          }
        },

        /**
         * Sets user image URL for a direct channel
         * @param channelId Channel ID
         * @param imageUrl Image URL
         */
        setDirectChannelUserImage: (channelId: string, imageUrl: string) => {
          try {
            set((state) => {
              const info = state.directChannelInfoById[channelId];
              if (info && info.isDirect) {
                info.userImageUrl = imageUrl;
                state.lastUpdated = Date.now();
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setDirectChannelUserImage",
              channelId,
            });
          }
        },

        /**
         * Adds a user ID to pending loading state
         * @param userId User ID
         */
        addPendingUser: (userId: string) => {
          try {
            set((state) => {
              if (!state.pendingUserIds.includes(userId)) {
                state.pendingUserIds.push(userId);
                state.lastUpdated = Date.now();
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "addPendingUser",
              userId,
            });
          }
        },

        /**
         * Removes a user ID from pending loading state
         * @param userId User ID
         */
        removePendingUser: (userId: string) => {
          try {
            set((state) => {
              state.pendingUserIds = state.pendingUserIds.filter(
                (id: string) => id !== userId,
              );
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "removePendingUser",
              userId,
            });
          }
        },

        /**
         * Gets direct channel info for a channel
         * @param channelId Channel ID
         * @returns Direct channel info or null if not found
         */
        getDirectChannelInfo: (channelId: string): DirectChannelInfo | null => {
          try {
            return get().directChannelInfoById[channelId] || null;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getDirectChannelInfo",
              channelId,
            });
            return null;
          }
        },

        /**
         * Checks if a direct channel is loading
         * @param channelId Channel ID
         * @returns Whether the channel is loading
         */
        isDirectChannelLoading: (channelId: string): boolean => {
          try {
            // Check both store and service loading state
            return (
              get().loadingIds.includes(channelId) ||
              channelLoadingService.isChannelLoading(channelId)
            );
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "isDirectChannelLoading",
              channelId,
            });
            return false;
          }
        },

        /**
         * Checks if a user ID is pending loading
         * @param userId User ID
         * @returns Whether the user is pending
         */
        isPendingUser: (userId: string): boolean => {
          try {
            return (
              get().pendingUserIds.includes(userId) ||
              channelLoadingService.isUserLoading(userId)
            );
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "isPendingUser",
              userId,
            });
            return false;
          }
        },

        /**
         * Preloads user information for all direct/group channels
         * @param channels List of channels
         * @param currentUserId Current user ID
         */
        preloadDirectChannelsInfo: (
          channels: Channel[],
          currentUserId: string,
        ) => {
          try {
            // Get dependencies at runtime to avoid circular dependencies
            const userStore = useUserStore.getState();

            // Use the loading service to identify required users
            const { highPriority, lowPriority } =
              channelLoadingService.identifyRequiredUserIds(
                channels,
                userStore.byId,
                currentUserId,
              );

            // Mark direct channels as loading
            channels.forEach((channel) => {
              if (channelService.isDirectOrGroupChannel(channel)) {
                const info = get().directChannelInfoById[channel.id];
                // Only mark as loading if we don't have complete info
                if (!info || info.status !== "complete") {
                  if (!get().loadingIds.includes(channel.id)) {
                    set((state) => {
                      state.loadingIds.push(channel.id);
                    });
                  }
                  channelLoadingService.setChannelLoading(channel.id, true);
                }
              }
            });

            // Mark users as pending
            set((state) => {
              // Add high priority users first
              highPriority.forEach((userId) => {
                if (!state.pendingUserIds.includes(userId)) {
                  state.pendingUserIds.push(userId);
                  channelLoadingService.setUserLoading(userId, true);
                }
              });

              // Add low priority users
              lowPriority.forEach((userId) => {
                if (!state.pendingUserIds.includes(userId)) {
                  state.pendingUserIds.push(userId);
                  channelLoadingService.setUserLoading(userId, true);
                }
              });

              state.lastUpdated = Date.now();
            });

            return [...highPriority, ...lowPriority];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "preloadDirectChannelsInfo",
              channelCount: channels.length,
            });
            return [];
          }
        },

        /**
         * Refreshes direct channel info using current user data
         * @param channelId Channel ID
         * @param currentUserId Current user ID
         */
        refreshDirectChannelInfo: (
          channelId: string,
          currentUserId: string,
        ) => {
          try {
            // Check if already loading to prevent loops
            if (
              channelLoadingService.isChannelLoading(channelId) &&
              get().loadingIds.includes(channelId)
            ) {
              // Increment retry count and check if max retries reached
              if (channelLoadingService.incrementChannelRetry(channelId)) {
                // Clear loading state if max retries reached
                set((state) => {
                  state.loadingIds = state.loadingIds.filter(
                    (id) => id !== channelId,
                  );
                });
                channelLoadingService.setChannelLoading(channelId, false);

                // Set error state in channel info
                const existingInfo = get().directChannelInfoById[channelId];
                if (existingInfo) {
                  set((state) => {
                    state.directChannelInfoById[channelId] = {
                      ...existingInfo,
                      status: "error",
                    };
                  });
                }
                return;
              }
            }

            // Get dependencies at runtime to avoid circular dependencies
            const { getChannelById } = useChannelStore.getState();
            const { byId: users } = useUserStore.getState();
            const { statusByUserId: statuses } = useUserStore.getState();

            const channel = getChannelById(channelId);

            if (!channel) return;

            // Only process direct or group channels
            if (!channelService.isDirectOrGroupChannel(channel)) return;

            // Set loading status
            set((state) => {
              if (!state.loadingIds.includes(channelId)) {
                state.loadingIds.push(channelId);
              }
            });
            channelLoadingService.setChannelLoading(channelId, true);

            // Get info from service
            const info = channelLoadingService.getOrCreateDirectChannelInfo(
              channel,
              currentUserId,
              users,
              statuses,
            );

            // Update store
            set((state) => {
              state.directChannelInfoById[channelId] = info;
              state.lastFetchTimes[channelId] = Date.now();
              state.lastUpdated = Date.now();

              // Remove from loading IDs
              state.loadingIds = state.loadingIds.filter(
                (id) => id !== channelId,
              );
            });

            // Clear loading state in service
            channelLoadingService.setChannelLoading(channelId, false);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "refreshDirectChannelInfo",
              channelId,
              currentUserId,
            });

            // Make sure to clear loading state even on error
            set((state) => {
              state.loadingIds = state.loadingIds.filter(
                (id) => id !== channelId,
              );
            });
            channelLoadingService.setChannelLoading(channelId, false);
          }
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          try {
            // Clear service caches
            channelLoadingService.clearAllCaches();

            set((state) => {
              // Reset domain-specific state
              state.directChannelInfoById = {};
              state.pendingUserIds = [];

              // Reset common state from CommonSlice
              state.isLoading = false;
              state.loadingIds = [];
              state.error = null;
              state.errors = {};
              state.lastFetchTimes = {};
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "reset",
            });
          }
        },
      };
    }),
  ),
);

/**
 * Gets direct channel display name
 * @param channelId Channel ID
 * @returns Display name or default if not found
 */
export function getDirectChannelDisplayName(channelId: string): string {
  try {
    const info = useDirectChannelStore
      .getState()
      .getDirectChannelInfo(channelId);
    return info?.displayName || "Direct Message";
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getDirectChannelDisplayName",
      channelId,
    });
    return "Direct Message";
  }
}

/**
 * Checks if a direct channel has a specific status
 * @param channelId Channel ID
 * @param status Status to check for
 * @returns Whether the channel user has the status
 */
export function hasDirectChannelStatus(
  channelId: string,
  status: UserStatus,
): boolean {
  try {
    const info = useDirectChannelStore
      .getState()
      .getDirectChannelInfo(channelId);
    return info?.userStatus === status;
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "hasDirectChannelStatus",
      channelId,
      status,
    });
    return false;
  }
}
