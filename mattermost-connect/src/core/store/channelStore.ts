// src/core/store/channelStore.ts
/**
 * Channel store
 * Manages channel data and state
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Channel,
  ChannelMember,
  ChannelGroupType,
  EventType,
  ErrorSource,
  ChannelState,
} from "../../types";
import { channelService } from "../services/channelService";
import { createCommonSlice } from "./slices/commonSlice";
import { emitEvent } from "../api/eventUtils";
import { handleError } from "./errorStore";

/**
 * Channel store for managing channel data
 * Uses immer middleware for immutable state updates
 * Uses subscribeWithSelector for observing state changes
 */
export const useChannelStore = create<
  ChannelState & {
    // Actions - Channel Data
    setChannels: (teamId: string, channels: Channel[]) => void;
    setChannel: (channel: Channel) => void;
    removeChannel: (channelId: string) => void;
    setActiveChannel: (channel: Channel | null) => void;
    updateChannel: (channel: Partial<Channel> & { id: string }) => void;
    setChannelProperty: <K extends keyof Channel>(
      channelId: string,
      key: K,
      value: Channel[K],
    ) => void;

    // Actions - Channel Members
    setChannelMembers: (channelId: string, members: ChannelMember[]) => void;

    // Selectors
    getChannelById: (channelId: string) => Channel | null;
    getChannelsByTeam: (teamId: string) => Channel[];
    getChannelsByType: (teamId: string, type: ChannelGroupType) => Channel[];
    getChannelMembers: (channelId: string) => ChannelMember[];

    // Reset
    reset: () => void;
  }
