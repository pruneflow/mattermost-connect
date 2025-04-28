// src/core/store/directMessageStore.ts
/**
 * Direct Message store
 * Manages information about direct and group message channels
 */
import { create } from "zustand";
import { DirectChannelInfo, Channel } from "../../types/channel.types";
import { User } from "../../types/auth.types";
import { UserStatus } from "../../types/user.types";

/**
 * Direct message store state
 */
interface DirectMessageState {
  // State
  channelInfoById: Record<string, DirectChannelInfo>;
  loadingChannelIds: string[];
  errors: Record<string, Error | null>;

  // Actions
  setChannelInfo: (channelId: string, info: DirectChannelInfo) => void;
  setLoading: (channelId: string, isLoading: boolean) => void;
  setError: (channelId: string, error: Error | null) => void;
  updateChannelInfoProperty: <K extends keyof DirectChannelInfo>(
    channelId: string,
    key: K,
    value: DirectChannelInfo[K],
  ) => void;

  // Utilities
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

  // Selectors
  getChannelInfo: (channelId: string) => DirectChannelInfo | null;
  isLoading: (channelId: string) => boolean;

  // Reset
  reset: () => void;
}

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
 * Direct message store for managing DM channel info
 */
export const useDirectMessageStore = create<DirectMessageState>()(
  (set, get) => ({
    // Initial state
    channelInfoById: {},
    loadingChannelIds: [],
    errors: {},

    /**
     * Sets information for a direct/group channel
     * @param channelId Channel ID
     * @param info Channel information
     */
    setChannelInfo: (channelId: string, info: DirectChannelInfo) => {
      set((state) => ({
        channelInfoById: {
          ...state.channelInfoById,
          [channelId]: info,
        },
        loadingChannelIds: state.loadingChannelIds.filter(
          (id) => id !== channelId,
        ),
      }));
    },

    /**
     * Sets loading state for a channel
     * @param channelId Channel ID
     * @param isLoading Whether channel info is loading
     */
    setLoading: (channelId: string, isLoading: boolean) => {
      set((state) => {
        if (isLoading) {
          // Set loading state and update channel info if it exists
          const updatedChannelInfo = { ...state.channelInfoById };

          if (updatedChannelInfo[channelId]) {
            updatedChannelInfo[channelId] = {
              ...updatedChannelInfo[channelId],
              status: "loading",
            };
          } else {
            // Create placeholder info with loading status
            updatedChannelInfo[channelId] = {
              ...DEFAULT_CHANNEL_INFO,
              displayName: "Loading...",
              status: "loading",
            };
          }

          return {
            channelInfoById: updatedChannelInfo,
            loadingChannelIds: [...state.loadingChannelIds, channelId],
          };
        } else {
          // Remove from loading state
          return {
            loadingChannelIds: state.loadingChannelIds.filter(
              (id) => id !== channelId,
            ),
          };
        }
      });
    },

    /**
     * Sets error state for a channel
     * @param channelId Channel ID
     * @param error Error object or null
     */
    setError: (channelId: string, error: Error | null) => {
      set((state) => {
        // Remove from loading state
        const loadingChannelIds = state.loadingChannelIds.filter(
          (id) => id !== channelId,
        );

        // Update channel info if it exists
        const updatedChannelInfo = { ...state.channelInfoById };

        if (error && updatedChannelInfo[channelId]) {
          updatedChannelInfo[channelId] = {
            ...updatedChannelInfo[channelId],
            status: "error",
          };
        }

        return {
          loadingChannelIds,
          channelInfoById: updatedChannelInfo,
          errors: {
            ...state.errors,
            [channelId]: error,
          },
        };
      });
    },

    /**
     * Updates a specific property of channel info
     * @param channelId Channel ID
     * @param key Property key
     * @param value Property value
     */
    updateChannelInfoProperty: <K extends keyof DirectChannelInfo>(
      channelId: string,
      key: K,
      value: DirectChannelInfo[K],
    ) => {
      set((state) => {
        const existingInfo = state.channelInfoById[channelId];

        if (!existingInfo) {
          return state;
        }

        return {
          channelInfoById: {
            ...state.channelInfoById,
            [channelId]: {
              ...existingInfo,
              [key]: value,
            },
          },
        };
      });
    },

    /**
     * Gets a display name for a direct message channel
     * @param otherUser User object for the other person
     * @param fallbackName Fallback name if user not available
     * @returns Formatted display name
     */
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

    /**
     * Gets a display name for a group message channel
     * @param users List of users in the group
     * @param currentUserId Current user ID to exclude
     * @param maxNames Maximum number of names to include
     * @returns Formatted display name
     */
    getGroupChannelDisplayName: (
      users: User[],
      currentUserId: string,
      maxNames: number = 3,
    ): string => {
      // Filter out current user
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
          return user.username || "User";
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

    /**
     * Gets initials from a display name
     * @param displayName Display name
     * @returns Initials (1-2 characters)
     */
    getChannelInitials: (displayName: string): string => {
      if (!displayName) return "?";

      const parts = displayName.trim().split(/[\s,]+/);

      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
      }

      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    },

    /**
     * Gets other user IDs from a direct channel name
     * @param channelName Channel name (format: user1_id__user2_id)
     * @param currentUserId Current user ID to exclude
     * @returns List of other user IDs
     */
    getOtherUserIds: (channelName: string, currentUserId: string): string[] => {
      const userIds = channelName.split("__");
      return userIds.filter((id) => id !== currentUserId);
    },

    /**
     * Gets direct channel info for a channel
     * @param channelId Channel ID
     * @returns Channel info or null if not found
     */
    getChannelInfo: (channelId: string): DirectChannelInfo | null => {
      return get().channelInfoById[channelId] || null;
    },

    /**
     * Checks if a channel's info is loading
     * @param channelId Channel ID
     * @returns Whether channel info is loading
     */
    isLoading: (channelId: string): boolean => {
      return get().loadingChannelIds.includes(channelId);
    },

    /**
     * Resets the store to initial state
     */
    reset: () => {
      set({
        channelInfoById: {},
        loadingChannelIds: [],
        errors: {},
      });
    },
  }),
);

/**
 * Helper function to determine if a channel is a direct message
 * @param channel Channel to check
 * @returns Whether channel is a direct message
 */
export function isDirectChannel(channel: Channel): boolean {
  return channel.type === "D";
}

/**
 * Helper function to determine if a channel is a group message
 * @param channel Channel to check
 * @returns Whether channel is a group message
 */
export function isGroupChannel(channel: Channel): boolean {
  return channel.type === "G";
}

/**
 * Helper function to check if a channel is either direct or group
 * @param channel Channel to check
 * @returns Whether channel is direct or group
 */
export function isDirectOrGroupChannel(channel: Channel): boolean {
  return isDirectChannel(channel) || isGroupChannel(channel);
}

/**
 * Helper function to extract user IDs from a direct channel name
 * @param channelName Channel name (format: user1_id__user2_id)
 * @returns Array of user IDs
 */
export function getUserIdsFromDirectChannel(channelName: string): string[] {
  return channelName.split("__");
}

/**
 * Helper function to get other user ID from a direct channel
 * @param channelName Channel name
 * @param currentUserId Current user ID
 * @returns Other user ID or null
 */
export function getOtherUserIdFromDirectChannel(
  channelName: string,
  currentUserId: string,
): string | null {
  const userIds = getUserIdsFromDirectChannel(channelName);
  const otherUserId = userIds.find((id) => id !== currentUserId);
  return otherUserId || null;
}
