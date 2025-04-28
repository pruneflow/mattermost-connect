// src/core/store/channelStore.ts
/**
 * Channel store
 * Manages channel data and active channel selection
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

/**
 * Channel store state and actions
 */
interface ChannelStoreState extends ChannelState {
  // Fields not in base state
  loadingTeamIds: string[];
  errors: Record<string, Error | null>;

  // Actions - Basic CRUD
  setChannels: (teamId: string, channels: Channel[]) => void;
  setChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setChannelMembers: (channelId: string, members: ChannelMember[]) => void;

  // Actions - Loading/Error
  setLoading: (teamId: string, isLoading: boolean) => void;
  setError: (teamId: string, error: Error | null) => void;

  // Actions - Channel Properties
  updateChannel: (channelId: string, data: Partial<Channel>) => void;
  setChannelProperty: <K extends keyof Channel>(
    channelId: string,
    key: K,
    value: Channel[K],
  ) => void;

  // Selectors
  getChannelById: (channelId: string) => Channel | null;
  getChannelsByTeam: (teamId: string) => Channel[];
  getChannelsByType: (teamId: string, type: ChannelGroupType) => Channel[];
  getChannelMembers: (channelId: string) => ChannelMember[];
  isChannelLoading: (teamId: string) => boolean;

  // Reset
  reset: () => void;
}

/**
 * Channel store for managing channel data
 */
export const useChannelStore = create<ChannelStoreState>()((set, get) => ({
  // Initial state
  channelsByTeam: {},
  activeChannel: null,
  members: {},
  loadingTeamIds: [],
  errors: {},
  lastFetchTimes: {},

  /**
   * Sets all channels for a team
   * @param teamId Team ID
   * @param channels Array of channels
   */
  setChannels: (teamId: string, channels: Channel[]) => {
    set((state) => {
      // Store channels by team
      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: channels,
        },
        loadingTeamIds: state.loadingTeamIds.filter((id) => id !== teamId),
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

      return {
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: teamChannels,
        },
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
    set((state) => ({
      members: {
        ...state.members,
        [channelId]: members,
      },
    }));
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
   * Resets the store to initial state
   */
  reset: () => {
    set({
      channelsByTeam: {},
      activeChannel: null,
      members: {},
      loadingTeamIds: [],
      errors: {},
      lastFetchTimes: {},
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
