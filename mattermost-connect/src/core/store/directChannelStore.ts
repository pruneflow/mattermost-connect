// src/core/store/directChannelStore.ts
/**
 * Direct channel store
 * Manages direct and group message channel data
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Channel, DirectChannelInfo, User, UserStatus } from "../../types";
import { channelService } from "../services/channelService";
import { createLoadingSlice } from "./storeUtils";
import { useUserStore } from "./userStore";

/**
 * Direct channel store state interface
 */
export interface DirectChannelState {
  // Data
  directChannelInfoById: Record<string, DirectChannelInfo>;
  pendingUserIds: string[];

  // Loading/Error state from common slice
  isLoading: boolean;
  loadingIds: string[];
  error: Error | null;
  errors: Record<string, Error | null>;

  // Actions
  setDirectChannelInfo: (channelId: string, info: DirectChannelInfo) => void;
  updateDirectChannelInfo: <K extends keyof DirectChannelInfo>(
    channelId: string,
    key: K,
    value: DirectChannelInfo[K],
  ) => void;
  setDirectChannelUserStatus: (channelId: string, status: UserStatus) => void;
  setDirectChannelUserImage: (channelId: string, imageUrl: string) => void;
  addPendingUser: (userId: string) => void;
  removePendingUser: (userId: string) => void;

  // Selectors
  getDirectChannelInfo: (channelId: string) => DirectChannelInfo | null;
  isDirectChannelLoading: (channelId: string) => boolean;
  isPendingUser: (userId: string) => boolean;
  refreshDirectChannelInfo: (channelId: string, currentUserId: string) => void;

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
 * Direct channel store for managing direct and group message channels
 */
export const useDirectChannelStore = create<DirectChannelState>()(
  immer((set, get) => ({
    // Initial state
    directChannelInfoById: {},
    pendingUserIds: [],

    // Include loading/error slice
    ...createLoadingSlice<any>(set),

    /**
     * Sets information for a direct/group channel
     * @param channelId Channel ID
     * @param info Channel information
     */
    setDirectChannelInfo: (channelId: string, info: DirectChannelInfo) => {
      set((state) => {
        state.directChannelInfoById[channelId] = info;

        // Clear loading state
        state.loadingIds = state.loadingIds.filter((id) => id !== channelId);
      });
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
      set((state) => {
        if (!state.directChannelInfoById[channelId]) {
          state.directChannelInfoById[channelId] = { ...DEFAULT_CHANNEL_INFO };
        }

        state.directChannelInfoById[channelId][key] = value;
      });
    },

    /**
     * Sets user status for a direct channel
     * @param channelId Channel ID
     * @param status User status
     */
    setDirectChannelUserStatus: (channelId: string, status: UserStatus) => {
      set((state) => {
        const info = state.directChannelInfoById[channelId];
        if (info && info.isDirect) {
          info.userStatus = status;
        }
      });
    },

    /**
     * Sets user image URL for a direct channel
     * @param channelId Channel ID
     * @param imageUrl Image URL
     */
    setDirectChannelUserImage: (channelId: string, imageUrl: string) => {
      set((state) => {
        const info = state.directChannelInfoById[channelId];
        if (info && info.isDirect) {
          info.userImageUrl = imageUrl;
        }
      });
    },

    /**
     * Adds a user ID to pending loading state
     * @param userId User ID
     */
    addPendingUser: (userId: string) => {
      set((state) => {
        if (!state.pendingUserIds.includes(userId)) {
          state.pendingUserIds.push(userId);
        }
      });
    },

    /**
     * Removes a user ID from pending loading state
     * @param userId User ID
     */
    removePendingUser: (userId: string) => {
      set((state) => {
        state.pendingUserIds = state.pendingUserIds.filter(
          (id) => id !== userId,
        );
      });
    },

    /**
     * Gets direct channel info for a channel
     * @param channelId Channel ID
     * @returns Direct channel info or null if not found
     */
    getDirectChannelInfo: (channelId: string): DirectChannelInfo | null => {
      return get().directChannelInfoById[channelId] || null;
    },

    /**
     * Checks if a direct channel is loading
     * @param channelId Channel ID
     * @returns Whether the channel is loading
     */
    isDirectChannelLoading: (channelId: string): boolean => {
      return get().loadingIds.includes(channelId);
    },

    /**
     * Checks if a user ID is pending loading
     * @param userId User ID
     * @returns Whether the user is pending
     */
    isPendingUser: (userId: string): boolean => {
      return get().pendingUserIds.includes(userId);
    },

    /**
     * Refreshes direct channel info using current user data
     * @param channelId Channel ID
     * @param currentUserId Current user ID
     */
    refreshDirectChannelInfo: (channelId: string, currentUserId: string) => {
      const { getChannelById } = useChannelStore.getState();
      const { byId: users } = useUserStore.getState();
      const { statusByUserId: statuses } = useUserStore.getState();

      const channel = getChannelById(channelId);

      if (!channel) return;

      // Only process direct or group channels
      if (!channelService.isDirectOrGroupChannel(channel)) return;

      const info = channelService.createDirectChannelInfo(
        channel,
        currentUserId,
        users,
        statuses,
      );

      set((state) => {
        state.directChannelInfoById[channelId] = info;
      });
    },

    /**
     * Resets the store to initial state
     */
    reset: () => {
      set((state) => {
        state.directChannelInfoById = {};
        state.pendingUserIds = [];
        state.isLoading = false;
        state.loadingIds = [];
        state.error = null;
        state.errors = {};
      });
    },
  })),
);

// Import after definition to avoid circular dependencies
import { useChannelStore } from "./channelStore";
