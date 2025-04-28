// src/core/store/channelStore.ts
/**
 * Channel store
 * Manages channel data and state
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Channel, ChannelMember, ChannelGroupType } from "../../types";
import { channelService } from "../services/channelService";
import { createLoadingSlice } from "./storeUtils";

/**
 * Channel store state interface
 */
export interface ChannelState {
  // Data
  channelsByTeam: Record<string, Channel[]>;
  activeChannel: Channel | null;
  members: Record<string, ChannelMember[]>;
  lastFetchTimes: Record<string, number>;

  // Loading/Error state from common slice
  isLoading: boolean;
  loadingIds: string[];
  error: Error | null;
  errors: Record<string, Error | null>;

  // Actions
  setChannels: (teamId: string, channels: Channel[]) => void;
  setChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setChannelMembers: (channelId: string, members: ChannelMember[]) => void;
  updateChannel: (channel: Partial<Channel> & { id: string }) => void;
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

  // Reset
  reset: () => void;
}

/**
 * Channel store for managing channel data
 */
export const useChannelStore = create<ChannelState>()(
  immer((set, get) => ({
    // Initial state
    channelsByTeam: {},
    activeChannel: null,
    members: {},
    lastFetchTimes: {},

    // Include loading/error slice
    ...createLoadingSlice<any>(set),

    /**
     * Sets all channels for a team
     * @param teamId Team ID
     * @param channels Array of channels
     */
    setChannels: (teamId: string, channels: Channel[]) => {
      set((state) => {
        state.channelsByTeam[teamId] = channels;
        state.lastFetchTimes[teamId] = Date.now();

        // Clear loading state for this team
        state.loadingIds = state.loadingIds.filter(
          (id: string) => id !== teamId,
        );

        // Clear error state
        if (state.errors[teamId]) {
          delete state.errors[teamId];
        }
      });
    },

    /**
     * Sets a single channel in the store
     * @param channel Channel to set
     */
    setChannel: (channel: Channel) => {
      set((state) => {
        const teamId = channel.team_id;

        // Ensure team entry exists
        if (!state.channelsByTeam[teamId]) {
          state.channelsByTeam[teamId] = [];
        }

        // Check if channel already exists
        const existingIndex = state.channelsByTeam[teamId].findIndex(
          (c: Channel) => c.id === channel.id,
        );

        if (existingIndex !== -1) {
          // Update existing channel
          state.channelsByTeam[teamId][existingIndex] = channel;
        } else {
          // Add new channel
          state.channelsByTeam[teamId].push(channel);
        }

        // Update last fetch time
        state.lastFetchTimes[channel.id] = Date.now();

        // Clear loading state
        state.loadingIds = state.loadingIds.filter(
          (id: string) => id !== channel.id,
        );
      });
    },

    /**
     * Removes a channel from the store
     * @param channelId Channel ID to remove
     */
    removeChannel: (channelId: string) => {
      set((state) => {
        // Find the team that contains this channel
        let teamIdToUpdate: string | undefined;

        // Utiliser for...in au lieu de Object.entries pour préserver le type
        for (const teamId in state.channelsByTeam) {
          const channels = state.channelsByTeam[teamId];
          if (channels.some((c: Channel) => c.id === channelId)) {
            teamIdToUpdate = teamId;
            break;
          }
        }

        if (!teamIdToUpdate) return; // Channel not found

        // Remove the channel from the team
        state.channelsByTeam[teamIdToUpdate] = state.channelsByTeam[
          teamIdToUpdate
        ].filter((c: Channel) => c.id !== channelId);

        // Clear active channel if it was this one
        if (state.activeChannel?.id === channelId) {
          state.activeChannel = null;
        }

        // Clear members
        if (state.members[channelId]) {
          delete state.members[channelId];
        }
      });
    },

    /**
     * Sets the active channel
     * @param channel Channel to set as active
     */
    setActiveChannel: (channel: Channel | null) => {
      set((state) => {
        state.activeChannel = channel;
      });
    },

    /**
     * Sets members for a channel
     * @param channelId Channel ID
     * @param members Channel members
     */
    setChannelMembers: (channelId: string, members: ChannelMember[]) => {
      set((state) => {
        state.members[channelId] = members;
      });
    },

    /**
     * Updates a channel with partial data
     * @param channel Partial channel data with ID
     */
    updateChannel: (channel: Partial<Channel> & { id: string }) => {
      set((state) => {
        // Find the channel in all teams
        Object.entries(state.channelsByTeam).forEach((teamId) => {
          const channels = state.channelsByTeam[teamId];
          const channelIndex = channels.findIndex(
            (c: Channel) => c.id === channel.id,
          );

          if (channelIndex !== -1) {
            // Update channel
            state.channelsByTeam[teamId][channelIndex] = {
              ...state.channelsByTeam[teamId][channelIndex],
              ...channel,
            };

            // Update active channel if needed
            if (state.activeChannel?.id === channel.id) {
              state.activeChannel = {
                ...state.activeChannel,
                ...channel,
              };
            }
          }
        });
      });
    },

    /**
     * Sets a specific property on a channel
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
        Object.keys(state.channelsByTeam).forEach((teamId) => {
          const channels = state.channelsByTeam[teamId];
          const channelIndex = channels.findIndex(
            (c: Channel) => c.id === channelId,
          );

          if (channelIndex !== -1) {
            // Update specific property
            state.channelsByTeam[teamId][channelIndex][key] = value;

            // Update active channel if needed
            if (state.activeChannel?.id === channelId) {
              state.activeChannel = {
                ...state.activeChannel,
                [key]: value,
              };
            }
          }
        });
      });
    },

    /**
     * Gets a channel by ID
     * @param channelId Channel ID
     * @returns Channel or null if not found
     */
    getChannelById: (channelId: string): Channel | null => {
      // Search in all teams
      for (const channels of Object.values(get().channelsByTeam)) {
        const channel = channels.find((c) => c.id === channelId);
        if (channel) return channel;
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
      return channelService.getChannelsByGroupType(channels, type);
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
     * Resets the store to initial state
     */
    reset: () => {
      set((state) => {
        state.channelsByTeam = {};
        state.activeChannel = null;
        state.members = {};
        state.lastFetchTimes = {};
        state.isLoading = false;
        state.loadingIds = [];
        state.error = null;
        state.errors = {};
      });
    },
  })),
);

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
 * Helper to check if a channel is a direct message
 * @param channel Channel to check
 * @returns Whether channel is a direct message
 */
export function isDirectChannel(channel: Channel): boolean {
  return channelService.isDirectChannel(channel);
}

/**
 * Helper to check if a channel is a group message
 * @param channel Channel to check
 * @returns Whether channel is a group message
 */
export function isGroupChannel(channel: Channel): boolean {
  return channelService.isGroupChannel(channel);
}

/**
 * Helper to check if a channel is a direct or group message
 * @param channel Channel to check
 * @returns Whether channel is a direct or group message
 */
export function isDirectOrGroupChannel(channel: Channel): boolean {
  return channelService.isDirectOrGroupChannel(channel);
}