>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<ChannelState>(set);

      return {
        // Include common slice for standardized state
        ...commonSlice,

        // Initial state
        channelsByTeam: {},
        activeChannel: null,
        members: {},

        /**
         * Sets all channels for a team
         * @param teamId Team ID
         * @param channels Array of channels
         */
        setChannels: (teamId: string, channels: Channel[]) => {
          try {
            set((state) => {
              state.channelsByTeam[teamId] = channels;
              state.lastFetchTimes[teamId] = Date.now();
              state.lastUpdated = Date.now();

              // Clear loading state for this team
              state.loadingIds = state.loadingIds.filter(
                (id: string) => id !== teamId,
              );

              // Clear error state
              if (state.errors[teamId]) {
                delete state.errors[teamId];
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setChannels",
              teamId,
              channelCount: channels.length,
            });
          }
        },

        /**
         * Sets a single channel in the store
         * @param channel Channel to set
         */
        setChannel: (channel: Channel) => {
          try {
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

                // Emit channel created event
                emitEvent(EventType.CHANNEL_CREATED, {
                  channel,
                  teamId: channel.team_id,
                });
              }

              // Update last fetch time
              state.lastFetchTimes[channel.id] = Date.now();
              state.lastUpdated = Date.now();

              // Clear loading state
              state.loadingIds = state.loadingIds.filter(
                (id: string) => id !== channel.id,
              );
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setChannel",
              channelId: channel.id,
            });
          }
        },

        /**
         * Removes a channel from the store
         * @param channelId Channel ID to remove
         */
        removeChannel: (channelId: string) => {
          try {
            set((state) => {
              // Find the team that contains this channel
              let teamIdToUpdate: string | undefined;
              let channelToRemove: Channel | undefined;

              // Utiliser for...in au lieu de Object.entries pour préserver le type
              for (const teamId in state.channelsByTeam) {
                const channels = state.channelsByTeam[teamId];
                const channelIndex = channels.findIndex(
                  (c: Channel) => c.id === channelId,
                );

                if (channelIndex !== -1) {
                  teamIdToUpdate = teamId;
                  channelToRemove = channels[channelIndex];
                  break;
                }
              }

              if (!teamIdToUpdate || !channelToRemove) return; // Channel not found

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

              // Clean up fetch times
              delete state.lastFetchTimes[channelId];

              state.lastUpdated = Date.now();

              // Emit channel deleted event
              emitEvent(EventType.CHANNEL_DELETED, {
                channelId,
                channel: channelToRemove,
                teamId: teamIdToUpdate,
              });
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "removeChannel",
              channelId,
            });
          }
        },

        /**
         * Sets the active channel
         * @param channel Channel to set as active
         */
        setActiveChannel: (channel: Channel | null) => {
          try {
            set((state) => {
              // Skip if no change
              if (channel?.id === state.activeChannel?.id) {
                return;
              }

              const previousChannel = state.activeChannel;
              state.activeChannel = channel;
              state.lastUpdated = Date.now();

              // Emit channel selected event
              if (channel) {
                emitEvent(EventType.CHANNEL_SELECTED, {
                  channel,
                  previousChannel,
                });
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setActiveChannel",
              channelId: channel?.id,
            });
          }
        },

        /**
         * Sets members for a channel
         * @param channelId Channel ID
         * @param members Channel members
         */
        setChannelMembers: (channelId: string, members: ChannelMember[]) => {
          try {
            set((state) => {
              state.members[channelId] = members;
              state.lastFetchTimes[`members_${channelId}`] = Date.now();
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setChannelMembers",
              channelId,
              memberCount: members.length,
            });
          }
        },

        /**
         * Updates a channel with partial data
         * @param channel Partial channel data with ID
         */
        updateChannel: (channel: Partial<Channel> & { id: string }) => {
          try {
            set((state) => {
              // Find the channel in all teams
              Object.keys(state.channelsByTeam).forEach((teamId) => {
                const channels = state.channelsByTeam[teamId];
                const channelIndex = channels.findIndex(
                  (c: Channel) => c.id === channel.id,
                );

                if (channelIndex !== -1) {
                  // Get the existing channel for event emission
                  const previousChannel = { ...channels[channelIndex] };

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

                  // Update fetch time
                  state.lastFetchTimes[channel.id] = Date.now();

                  // Emit channel updated event
                  emitEvent(EventType.CHANNEL_UPDATED, {
                    channel: state.channelsByTeam[teamId][channelIndex],
                    previousChannel,
                    teamId,
                  });
                }
              });

              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "updateChannel",
              channelId: channel.id,
            });
          }
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
          try {
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

                  // Update fetch time
                  state.lastFetchTimes[channelId] = Date.now();
                }
              });

              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setChannelProperty",
              channelId,
              key: String(key),
            });
          }
        },

        /**
         * Gets a channel by ID
         * @param channelId Channel ID
         * @returns Channel or null if not found
         */
        getChannelById: (channelId: string): Channel | null => {
          try {
            // Search in all teams
            for (const channels of Object.values(get().channelsByTeam)) {
              const channel = channels.find((c) => c.id === channelId);
              if (channel) return channel;
            }

            return null;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getChannelById",
              channelId,
            });
            return null;
          }
        },

        /**
         * Gets all channels for a team
         * @param teamId Team ID
         * @returns Array of channels
         */
        getChannelsByTeam: (teamId: string): Channel[] => {
          try {
            return get().channelsByTeam[teamId] || [];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getChannelsByTeam",
              teamId,
            });
            return [];
          }
        },

        /**
         * Gets channels of a specific type for a team
         * @param teamId Team ID
         * @param type Channel group type
         * @returns Filtered channels
         */
        getChannelsByType: (
          teamId: string,
          type: ChannelGroupType,
        ): Channel[] => {
          try {
            const channels = get().channelsByTeam[teamId] || [];
            return channelService.getChannelsByGroupType(channels, type);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getChannelsByType",
              teamId,
              type,
            });
            return [];
          }
        },

        /**
         * Gets members for a channel
         * @param channelId Channel ID
         * @returns Array of channel members
         */
        getChannelMembers: (channelId: string): ChannelMember[] => {
          try {
            return get().members[channelId] || [];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getChannelMembers",
              channelId,
            });
            return [];
          }
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          try {
            set((state) => {
              // Reset domain-specific state
              state.channelsByTeam = {};
              state.activeChannel = null;
              state.members = {};

              // Reset common state from CommonSlice
              state.isLoading = false;
              state.loadingIds = [];
              state.error = null;
              state.errors = {};
              state.lastFetchTimes = {};
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "reset",
            });
          }
        },
      };
    }),
  ),
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

/**
 * Get channel display name using channelService
 * @param channel Channel to format
 * @param currentUserId Current user ID
 * @returns Formatted display name
 */
export function getChannelDisplayName(
  channel: Channel,
  currentUserId: string,
): string {
  try {
    if (isDirectChannel(channel)) {
      // Get users at execution time to avoid circular dependencies
      const { useUserStore } = require("./userStore");
      const { byId: users } = useUserStore.getState();
      const otherUserId = channelService.getOtherUserIdFromDirectChannel(
        channel.name,
        currentUserId,
      );
      if (!otherUserId) return "Direct Message";
      const otherUser = users[otherUserId];
      return channelService.getDirectChannelDisplayName(
        otherUser,
        "Direct Message",
      );
    }

    return channel.display_name;
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getChannelDisplayName",
      channelId: channel.id,
    });
    return channel.display_name || "Channel";
  }
}
