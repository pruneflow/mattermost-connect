// src/core/store/channelStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface Channel {
  id: string;
  team_id: string;
  name: string;
  display_name: string;
  type: "O" | "P" | "D" | "G";
  header?: string;
  purpose?: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  total_msg_count?: number;
  last_post_at?: number;
  is_favorite?: boolean;
}

export type ChannelGroupType =
  | "public"
  | "private"
  | "direct"
  | "group"
  | "favorite";

interface ChannelState {
  channelsByTeam: Record<string, Channel[]>;
  activeChannel: Channel | null;
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;
  lastFetchTimes: Record<string, number>;
}

interface ChannelActions {
  setChannels: (teamId: string, channels: Channel[]) => void;
  setChannel: (channel: Channel) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setLoading: (teamId: string, isLoading: boolean) => void;
  setError: (teamId: string, error: Error | null) => void;
  getChannelById: (channelId: string | null | undefined) => Channel | null;
  reset: () => void;
}

export const useChannelStore = create<ChannelState & ChannelActions>()(
  devtools((set, get) => ({
    channelsByTeam: {},
    activeChannel: null,
    loadingStates: {},
    errors: {},
    lastFetchTimes: {},

    setChannels: (teamId: string, channels: Channel[]) => {
      set(
        {
          channelsByTeam: {
            ...get().channelsByTeam,
            [teamId]: channels,
          },
          loadingStates: {
            ...get().loadingStates,
            [teamId]: false,
          },
          lastFetchTimes: {
            ...get().lastFetchTimes,
            [teamId]: Date.now(),
          },
          errors: {
            ...get().errors,
            [teamId]: null,
          },
        },
        false,
        "channels/setChannels",
      );
    },

    setChannel: (channel: Channel) => {
      const teamId = channel.team_id;
      const teamChannels = [...(get().channelsByTeam[teamId] || [])];
      const channelIndex = teamChannels.findIndex((c) => c.id === channel.id);

      if (channelIndex >= 0) {
        teamChannels[channelIndex] = channel;
      } else {
        teamChannels.push(channel);
      }

      set(
        {
          channelsByTeam: {
            ...get().channelsByTeam,
            [teamId]: teamChannels,
          },
        },
        false,
        "channels/setChannel",
      );
    },

    setActiveChannel: (channel: Channel | null) => {
      set({ activeChannel: channel }, false, "channels/setActiveChannel");
    },

    setLoading: (teamId: string, isLoading: boolean) => {
      set(
        {
          loadingStates: {
            ...get().loadingStates,
            [teamId]: isLoading,
          },
        },
        false,
        "channels/setLoading",
      );
    },

    setError: (teamId: string, error: Error | null) => {
      set(
        {
          errors: {
            ...get().errors,
            [teamId]: error,
          },
          loadingStates: {
            ...get().loadingStates,
            [teamId]: false,
          },
        },
        false,
        "channels/setError",
      );
    },

    getChannelById: (channelId: string | null | undefined): Channel | null => {
      if (!channelId) return null;

      const { channelsByTeam } = get();

      for (const teamChannels of Object.values(channelsByTeam)) {
        const channel = teamChannels.find((c) => c.id === channelId);
        if (channel) return channel;
      }

      return null;
    },

    reset: () => {
      set(
        {
          channelsByTeam: {},
          activeChannel: null,
          loadingStates: {},
          errors: {},
          lastFetchTimes: {},
        },
        false,
        "channels/reset",
      );
    },
  })),
);

export function getChannelsByType(
  teamId: string,
  type: ChannelGroupType,
): Channel[] {
  const channels = useChannelStore.getState().channelsByTeam[teamId] || [];

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
}
