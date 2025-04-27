// src/core/store/userStatusStore.ts
import { create } from "zustand";
import { UserStatus } from "./userStore";

interface UserStatusState {
  userStatus: Record<string, UserStatus>;
  typingUsers: Record<string, { userId: string; timestamp: number }[]>;
}

const TYPING_TIMEOUT = 5000; // 5 seconds for typing indicator to disappear

export const useUserStatusStore = create<
  UserStatusState & {
    setUserStatus: (userId: string, status: UserStatus) => void;
    setUserStatuses: (statuses: Record<string, UserStatus>) => void;
    setTyping: (channelId: string, userId: string) => void;
    clearTyping: (channelId: string, userId: string) => void;
    getTypingUsers: (channelId: string) => string[];
    getUserStatus: (userId: string) => UserStatus;
    cleanupExpiredTyping: () => void;
    reset: () => void;
  }
>((set, get) => ({
  userStatus: {},
  typingUsers: {},

  setUserStatus: (userId: string, status: UserStatus) => {
    set((state) => ({
      userStatus: {
        ...state.userStatus,
        [userId]: status,
      },
    }));
  },

  setUserStatuses: (statuses: Record<string, UserStatus>) => {
    set((state) => ({
      userStatus: {
        ...state.userStatus,
        ...statuses,
      },
    }));
  },

  setTyping: (channelId: string, userId: string) => {
    const now = Date.now();

    set((state) => {
      const channelTyping = state.typingUsers[channelId] || [];

      // Remove existing entry for this user if present
      const filteredUsers = channelTyping.filter(
        (entry) => entry.userId !== userId,
      );

      // Add new entry
      const updatedTyping = [...filteredUsers, { userId, timestamp: now }];

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
  },

  clearTyping: (channelId: string, userId: string) => {
    set((state) => {
      const channelTyping = state.typingUsers[channelId];
      if (!channelTyping) return state;

      const updatedTyping = channelTyping.filter(
        (entry) => entry.userId !== userId,
      );

      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: updatedTyping,
        },
      };
    });
  },

  getTypingUsers: (channelId: string) => {
    const typingEntries = get().typingUsers[channelId] || [];
    const now = Date.now();

    // Filter out expired entries
    return typingEntries
      .filter((entry) => now - entry.timestamp < TYPING_TIMEOUT)
      .map((entry) => entry.userId);
  },

  getUserStatus: (userId: string) => {
    return get().userStatus[userId] || "offline";
  },

  cleanupExpiredTyping: () => {
    const now = Date.now();

    set((state) => {
      const updatedTyping: Record<
        string,
        { userId: string; timestamp: number }[]
      > = {};
      let hasChanges = false;

      // Check each channel
      Object.entries(state.typingUsers).forEach(([channelId, users]) => {
        const validUsers = users.filter(
          (entry) => now - entry.timestamp < TYPING_TIMEOUT,
        );

        if (validUsers.length > 0) {
          updatedTyping[channelId] = validUsers;
        }

        if (validUsers.length !== users.length) {
          hasChanges = true;
        }
      });

      // Only update state if there were changes
      return hasChanges ? { typingUsers: updatedTyping } : state;
    });
  },

  reset: () => {
    set({
      userStatus: {},
      typingUsers: {},
    });
  },
}));

// Helper function to easily access user status
export const getUserStatus = (userId: string): UserStatus => {
  return useUserStatusStore.getState().getUserStatus(userId);
};
