// src/core/store/userStore.ts
/**
 * User store
 * Manages user data, statuses, and typing indicators
 */
import "./storeConfig";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  User,
  UserState,
  UserStatus,
  UserStatusInfo,
  EventType,
  UserStore,
} from "../../types";
import { userService } from "../services/userService";
import { createCommonSlice } from "./slices/commonSlice";
import { emitEvent } from "../api/eventUtils";

// Typing indicator timeout (5 seconds)
const TYPING_TIMEOUT = 5000;

/**
 * Create the user store with immer middleware for simplified updates
 * and subscribeWithSelector for observing state changes
 */
export const useUserStore = create<UserState & UserStore>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<UserState>(set);

      return {
        // Include common slice properties
        ...commonSlice,

        // Initial state
        byId: {},
        statusByUserId: {},
        typingUsers: {},
        isInitialized: false,

        /**
         * Sets a single user in the store
         * @param user User to add or update
         */
        setUser: (user: User) => {
          if (!user || !user.id) {
            console.warn("Attempted to set invalid user:", user);
            return;
          }

          set((state) => {
            // Add or update the user
            state.byId[user.id] = user;

            // Update fetch time
            state.lastFetchTimes[user.id] = Date.now();

            // Remove from loading IDs if present
            state.loadingIds = state.loadingIds.filter(
              (id: string) => id !== user.id,
            );

            // Ensure initialization flag is set
            state.isInitialized = true;
            state.lastUpdated = Date.now();
          });

          // Emit user updated event
          emitEvent(EventType.USER_UPDATED, { user });
        },

        /**
         * Sets multiple users at once
         * @param users Array of users to add or update
         */
        setUsers: (users: User[]) => {
          if (!users || !users.length) return;

          set((state) => {
            const now = Date.now();

            users.forEach((user) => {
              if (!user || !user.id) {
                console.warn("Attempted to set invalid user:", user);
                return;
              }

              // Add or update the user
              state.byId[user.id] = user;

              // Update fetch time
              state.lastFetchTimes[user.id] = now;

              // Remove from loading IDs if present
              state.loadingIds = state.loadingIds.filter(
                (id: string) => id !== user.id,
              );
            });

            // Ensure initialization flag is set
            state.isInitialized = true;
            state.lastUpdated = now;
          });
        },

        /**
         * Updates a user with partial data
         * @param userData Partial user data with ID
         */
        updateUser: (userData: Partial<User> & { id: string }) => {
          const { id } = userData;

          set((state) => {
            if (!state.byId[id]) return;

            // Update the user properties
            state.byId[id] = {
              ...state.byId[id],
              ...userData,
            };

            // Update fetch time
            state.lastFetchTimes[id] = Date.now();
            state.lastUpdated = Date.now();
          });

          // Emit user updated event
          emitEvent(EventType.USER_UPDATED, { user: get().byId[id] });
        },

        /**
         * Removes a user from the store
         * @param userId User ID to remove
         */
        removeUser: (userId: string) => {
          set((state) => {
            if (!state.byId[userId]) return;

            // Delete the user
            delete state.byId[userId];

            // Remove status
            delete state.statusByUserId[userId];

            // Remove fetch time
            delete state.lastFetchTimes[userId];

            // Remove from loading IDs if present
            state.loadingIds = state.loadingIds.filter(
              (id: string) => id !== userId,
            );

            state.lastUpdated = Date.now();
          });
        },

        /**
         * Sets a user's online status
         * @param userId User ID
         * @param status Status to set
         */
        setUserStatus: (userId: string, status: UserStatus) => {
          set((state) => {
            const previousStatus = state.statusByUserId[userId];

            // Set the new status
            state.statusByUserId[userId] = status;
            state.lastUpdated = Date.now();

            // Emit status updated event if changed
            if (previousStatus !== status) {
              emitEvent(EventType.USER_STATUS_UPDATED, {
                userId,
                status,
                previousStatus,
              });
            }
          });
        },

        /**
         * Sets multiple user statuses at once
         * @param statuses Status information
         */
        setUserStatuses: (statuses) => {
          set((state) => {
            // Handle array of UserStatusInfo objects
            if (Array.isArray(statuses)) {
              statuses.forEach((statusInfo: UserStatusInfo) => {
                // Only update if the status has changed
                if (
                  state.statusByUserId[statusInfo.user_id] !== statusInfo.status
                ) {
                  const previousStatus =
                    state.statusByUserId[statusInfo.user_id];
                  state.statusByUserId[statusInfo.user_id] = statusInfo.status;

                  // Emit status change event
                  emitEvent(EventType.USER_STATUS_UPDATED, {
                    userId: statusInfo.user_id,
                    status: statusInfo.status,
                    previousStatus,
                  });
                }
              });
            }
            // Handle direct record of userId -> status
            else {
              Object.entries(statuses).forEach(([userId, status]) => {
                if (state.statusByUserId[userId] !== status) {
                  const previousStatus = state.statusByUserId[userId];
                  state.statusByUserId[userId] = status as UserStatus;

                  // Emit status change event
                  emitEvent(EventType.USER_STATUS_UPDATED, {
                    userId,
                    status,
                    previousStatus,
                  });
                }
              });
            }

            state.lastUpdated = Date.now();
          });
        },

        /**
         * Sets a user as typing in a channel
         * @param channelId Channel ID
         * @param userId User ID who is typing
         */
        setTyping: (channelId: string, userId: string) => {
          const now = Date.now();

          set((state) => {
            // Initialize channel typing map if needed
            if (!state.typingUsers[channelId]) {
              state.typingUsers[channelId] = {};
            }

            // Set typing timestamp
            state.typingUsers[channelId][userId] = now;
            state.lastUpdated = now;
          });

          // Emit typing event
          emitEvent(EventType.USER_TYPING, {
            channelId,
            userId,
            timestamp: now,
          });

          // Schedule cleanup after timeout
          setTimeout(() => {
            get().cleanupExpiredTyping();
          }, TYPING_TIMEOUT);
        },

        /**
         * Clears typing status for a user in a channel
         * @param channelId Channel ID
         * @param userId User ID to clear
         */
        clearTyping: (channelId: string, userId: string) => {
          set((state) => {
            // Skip if no typing data exists for this channel
            if (!state.typingUsers[channelId]) return;

            // Remove the user from typing users
            const { [userId]: _, ...restUsers } = state.typingUsers[channelId];

            // Update typing users for the channel
            if (Object.keys(restUsers).length > 0) {
              state.typingUsers[channelId] = restUsers;
            } else {
              // If no users are typing, remove the channel entry
              delete state.typingUsers[channelId];
            }

            state.lastUpdated = Date.now();
          });
        },

        /**
         * Cleans up expired typing indicators
         */
        cleanupExpiredTyping: () => {
          const now = Date.now();
          const expirationTime = now - TYPING_TIMEOUT;

          set((state) => {
            let hasChanges = false;

            // Process each channel
            Object.keys(state.typingUsers).forEach((channelId) => {
              const users = state.typingUsers[channelId];
              const validUsers: Record<string, number> = {};

              // Keep only non-expired users
              Object.keys(users).forEach((userId) => {
                const timestamp = users[userId];
                if (timestamp > expirationTime) {
                  validUsers[userId] = timestamp;
                } else {
                  hasChanges = true;
                }
              });

              // Update or remove channel entry
              if (Object.keys(validUsers).length > 0) {
                state.typingUsers[channelId] = validUsers;
              } else {
                delete state.typingUsers[channelId];
                hasChanges = true;
              }
            });

            // Only update timestamp if there were changes
            if (hasChanges) {
              state.lastUpdated = now;
            }
          });
        },

        /**
         * Gets a user by ID
         * @param userId User ID
         * @returns User object or null if not found
         */
        getUserById: (userId: string): User | null => {
          return get().byId[userId] || null;
        },

        /**
         * Gets multiple users by IDs
         * @param userIds Array of user IDs
         * @returns Array of found users (may be shorter than input if some not found)
         */
        getUsersByIds: (userIds: string[]): User[] => {
          const { byId } = get();
          return userIds
            .map((id: string) => byId[id])
            .filter((user): user is User => !!user);
        },

        /**
         * Gets a user's online status
         * @param userId User ID
         * @returns User status (defaults to offline)
         */
        getUserStatus: (userId: string): UserStatus => {
          return get().statusByUserId[userId] || "offline";
        },

        /**
         * Gets a user's display name
         * @param userId User ID
         * @returns Formatted user name
         */
        getUserDisplayName: (userId: string): string => {
          const user = get().byId[userId];
          return userService.formatUserName(user);
        },

        /**
         * Gets users currently typing in a channel
         * @param channelId Channel ID
         * @returns Array of user IDs
         */
        getTypingUsers: (channelId: string): string[] => {
          return userService.getTypingUsers(get().typingUsers[channelId] || {});
        },

        /**
         * Gets users with their status information
         * @param userIds Array of user IDs
         * @returns Array of users with status
         */
        getUsersWithStatus: (userIds: string[]) => {
          const { byId, statusByUserId } = get();

          return userIds
            .map((userId) => {
              const user = byId[userId];

              if (!user) return null;

              return {
                user,
                status: statusByUserId[userId] || "offline",
                displayName: userService.formatUserName(user),
              };
            })
            .filter((item) => item !== null) as Array<{
            user: User;
            status: UserStatus;
            displayName: string;
          }>;
        },

        /**
         * Checks if a user ID is pending loading
         * @param userId User ID
         * @returns Whether the user is pending
         */
        isPendingUser: (userId: string): boolean => {
          return get().loadingIds.includes(userId);
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          set((state) => {
            Object.assign(state, {
              byId: {},
              statusByUserId: {},
              typingUsers: {},
              isInitialized: false,
              isLoading: false,
              loadingIds: [],
              error: null,
              errors: [],
              lastUpdated: Date.now(),
              lastFetchTimes: {},
            });
          });
        },
      };
    }),
  ),
);

/**
 * Helper function to format a user's name
 * @param user User object
 * @returns Formatted display name
 */
export function formatUserName(user: User | null | undefined): string {
  return userService.formatUserName(user);
}

/**
 * Helper function to get a user's status
 * @param userId User ID
 * @returns User's status
 */
export function getUserStatus(userId: string): UserStatus {
  return useUserStore.getState().getUserStatus(userId);
}

/**
 * Helper function to get a user's display name
 * @param userId User ID
 * @returns User's display name
 */
export function getUserDisplayName(userId: string): string {
  return useUserStore.getState().getUserDisplayName(userId);
}
