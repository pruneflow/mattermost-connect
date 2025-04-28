// src/core/store/userStore.ts
/**
 * User store
 * Manages user data, statuses, and typing indicators
 */
import { create } from "zustand";
import {
  EventType,
  User,
  UserState,
  UserStatus,
  UserStatusInfo,
  UserWithStatus,
} from "../../types";
import { emitEvent } from "./eventStore";

// Typing indicator timeout (5 seconds)
const TYPING_TIMEOUT = 5000;

/**
 * User store state and actions
 */
interface UserStoreState extends UserState {
  // Actions - User Data
  setUser: (user: User) => void;
  setUsers: (users: User[]) => void;
  setLoading: (userId: string, isLoading: boolean) => void;
  setError: (userId: string, error: Error | null) => void;
  addPendingUser: (userId: string) => void;
  removePendingUser: (userId: string) => void;

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
  getTypingUsers: (channelId: string) => string[];
  getUsersWithStatus: (userIds: string[]) => UserWithStatus[];
  isPendingUser: (userId: string) => boolean;

  // Reset
  reset: () => void;
}

/**
 * User store for managing user data and status
 * Combines user data and status management
 */
export const useUserStore = create<UserStoreState>()((set, get) => ({
  // Initial state
  byId: {},
  statusByUserId: {},
  typingUsers: {},
  loadingUserIds: [],
  lastFetchTimes: {},

  // ===== User Data Actions =====

  /**
   * Sets a single user in the store
   * @param user User object to store
   */
  setUser: (user: User) => {
    if (!user || !user.id) {
      console.warn("Attempted to set invalid user:", user);
      return;
    }

    set((state) => {
      return {
        byId: {
          ...state.byId,
          [user.id]: user,
        },
        loadingUserIds: state.loadingUserIds.filter((id) => id !== user.id),
        lastFetchTimes: {
          ...state.lastFetchTimes,
          [user.id]: Date.now(),
        },
      };
    });

    // Emit user updated event
    emitEvent(EventType.USER_UPDATED, { user });
  },

  /**
   * Sets multiple users in the store
   * @param users Array of user objects
   */
  setUsers: (users: User[]) => {
    if (!users || !users.length) return;

    set((state) => {
      const now = Date.now();
      const byId = { ...state.byId };
      const loadingUserIds = [...state.loadingUserIds];
      const lastFetchTimes = { ...state.lastFetchTimes };

      users.forEach((user) => {
        if (!user || !user.id) {
          console.warn("Attempted to set invalid user:", user);
          return;
        }

        byId[user.id] = user;
        lastFetchTimes[user.id] = now;

        const pendingIndex = loadingUserIds.indexOf(user.id);
        if (pendingIndex !== -1) {
          loadingUserIds.splice(pendingIndex, 1);
        }
      });

      return {
        byId,
        loadingUserIds,
        lastFetchTimes,
      };
    });
  },

  /**
   * Sets loading state for a user
   * @param userId User ID
   * @param isLoading Whether the user is loading
   */
  setLoading: (userId: string, isLoading: boolean) => {
    set((state) => {
      if (isLoading) {
        // Add to loading IDs if not already there
        if (!state.loadingUserIds.includes(userId)) {
          return {
            loadingUserIds: [...state.loadingUserIds, userId],
          };
        }
      } else {
        // Remove from loading IDs
        return {
          loadingUserIds: state.loadingUserIds.filter((id) => id !== userId),
        };
      }
      return state;
    });
  },

  /**
   * Sets error state for a user
   * @param userId User ID
   * @param error Error object or null
   */
  setError: (userId: string, error: Error | null) => {
    // Remove from loading
    if (error) {
      set((state) => ({
        loadingUserIds: state.loadingUserIds.filter((id) => id !== userId),
      }));
    }
  },

  /**
   * Adds a user ID to pending loading state
   * @param userId User ID
   */
  addPendingUser: (userId: string) => {
    set((state) => {
      if (state.loadingUserIds.includes(userId)) {
        return state;
      }

      return {
        loadingUserIds: [...state.loadingUserIds, userId],
      };
    });
  },

  /**
   * Removes a user ID from pending loading state
   * @param userId User ID
   */
  removePendingUser: (userId: string) => {
    set((state) => ({
      loadingUserIds: state.loadingUserIds.filter((id) => id !== userId),
    }));
  },

  // ===== User Status Actions =====

  /**
   * Sets online status for a single user
   * @param userId User ID
   * @param status Online status
   */
  setUserStatus: (userId: string, status: UserStatus) => {
    set((state) => {
      const updatedStatus = {
        ...state.statusByUserId,
        [userId]: status,
      };

      // Emit status change event
      emitEvent(EventType.USER_STATUS_UPDATED, {
        userId,
        status,
        previousStatus: state.statusByUserId[userId],
      });

      return {
        statusByUserId: updatedStatus,
      };
    });
  },

  /**
   * Sets statuses for multiple users
   * @param statuses Array of status objects or record of user IDs to statuses
   */
  setUserStatuses: (statuses) => {
    set((state) => {
      const updatedStatusByUserId = { ...state.statusByUserId };

      // Handle array of UserStatusInfo objects
      if (Array.isArray(statuses)) {
        statuses.forEach((statusInfo: UserStatusInfo) => {
          updatedStatusByUserId[statusInfo.user_id] = statusInfo.status;
        });
      }
      // Handle direct record of userId -> status
      else {
        Object.entries(statuses).forEach(([userId, status]) => {
          updatedStatusByUserId[userId] = status as UserStatus;
        });
      }

      return {
        statusByUserId: updatedStatusByUserId,
      };
    });
  },

  // ===== Typing Indicator Actions =====

  /**
   * Sets a user as typing in a channel
   * @param channelId Channel ID
   * @param userId User ID who is typing
   */
  setTyping: (channelId: string, userId: string) => {
    const now = Date.now();

    set((state) => {
      // Get current typing users for the channel
      const channelTyping = state.typingUsers[channelId] || {};

      // Add or update typing entry
      const updatedTyping = {
        ...channelTyping,
        [userId]: now,
      };

      // Update state
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: updatedTyping,
        },
      };
    });

    // Schedule cleanup after timeout
    setTimeout(() => {
      get().cleanupExpiredTyping();
    }, TYPING_TIMEOUT);

    // Emit typing event
    emitEvent(EventType.USER_TYPING, {
      channelId,
      userId,
    });
  },

  /**
   * Clears typing status for a user in a channel
   * @param channelId Channel ID
   * @param userId User ID to clear
   */
  clearTyping: (channelId: string, userId: string) => {
    set((state) => {
      const channelTyping = state.typingUsers[channelId];
      if (!channelTyping) return state;

      // Create a new typing state without the specified user
      const { [userId]: _, ...updatedTyping } = channelTyping;

      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: updatedTyping,
        },
      };
    });
  },

  /**
   * Cleans up expired typing indicators
   */
  cleanupExpiredTyping: () => {
    const now = Date.now();
    const expirationTime = now - TYPING_TIMEOUT;

    set((state) => {
      const updatedTyping: Record<string, Record<string, number>> = {};
      let hasChanges = false;

      // Check each channel
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

        // Only keep channels with active typing users
        if (Object.keys(validUsers).length > 0) {
          updatedTyping[channelId] = validUsers;
        } else {
          hasChanges = true;
        }
      });

      // Only update state if there were changes
      return hasChanges ? { typingUsers: updatedTyping } : state;
    });
  },

  // ===== Selectors =====

  /**
   * Gets a user by ID
   * @param userId User ID
   * @returns User object or null if not found
   */
  getUserById: (userId: string): User | null => {
    return get().byId[userId] || null;
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

    if (!user) {
      return "Unknown User";
    }

    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.nickname) {
      return user.nickname;
    } else {
      return user.username || "Unknown User";
    }
  },

  /**
   * Gets all users currently typing in a channel
   * @param channelId Channel ID
   * @returns Array of user IDs
   */
  getTypingUsers: (channelId: string): string[] => {
    const typingEntries = get().typingUsers[channelId] || {};
    const now = Date.now();
    const expirationTime = now - TYPING_TIMEOUT;

    // Return only non-expired typing users
    return Object.entries(typingEntries)
      .filter(([_, timestamp]) => timestamp > expirationTime)
      .map(([userId]) => userId);
  },

  /**
   * Gets users with their status information
   * @param userIds Array of user IDs
   * @returns Array of users with status
   */
  getUsersWithStatus: (userIds: string[]): UserWithStatus[] => {
    const result: UserWithStatus[] = [];
    const { byId, statusByUserId } = get();

    userIds.forEach((userId) => {
      const user = byId[userId];
      if (user) {
        result.push({
          user,
          status: statusByUserId[userId] || "offline",
          displayName: get().getUserDisplayName(userId),
        });
      }
    });

    return result;
  },

  /**
   * Checks if a user ID is pending loading
   * @param userId User ID
   * @returns Whether the user is pending
   */
  isPendingUser: (userId: string): boolean => {
    return get().loadingUserIds.includes(userId);
  },

  /**
   * Resets the store to initial state
   */
  reset: () => {
    set({
      byId: {},
      statusByUserId: {},
      typingUsers: {},
      loadingUserIds: [],
      lastFetchTimes: {},
    });
  },
}));

/**
 * Formats a user's name
 * @param user User object
 * @returns Formatted display name
 */
export function formatUserName(user: User | null | undefined): string {
  if (!user) return "Unknown User";

  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  } else if (user.nickname) {
    return user.nickname;
  } else {
    return user.username || "Unknown User";
  }
}

/**
 * Helper to get user status
 * @param userId User ID
 * @returns User status
 */
export function getUserStatus(userId: string): UserStatus {
  return useUserStore.getState().getUserStatus(userId);
}

/**
 * Helper to get user display name
 * @param userId User ID
 * @returns User display name
 */
export function getUserDisplayName(userId: string): string {
  return useUserStore.getState().getUserDisplayName(userId);
}
