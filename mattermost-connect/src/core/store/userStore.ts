// src/core/store/userStore.ts
import { create } from "zustand";
import { User } from "../services/authService";

export type UserStatus = "online" | "away" | "dnd" | "offline";

export interface UserStatusInfo {
  user_id: string;
  status: UserStatus;
  custom_status?: string;
  last_activity_at?: number;
}

interface UserState {
  byId: Record<string, User>;
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;
  lastFetchTimes: Record<string, number>;
  pendingUserIds: string[];
}

export const useUserStore = create<
  UserState & {
    setUser: (user: User) => void;
    setUsers: (users: User[]) => void;
    setLoading: (userId: string, isLoading: boolean) => void;
    setError: (userId: string, error: Error | null) => void;
    addPendingUser: (userId: string) => void;
    removePendingUser: (userId: string) => void;
    getUserById: (userId: string) => User | null;
    getUserDisplayName: (userId: string) => string;
    reset: () => void;
  }
>((set, get) => ({
  byId: {},
  loadingStates: {},
  errors: {},
  lastFetchTimes: {},
  pendingUserIds: [],

  setUser: (user: User) => {
    if (!user || !user.id) {
      console.warn("Attempted to set invalid user:", user);
      return;
    }

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

  setUsers: (users: User[]) => {
    if (!users || !users.length) return;

    set((state) => {
      const now = Date.now();
      const byId = { ...state.byId };
      const loadingStates = { ...state.loadingStates };
      const lastFetchTimes = { ...state.lastFetchTimes };
      const pendingUserIds = [...state.pendingUserIds];

      users.forEach((user) => {
        if (!user || !user.id) {
          console.warn("Attempted to set invalid user:", user);
          return;
        }

        byId[user.id] = user;
        loadingStates[user.id] = false;
        lastFetchTimes[user.id] = now;

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

  setLoading: (userId: string, isLoading: boolean) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [userId]: isLoading,
      },
    }));
  },

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

  removePendingUser: (userId: string) => {
    set((state) => ({
      pendingUserIds: state.pendingUserIds.filter((id) => id !== userId),
    }));
  },

  getUserById: (userId: string): User | null => {
    return get().byId[userId] || null;
  },

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

  reset: () => {
    set({
      byId: {},
      loadingStates: {},
      errors: {},
      lastFetchTimes: {},
      pendingUserIds: [],
    });
  },
}));

export const formatUserName = (user: User | null | undefined): string => {
  if (!user) return "Unknown User";

  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  } else {
    return user.nickname || user.username || "User";
  }
};
