// src/core/store/channelStore.ts
/**
 * Channel store
 * Manages all channel data including direct and group message channels
 */
import { create } from "zustand";
import {
  Channel,
  ChannelState,
  ChannelMember,
  ChannelGroupType,
} from "../../types/channel.types";
import { emitEvent } from "./eventStore";
import { EventType } from "../../types/event.types";
import { ErrorSource } from "../../types/error.types";
import { handleError } from "./errorStore";
import { User } from "../../types/auth.types";
import { UserStatus } from "../../types/user.types";
import {
  DirectChannelInfo,
  isDirectChannel,
  isGroupChannel,
  getUserIdsFromDirectChannel,
  getOtherUserIdFromDirectChannel,
  getUserIdsFromGroupChannel,
  getDirectChannelDisplayName,
  getGroupChannelDisplayName,
  getChannelInitials,
} from "../../utils/channelUtils";

/**
 * Enhanced channel store state with direct message information
 */
interface EnhancedChannelState extends ChannelState {
  // Direct channel specific fields
  directChannelInfoById: Record<string, DirectChannelInfo>;
  pendingUserIds: string[];
}

/**
 * Channel store state and actions
 */
interface ChannelStoreState extends EnhancedChannelState {
  // Fields not in base state
  loadingTeamIds: string[];
  loadingChannelIds: string[];
  errors: Record<string, Error | null>;

  // Actions - Basic CRUD
  setChannels: (teamId: string, channels: Channel[]) => void;
  setChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setChannelMembers: (channelId: string, members: ChannelMember[]) => void;

  // Actions - Loading/Error
  setLoading: (teamId: string, isLoading: boolean) => void;
  setChannelLoading: (channelId: string, isLoading: boolean) => void;
  setError: (teamId: string, error: Error | null) => void;

  // Actions - Channel Properties
  updateChannel: (channelId: string, data: Partial<Channel>) => void;
  setChannelProperty: <K extends keyof Channel>(
    channelId: string,
    key: K,
    value: Channel[K],
  ) => void;

  // Actions - Direct Channel Info
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

  // Selectors - Basic Channel
  getChannelById: (channelId: string) => Channel | null;
  getChannelsByTeam: (teamId: string) => Channel[];
  getChannelsByType: (teamId: string, type: ChannelGroupType) => Channel[];
  getChannelMembers: (channelId: string) => ChannelMember[];
  isChannelLoading: (teamId: string) => boolean;

  // Selectors - Direct Channel Info
  getDirectChannelInfo: (channelId: string) => DirectChannelInfo | null;
  isDirectChannelLoading: (channelId: string) => boolean;
  isPendingUser: (userId: string) => boolean;

