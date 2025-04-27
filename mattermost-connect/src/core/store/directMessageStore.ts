// src/core/store/directMessageStore.ts
import { create } from "zustand";
import { Channel } from "./channelStore";
import { User } from "../services/authService";
import { UserStatus } from "./userStore";

export type DirectChannelInfoStatus = "complete" | "loading" | "error";

export interface DirectChannelInfo {
  isDirect: boolean;
  isGroup: boolean;
  displayName: string;
  userIds: string[];
  otherUserId?: string | null;
  userImageUrl?: string;
  userStatus?: UserStatus;
  groupAvatarUrls?: string[];
  status: DirectChannelInfoStatus;
}

interface DirectMessageState {
  channelInfoById: Record<string, DirectChannelInfo>;
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;
}

export const useDirectMessageStore = create<
  DirectMessageState & {
    setChannelInfo: (channelId: string, info: DirectChannelInfo) => void;
    setLoading: (channelId: string, isLoading: boolean) => void;
    setError: (channelId: string, error: Error | null) => void;
    getDirectChannelDisplayName: (
      otherUser: User | null,
      fallbackName?: string,
    ) => string;
    getGroupChannelDisplayName: (
      users: User[],
      currentUserId: string,
      maxNames?: number,
    ) => string;
    getChannelInitials: (displayName: string) => string;
    getOtherUserIds: (channelName: string, currentUserId: string) => string[];
    reset: () => void;
  }
>((set, get) => ({
  channelInfoById: {},
  loadingStates: {},
  errors: {},

  setChannelInfo: (channelId: string, info: DirectChannelInfo) => {
    set((state) => ({
      channelInfoById: {
        ...state.channelInfoById,
        [channelId]: info,
      },
      loadingStates: {
        ...state.loadingStates,
        [channelId]: false,
      },
    }));
  },

  setLoading: (channelId: string, isLoading: boolean) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [channelId]: isLoading,
      },
    }));
  },

  setError: (channelId: string, error: Error | null) => {
    set((state) => ({
      errors: {
        ...state.errors,
        [channelId]: error,
      },
      loadingStates: {
        ...state.loadingStates,
        [channelId]: false,
      },
    }));
  },

  getDirectChannelDisplayName: (
    otherUser: User | null,
    fallbackName: string = "Unknown User",
  ): string => {
    if (!otherUser) {
      return fallbackName;
    }

    if (otherUser.first_name && otherUser.last_name) {
      return `${otherUser.first_name} ${otherUser.last_name}`;
    } else if (otherUser.nickname) {
      return otherUser.nickname;
    } else {
      return otherUser.username || fallbackName;
    }
  },

  getGroupChannelDisplayName: (
    users: User[],
    currentUserId: string,
    maxNames: number = 3,
  ): string => {
    // Filter out current user and get valid users
    const otherUsers = users.filter((user) => user.id !== currentUserId);

    if (otherUsers.length === 0) {
      return "Group Channel";
    }

    // Format names
    const formattedNames = otherUsers.map((user) => {
      if (user.first_name) {
        return user.first_name;
      } else if (user.nickname) {
        return user.nickname;
      } else {
        return user.username;
      }
    });

    // Limit the number of displayed names
    if (formattedNames.length <= maxNames) {
      return formattedNames.join(", ");
    } else {
      const displayedNames = formattedNames.slice(0, maxNames);
      const remainingCount = formattedNames.length - maxNames;
      return `${displayedNames.join(", ")} and ${remainingCount} more`;
    }
  },

  getChannelInitials: (displayName: string): string => {
    if (!displayName) return "?";

    const parts = displayName.trim().split(/[\s,]+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  },

  getOtherUserIds: (channelName: string, currentUserId: string): string[] => {
    const userIds = channelName.split("__");
    return userIds.filter((id) => id !== currentUserId);
  },

  reset: () => {
    set({
      channelInfoById: {},
      loadingStates: {},
      errors: {},
    });
  },
}));
