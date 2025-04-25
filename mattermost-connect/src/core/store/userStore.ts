// src/core/store/userStore.ts
/**
 * Zustand store for users state
 */
import { create } from "zustand";
import { User } from "../services/authService";

/**
 * User status type
 */
export type UserStatus = "online" | "away" | "dnd" | "offline";

/**
 * User status information
 */
export interface UserStatusInfo {
  user_id: string;
  status: UserStatus;
  custom_status?: string;
  last_activity_at?: number;
}

/**
 * Users state
 */
export interface UserState {
  // State
  /** Users by ID */
  byId: Record<string, User>;
  /** Loading states by ID */
  loadingStates: Record<string, boolean>;
  /** Errors by ID */
  errors: Record<string, Error | null>;
  /** Online statuses by user ID */
  onlineStatus: Record<string, UserStatus>;
  /** Last fetch times by ID */
  lastFetchTimes: Record<string, number>;
  /** IDs of users being loaded */
  pendingUserIds: string[];

  // Actions
  /** Sets a user */
  setUser: (user: User) => void;
  /** Sets multiple users */
  setUsers: (users: User[]) => void;
  /** Sets the loading state for a user */
  setLoading: (userId: string, isLoading: boolean) => void;
  /** Sets the error state for a user */
  setError: (userId: string, error: Error | null) => void;
  /** Sets the online status for a user */
  setUserStatus: (userId: string, status: UserStatus) => void;
  /** Sets multiple user statuses */
  setUserStatuses: (statuses: UserStatusInfo[]) => void;
  /** Adds a user ID to the pending list */
  addPendingUser: (userId: string) => void;
  /** Removes a user ID from the pending list */
  removePendingUser: (userId: string) => void;
  /** Gets a user by ID */
  getUserById: (userId: string) => User | null;
  /** Gets the display name for a user */
  getUserDisplayName: (userId: string) => string;
  /** Resets the users state */
  reset: () => void;
}

/**
 * Create the users store
 */
export const useUserStore = create<UserState>()((set, get) => ({
  // Initial state
  byId: {},
  loadingStates: {},
  errors: {},
  onlineStatus: {},
  lastFetchTimes: {},
  pendingUserIds: [],

  /**
   * Sets a user
   * @param user User to set
   */
  setUser: (user: User) => {
    set((state) => ({
      byId: {
        ...state.byId,
        [user.id]: user,
      },
      loadingStates: {
        ...state.loadingStates,
        [user.id]: false,
      },
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [user.id]: Date.now(),
      },
      pendingUserIds: state.pendingUserIds.filter((id) => id !== user.id),
    }));
  },

  /**
   * Sets multiple users
   * @param users Users to set
   */
  /**
   * Sets multiple users
   * @param users Users to set
   */
  setUsers: (users: User[]) => {
    if (!users || !users.length) return;

    console.log(
      "Setting users in store:",
      users.map((u) => u.id),
    );

    set((state) => {
      const now = Date.now();
      const byId = { ...state.byId };
      const loadingStates = { ...state.loadingStates };
      const lastFetchTimes = { ...state.lastFetchTimes };
      const pendingUserIds = [...state.pendingUserIds];

      // Update each user
      users.forEach((user) => {
        if (!user || !user.id) {
          console.warn("Attempted to set invalid user:", user);
          return;
        }

        byId[user.id] = user;
        loadingStates[user.id] = false;
        lastFetchTimes[user.id] = now;

        // Remove from pending list
        const pendingIndex = pendingUserIds.indexOf(user.id);
        if (pendingIndex !== -1) {
          pendingUserIds.splice(pendingIndex, 1);
        }
      });

      return {
        byId,
        loadingStates,
        lastFetchTimes,
        pendingUserIds,
      };
    });
  },

  /**
   * Sets the loading state for a user
   * @param userId User ID
   * @param isLoading Whether the user is being loaded
   */
  setLoading: (userId: string, isLoading: boolean) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [userId]: isLoading,
      },
    }));
  },

  /**
   * Sets the error state for a user
   * @param userId User ID
   * @param error Error to set
   */
  setError: (userId: string, error: Error | null) => {
    set((state) => ({
      errors: {
        ...state.errors,
        [userId]: error,
      },
      loadingStates: {
        ...state.loadingStates,
        [userId]: false,
      },
    }));
  },

  /**
   * Sets the online status for a user
   * @param userId User ID
   * @param status Online status
   */
  setUserStatus: (userId: string, status: UserStatus) => {
    set((state) => ({
      onlineStatus: {
        ...state.onlineStatus,
        [userId]: status,
      },
    }));
  },

  /**
   * Sets multiple user statuses
   * @param statuses User statuses to set
   */
  setUserStatuses: (statuses: UserStatusInfo[]) => {
    if (!statuses.length) return;

    set((state) => {
      const onlineStatus = { ...state.onlineStatus };

      statuses.forEach((status) => {
        onlineStatus[status.user_id] = status.status;
      });

      return { onlineStatus };
    });
  },

  /**
   * Adds a user ID to the pending list
   * @param userId User ID
   */
  addPendingUser: (userId: string) => {
    set((state) => {
      if (state.pendingUserIds.includes(userId)) {
        return state;
      }

      return {
        pendingUserIds: [...state.pendingUserIds, userId],
        loadingStates: {
          ...state.loadingStates,
          [userId]: true,
        },
        errors: {
          ...state.errors,
          [userId]: null,
        },
      };
    });
  },

  /**
   * Removes a user ID from the pending list
   * @param userId User ID
   */
  removePendingUser: (userId: string) => {
    set((state) => ({
      pendingUserIds: state.pendingUserIds.filter((id) => id !== userId),
    }));
  },

  /**
   * Gets a user by ID
   * @param userId User ID
   * @returns User or null if not found
   */
  getUserById: (userId: string): User | null => {
    return get().byId[userId] || null;
  },

  /**
   * Gets the display name for a user
   * @param userId User ID
   * @returns User display name
   */
  getUserDisplayName: (userId: string): string => {
    const user = get().byId[userId];

    if (!user) {
      return "Unknown User";
    }

    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else {
      return user.nickname || user.username || "User";
    }
  },

  /**
   * Resets the users state
   */
  reset: () => {
    set({
      byId: {},
      loadingStates: {},
      errors: {},
      onlineStatus: {},
      lastFetchTimes: {},
      pendingUserIds: [],
    });
  },
}));

/**
 * Gets the online status for a user
 * @param userId User ID
 * @returns User online status
 */
export const getUserStatus = (userId: string): UserStatus => {
  return useUserStore.getState().onlineStatus[userId] || "offline";
};

/**
 * Formats a user name
 * @param user User
 * @returns Formatted user name
 */
export const formatUserName = (user: User | null | undefined): string => {
  if (!user) return "Unknown User";

  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  } else {
    return user.nickname || user.username || "User";
  }
};
