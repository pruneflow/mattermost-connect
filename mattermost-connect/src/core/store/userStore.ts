// src/core/store/userStore.ts
/**
 * User store
 * Manages user data, statuses, and typing indicators
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  User,
  UserStatus,
  UserStatusInfo,
  EventType,
  ErrorSource,
} from "../../types";
import { userService } from "../services/userService";
import { createLoadingSlice } from "./storeUtils";
import { emitEvent } from "./eventStore";
import { handleError } from "./errorStore";

// Typing indicator timeout (5 seconds)
const TYPING_TIMEOUT = 5000;

/**
 * User state interface
 */
interface UserState {
  byId: Record<string, User>;
  statusByUserId: Record<string, UserStatus>;
  typingUsers: Record<string, Record<string, number>>;
  isInitialized: boolean;
  lastFetchTimes: Record<string, number>;
  isLoading: boolean;
  loadingIds: string[];
  error: Error | null;
  errors: Record<string, Error | null>;
}

/**
 * Extended user store state with actions
 */
interface UserStoreState extends UserState {
  // Actions - User Data
  setUser: (user: User) => void;
  setUsers: (users: User[]) => void;
  updateUser: (user: Partial<User> & { id: string }) => void;
  removeUser: (userId: string) => void;

  // Actions - Loading/Error State
  setLoading: (isLoading: boolean) => void;
  setLoadingId: (id: string, isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setErrorForId: (id: string, error: Error | null) => void;

  // Actions - User Status
  setUserStatus: (userId: string, status: UserStatus) => void;
  setUserStatuses: (
    statuses: UserStatusInfo[] | Record<string, UserStatus>,
  ) => void;

  // Actions - Typing Indicators
  setTyping: (channelId: string, userId: string) => void;
  clearTyping: (channelId: string, userId: string) => void;
  cleanupExpiredTyping: () => void;

  // Selectors
  getUserById: (userId: string) => User | null;
  getUserStatus: (userId: string) => UserStatus;
  getUserDisplayName: (userId: string) => string;
  getUsersByIds: (userIds: string[]) => User[];
  getTypingUsers: (channelId: string) => string[];
  getUsersWithStatus: (userIds: string[]) => Array<{
    user: User;
    status: UserStatus;
    displayName: string;
  }>;
  isPendingUser: (userId: string) => boolean;

  // Reset
  reset: () => void;
}

/**
 * Create the user store with immer middleware for simplified updates
 * and subscribeWithSelector for observing state changes
 */
export const useUserStore = create<UserStoreState>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create loading slice for standard loading/error state management
      const loadingSlice = createLoadingSlice<UserStoreState>(set);

      return {
        // Initial state
        byId: {},
        statusByUserId: {},
        typingUsers: {},
        isInitialized: false,
        lastFetchTimes: {},

        // Include loading/error state from loading slice
        isLoading: loadingSlice.isLoading,
        loadingIds: loadingSlice.loadingIds,
        error: loadingSlice.error,
        errors: loadingSlice.errors,

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
            state.loadingIds = state.loadingIds.filter((id) => id !== user.id);

            // Ensure initialization flag is set
            state.isInitialized = true;
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
                (id) => id !== user.id,
              );
            });

            // Ensure initialization flag is set
            state.isInitialized = true;
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
            state.loadingIds = state.loadingIds.filter((id) => id !== userId);
          });
        },

        // Include loading state management from the slice
        setLoading: loadingSlice.setLoading,
        setLoadingId: loadingSlice.setLoadingId,
        setError: loadingSlice.setError,
        setErrorForId: loadingSlice.setErrorForId,

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
            Object.entries(state.typingUsers).forEach(([channelId, users]) => {
              const validUsers: Record<string, number> = {};

              // Keep only non-expired users
              Object.entries(users).forEach(([userId, timestamp]) => {
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

            // Only apply update if there were changes
            if (!hasChanges) {
              // Return state unchanged
              return state;
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
            .map((id) => byId[id])
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
          set(() => ({
            byId: {},
            statusByUserId: {},
            typingUsers: {},
            lastFetchTimes: {},
            isInitialized: false,
            isLoading: false,
            loadingIds: [],
            error: null,
            errors: {},
          }));
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