  // Global helpers
  createDefaultDirectChannelInfo: (
    channel: Channel,
    userId?: string,
  ) => DirectChannelInfo;

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
 * Channel store for managing all channel data
 */
export const useChannelStore = create<ChannelStoreState>()((set, get) => ({
  // Initial state
  channelsByTeam: {},
  activeChannel: null,
  members: {},
  loadingTeamIds: [],
  loadingChannelIds: [],
  errors: {},
  lastFetchTimes: {},

  // Direct channel specific state
  directChannelInfoById: {},
  pendingUserIds: [],

  /**
   * Sets all channels for a team
   * @param teamId Team ID
   * @param channels Array of channels
   */
  setChannels: (teamId: string, channels: Channel[]) => {
    set((state) => {
      // Store channels by team
      const directChannelInfoById = { ...state.directChannelInfoById };

      // Pre-create direct channel info for direct and group channels
      channels.forEach((channel) => {
        if (
          (isDirectChannel(channel) || isGroupChannel(channel)) &&
          !directChannelInfoById[channel.id]
        ) {
          // Create default info for direct/group channels
          directChannelInfoById[channel.id] =
            get().createDefaultDirectChannelInfo(channel);
        }
      });

      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: channels,
        },
        directChannelInfoById,
        loadingTeamIds: state.loadingTeamIds.filter((id) => id !== teamId),
        loadingChannelIds: state.loadingChannelIds.filter(
          (id) => !channels.some((channel) => channel.id === id),
        ),
        errors: {
          ...state.errors,
          [teamId]: null,
        },
        lastFetchTimes: {
          ...state.lastFetchTimes,
          [teamId]: Date.now(),
        },
      };
    });
  },

  /**
   * Sets a single channel in the store
   * @param channel Channel to set
   */
  setChannel: (channel: Channel) => {
    set((state) => {
      const teamId = channel.team_id;
      const isDirectMsg = isDirectChannel(channel);
      const isGroupMsg = isGroupChannel(channel);

      // Get existing channels for this team
      const teamChannels = [...(state.channelsByTeam[teamId] || [])];

      // Check if channel already exists
      const channelIndex = teamChannels.findIndex((c) => c.id === channel.id);

      if (channelIndex >= 0) {
        // Update existing channel
        teamChannels[channelIndex] = channel;
      } else {
        // Add new channel
        teamChannels.push(channel);

        // Emit channel created/joined event
        emitEvent(EventType.CHANNEL_CREATED, { channel });
      }

      // Update or create direct channel info if needed
      let directChannelInfoById = state.directChannelInfoById;

      if (isDirectMsg || isGroupMsg) {
        if (!directChannelInfoById[channel.id]) {
          directChannelInfoById = {
            ...directChannelInfoById,
            [channel.id]: get().createDefaultDirectChannelInfo(channel),
          };
        }
      }

      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: teamChannels,
        },
        directChannelInfoById,
        loadingChannelIds: state.loadingChannelIds.filter(
          (id) => id !== channel.id,
        ),
        lastFetchTimes: {
          ...state.lastFetchTimes,
          [channel.id]: Date.now(),
        },
      };
    });
  },

  /**
   * Removes a channel from the store
   * @param channelId Channel ID to remove
   */
  removeChannel: (channelId: string) => {
    set((state) => {
      // Find the channel and its team
      let teamId: string | undefined;
      let removedChannel: Channel | undefined;

      for (const [tid, channels] of Object.entries(state.channelsByTeam)) {
        const channel = channels.find((c) => c.id === channelId);
        if (channel) {
          teamId = tid;
          removedChannel = channel;
          break;
        }
      }

      if (!teamId || !removedChannel) {
        return state;
      }

      // Create new channels array without the channel
      const updatedChannels = state.channelsByTeam[teamId].filter(
        (c) => c.id !== channelId,
      );

      // Update active channel if needed
      let activeChannel = state.activeChannel;
      if (state.activeChannel?.id === channelId) {
        activeChannel = null;
      }

      // Remove members for this channel
      const { [channelId]: _, ...members } = state.members;

      // Remove direct channel info if applicable
      const { [channelId]: __, ...directChannelInfoById } =
        state.directChannelInfoById;

      // Emit channel deleted/left event
      emitEvent(EventType.CHANNEL_DELETED, {
        channel: removedChannel,
        teamId,
      });

      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: updatedChannels,
        },
        activeChannel,
        members,
        directChannelInfoById,
      };
    });
  },

  /**
   * Sets the active channel
   * @param channel Channel to set as active or null
   */
  setActiveChannel: (channel: Channel | null) => {
    set((state) => {
      // Skip if already active
      if (state.activeChannel?.id === channel?.id) {
        return state;
      }

      // Emit channel selected event
      if (channel) {
        emitEvent(EventType.CHANNEL_SELECTED, { channel });
      }

      return { activeChannel: channel };
    });
  },

  /**
   * Sets members for a channel
   * @param channelId Channel ID
   * @param members Channel members
   */
  setChannelMembers: (channelId: string, members: ChannelMember[]) => {
    set((state) => {
      // Get the channel to check if it's a direct/group channel
      const channel = get().getChannelById(channelId);
      const stateUpdate: Partial<ChannelStoreState> = {
        members: {
          ...state.members,
          [channelId]: members,
        },
      };

      // If it's a group channel, update the direct channel info with member IDs
      if (channel && isGroupChannel(channel)) {
        const memberUserIds = members.map((m) => m.user_id);

        if (state.directChannelInfoById[channelId]) {
          // Update existing info with new member IDs
          stateUpdate.directChannelInfoById = {
            ...state.directChannelInfoById,
            [channelId]: {
              ...state.directChannelInfoById[channelId],
              userIds: memberUserIds,
            },
          };
        }
      }

      return stateUpdate as ChannelStoreState;
    });
  },

  /**
   * Sets the loading state for a team's channels
   * @param teamId Team ID
   * @param isLoading Whether channels are loading
   */
  setLoading: (teamId: string, isLoading: boolean) => {
    set((state) => {
      if (isLoading) {
        // Add to loading teams if not already there
        if (!state.loadingTeamIds.includes(teamId)) {
          return {
            loadingTeamIds: [...state.loadingTeamIds, teamId],
          };
        }
      } else {
        // Remove from loading teams
        return {
          loadingTeamIds: state.loadingTeamIds.filter((id) => id !== teamId),
        };
      }
      return state;
    });
  },

  /**
   * Sets the loading state for a specific channel
   * @param channelId Channel ID
   * @param isLoading Whether channel is loading
   */
  setChannelLoading: (channelId: string, isLoading: boolean) => {
    set((state) => {
      if (isLoading) {
        // Add to loading channels if not already there
        if (!state.loadingChannelIds.includes(channelId)) {
          return {
            loadingChannelIds: [...state.loadingChannelIds, channelId],
          };
        }
      } else {
        // Remove from loading channels
        return {
          loadingChannelIds: state.loadingChannelIds.filter(
            (id) => id !== channelId,
          ),
        };
      }
      return state;
    });
  },

  /**
   * Sets the error state for a team's channels
   * @param teamId Team ID
   * @param error Error object or null
   */
  setError: (teamId: string, error: Error | null) => {
    set((state) => {
      // Stop loading for this team
      const loadingTeamIds = state.loadingTeamIds.filter((id) => id !== teamId);

      // Update errors record
      const errors = {
        ...state.errors,
        [teamId]: error,
      };

      // Handle error if present
      if (error) {
        handleError(error, ErrorSource.API);
      }

      return {
        loadingTeamIds,
        errors,
      };
    });
  },

  /**
   * Updates a channel with partial data
   * @param channelId Channel ID
   * @param data Partial channel data
   */
  updateChannel: (channelId: string, data: Partial<Channel>) => {
    set((state) => {
      // Find the channel
      const channel = get().getChannelById(channelId);

      if (!channel) {
        return state;
      }

      // Create updated channel
      const updatedChannel = {
        ...channel,
        ...data,
      };

      // Find team ID and update channel
      const teamId = channel.team_id;
      const teamChannels = state.channelsByTeam[teamId] || [];

      const updatedChannels = teamChannels.map((c) =>
        c.id === channelId ? updatedChannel : c,
      );

      // Update active channel if needed
      let activeChannel = state.activeChannel;
      if (state.activeChannel?.id === channelId) {
        activeChannel = updatedChannel;
      }

      // Emit channel updated event
      emitEvent(EventType.CHANNEL_UPDATED, { channel: updatedChannel });

      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: updatedChannels,
        },
        activeChannel,
      };
    });
  },

  /**
   * Sets a single property on a channel
   * @param channelId Channel ID
   * @param key Property key
   * @param value Property value
   */
  setChannelProperty: <K extends keyof Channel>(
    channelId: string,
    key: K,
    value: Channel[K],
  ) => {
    set((state) => {
      // Find the channel
      const channel = get().getChannelById(channelId);

      if (!channel) {
        return state;
      }

      // Create updated channel with new property
      const updatedChannel = {
        ...channel,
        [key]: value,
      };

      // Find team ID and update channel
      const teamId = channel.team_id;
      const teamChannels = state.channelsByTeam[teamId] || [];

      const updatedChannels = teamChannels.map((c) =>
        c.id === channelId ? updatedChannel : c,
      );

      // Update active channel if needed
      let activeChannel = state.activeChannel;
      if (state.activeChannel?.id === channelId) {
        activeChannel = updatedChannel;
      }

      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: updatedChannels,
        },
        activeChannel,
      };
    });
  },

  /**
   * Sets information for a direct/group channel
   * @param channelId Channel ID
   * @param info Channel information
   */
  setDirectChannelInfo: (channelId: string, info: DirectChannelInfo) => {
    set((state) => ({
      directChannelInfoById: {
        ...state.directChannelInfoById,
        [channelId]: info,
      },
      loadingChannelIds: state.loadingChannelIds.filter(
        (id) => id !== channelId,
      ),
    }));
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
      const existingInfo = state.directChannelInfoById[channelId];

      if (!existingInfo) {
        return state;
      }

      return {
        directChannelInfoById: {
          ...state.directChannelInfoById,
          [channelId]: {
            ...existingInfo,
            [key]: value,
          },
        },
      };
    });
  },

  /**
   * Sets user status for a direct channel
   * @param channelId Channel ID
   * @param status User status
   */
  setDirectChannelUserStatus: (channelId: string, status: UserStatus) => {
    set((state) => {
      const existingInfo = state.directChannelInfoById[channelId];

      if (!existingInfo || !existingInfo.isDirect) {
        return state;
      }

      return {
        directChannelInfoById: {
          ...state.directChannelInfoById,
          [channelId]: {
            ...existingInfo,
            userStatus: status,
          },
        },
      };
    });
  },

  /**
   * Sets user image URL for a direct channel
   * @param channelId Channel ID
   * @param imageUrl Image URL
   */
  setDirectChannelUserImage: (channelId: string, imageUrl: string) => {
    set((state) => {
      const existingInfo = state.directChannelInfoById[channelId];

      if (!existingInfo || !existingInfo.isDirect) {
        return state;
      }

      return {
        directChannelInfoById: {
          ...state.directChannelInfoById,
          [channelId]: {
            ...existingInfo,
            userImageUrl: imageUrl,
          },
        },
      };
    });
  },

  /**
   * Adds a user ID to pending loading state
   * @param userId User ID
   */
  addPendingUser: (userId: string) => {
    set((state) => {
      if (state.pendingUserIds.includes(userId)) {
        return state;
      }

      return {
        pendingUserIds: [...state.pendingUserIds, userId],
      };
    });
  },

  /**
   * Removes a user ID from pending loading state
   * @param userId User ID
   */
  removePendingUser: (userId: string) => {
    set((state) => ({
      pendingUserIds: state.pendingUserIds.filter((id) => id !== userId),
    }));
  },

  /**
   * Creates default direct channel info for a channel
   * @param channel Channel object
   * @param currentUserId Optional current user ID
   * @returns Direct channel info
   */
  createDefaultDirectChannelInfo: (
    channel: Channel,
    currentUserId?: string,
  ): DirectChannelInfo => {
    // Generate a default DirectChannelInfo object
    let info: DirectChannelInfo = {
      ...DEFAULT_CHANNEL_INFO,
      displayName: channel.display_name || "Loading...",
      status: "loading",
    };

    // For direct message channels
    if (isDirectChannel(channel)) {
      const userIds = getUserIdsFromDirectChannel(channel.name);
      const otherUserId = currentUserId
        ? getOtherUserIdFromDirectChannel(channel.name, currentUserId)
        : userIds[0];

      info = {
        ...info,
        isDirect: true,
        isGroup: false,
        userIds,
        otherUserId,
        displayName:
          channel.display_name ||
          (otherUserId
            ? `User ${otherUserId.substring(0, 5)}...`
            : "Direct Message"),
      };
    }
    // For group message channels
    else if (isGroupChannel(channel)) {
      const userIds = getUserIdsFromGroupChannel(channel);

      info = {
        ...info,
        isDirect: false,
        isGroup: true,
        userIds,
        displayName: channel.display_name || "Group Message",
      };
    }

    return info;
  },

  /**
   * Gets a channel by ID
   * @param channelId Channel ID
   * @returns Channel or null if not found
   */
  getChannelById: (channelId: string): Channel | null => {
    const { channelsByTeam } = get();

    for (const teamId in channelsByTeam) {
      const channel = channelsByTeam[teamId].find((c) => c.id === channelId);
      if (channel) {
        return channel;
      }
    }

    return null;
  },

  /**
   * Gets all channels for a team
   * @param teamId Team ID
   * @returns Array of channels
   */
  getChannelsByTeam: (teamId: string): Channel[] => {
    return get().channelsByTeam[teamId] || [];
  },

  /**
   * Gets channels of a specific type for a team
   * @param teamId Team ID
   * @param type Channel group type
   * @returns Filtered channels
   */
  getChannelsByType: (teamId: string, type: ChannelGroupType): Channel[] => {
    const channels = get().channelsByTeam[teamId] || [];

    switch (type) {
      case "public":
        return channels.filter((c) => c.type === "O");
      case "private":
        return channels.filter((c) => c.type === "P");
      case "direct":
        return channels.filter((c) => c.type === "D");
      case "group":
        return channels.filter((c) => c.type === "G");
      case "favorite":
        return channels.filter((c) => c.is_favorite);
      default:
        return channels;
    }
  },

  /**
   * Gets members for a channel
   * @param channelId Channel ID
   * @returns Array of channel members
   */
  getChannelMembers: (channelId: string): ChannelMember[] => {
    return get().members[channelId] || [];
  },

  /**
   * Checks if channels for a team are loading
   * @param teamId Team ID
   * @returns Whether channels are loading
   */
  isChannelLoading: (teamId: string): boolean => {
    return get().loadingTeamIds.includes(teamId);
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
    return get().loadingChannelIds.includes(channelId);
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
   * Resets the store to initial state
   */
  reset: () => {
    set({
      channelsByTeam: {},
      activeChannel: null,
      members: {},
      loadingTeamIds: [],
      loadingChannelIds: [],
      errors: {},
      lastFetchTimes: {},
      directChannelInfoById: {},
      pendingUserIds: [],
    });
  },
}));

/**
 * Helper function to get channels by type
 * @param teamId Team ID
 * @param type Channel group type
 * @returns Filtered channels
 */
export function getChannelsByType(
  teamId: string,
  type: ChannelGroupType,
): Channel[] {
  return useChannelStore.getState().getChannelsByType(teamId, type);
}

/**
 * Helper function to check if a channel is a direct message
 * @param channel Channel to check
 * @returns Whether channel is a direct message
 */
export { isDirectChannel } from "../../utils/channelUtils";

/**
 * Helper function to check if a channel is a group message
 * @param channel Channel to check
 * @returns Whether channel is a group message
 */
export { isGroupChannel } from "../../utils/channelUtils";

/**
 * Helper function to check if a channel is a direct or group message
 * @param channel Channel to check
 * @returns Whether channel is a direct or group message
 */
export { isDirectOrGroupChannel } from "../../utils/channelUtils";
