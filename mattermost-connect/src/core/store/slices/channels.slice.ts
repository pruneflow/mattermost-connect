// src/core/store/slices/channels.slice.ts
/**
 * Slice pour la gestion des canaux
 */
import { createReducer, createAction } from "../store";

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
  mention_count?: number;
}

export interface ChannelUnreadCount {
  messageCount: number;
  mentionCount: number;
  lastMessageId?: string;
  lastViewedAt?: number;
}

export interface ChannelsState {
  // Canaux par équipe
  channelsByTeam: Record<string, Channel[]>;
  // Canal actif
  activeChannel: Channel | null;
  // État de chargement par équipe
  loadingStates: Record<string, boolean>;
  // Erreurs par équipe
  errors: Record<string, Error | null>;
  // Timestamps du dernier chargement par équipe
  lastFetchTimes: Record<string, number>;
  // Compteurs non lus par canal
  unreadCounts: Record<string, ChannelUnreadCount>;
  // Utilisateurs en train de taper par canal
  typingUsers: Record<string, string[]>;
}

// État initial
const initialState: ChannelsState = {
  channelsByTeam: {},
  activeChannel: null,
  loadingStates: {},
  errors: {},
  lastFetchTimes: {},
  unreadCounts: {},
  typingUsers: {},
};

// Actions
export const fetchChannels = createAction<{ teamId: string }>(
  "CHANNELS_FETCH_REQUEST",
);
export const fetchChannelsSuccess = createAction<{
  teamId: string;
  channels: Channel[];
}>("CHANNELS_FETCH_SUCCESS");
export const fetchChannelsError = createAction<{
  teamId: string;
  error: Error;
}>("CHANNELS_FETCH_ERROR");

export const fetchChannel = createAction<{ channelId: string }>(
  "CHANNEL_FETCH_REQUEST",
);
export const fetchChannelSuccess = createAction<{ channel: Channel }>(
  "CHANNEL_FETCH_SUCCESS",
);
export const fetchChannelError = createAction<{
  channelId: string;
  error: Error;
}>("CHANNEL_FETCH_ERROR");

export const setActiveChannel = createAction<{ channel: Channel | null }>(
  "CHANNELS_SET_ACTIVE",
);
export const markChannelAsRead = createAction<{ channelId: string }>(
  "CHANNELS_MARK_AS_READ",
);

export const setChannelUnreadCount = createAction<{
  channelId: string;
  messageCount: number;
  mentionCount: number;
  lastMessageId?: string;
  lastViewedAt?: number;
}>("CHANNELS_SET_UNREAD_COUNT");

export const updateTypingUsers = createAction<{
  channelId: string;
  userIds: string[];
}>("CHANNELS_UPDATE_TYPING_USERS");

// Reducer
export const channelsReducer = createReducer<ChannelsState>(initialState, {
  // Chargement des canaux
  [fetchChannels.type]: (state, payload) => ({
    ...state,
    loadingStates: {
      ...state.loadingStates,
      [payload.teamId]: true,
    },
    errors: {
      ...state.errors,
      [payload.teamId]: null,
    },
  }),

  [fetchChannelsSuccess.type]: (state, payload) => ({
    ...state,
    channelsByTeam: {
      ...state.channelsByTeam,
      [payload.teamId]: payload.channels,
    },
    loadingStates: {
      ...state.loadingStates,
      [payload.teamId]: false,
    },
    lastFetchTimes: {
      ...state.lastFetchTimes,
      [payload.teamId]: Date.now(),
    },
  }),

  [fetchChannelsError.type]: (state, payload) => ({
    ...state,
    loadingStates: {
      ...state.loadingStates,
      [payload.teamId]: false,
    },
    errors: {
      ...state.errors,
      [payload.teamId]: payload.error,
    },
  }),

  // Chargement d'un canal spécifique
  [fetchChannelSuccess.type]: (state, payload) => {
    const channel = payload.channel;
    const teamId = channel.team_id;

    // Vérifie si l'équipe existe déjà dans channelsByTeam
    if (!state.channelsByTeam[teamId]) {
      return {
        ...state,
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: [channel],
        },
      };
    }

    // Vérifie si le canal existe déjà dans l'équipe
    const existingChannelIndex = state.channelsByTeam[teamId].findIndex(
      (c) => c.id === channel.id,
    );

    if (existingChannelIndex === -1) {
      // Ajoute le canal s'il n'existe pas
      return {
        ...state,
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: [...state.channelsByTeam[teamId], channel],
        },
      };
    } else {
      // Met à jour le canal s'il existe déjà
      const updatedChannels = [...state.channelsByTeam[teamId]];
      updatedChannels[existingChannelIndex] = channel;

      return {
        ...state,
        channelsByTeam: {
          ...state.channelsByTeam,
          [teamId]: updatedChannels,
        },
      };
    }
  },

  // Définition du canal actif
  [setActiveChannel.type]: (state, payload) => ({
    ...state,
    activeChannel: payload.channel,
  }),

  // Marquer un canal comme lu
  [markChannelAsRead.type]: (state, payload) => ({
    ...state,
    unreadCounts: {
      ...state.unreadCounts,
      [payload.channelId]: {
        ...state.unreadCounts[payload.channelId],
        messageCount: 0,
        mentionCount: 0,
        lastViewedAt: Date.now(),
      },
    },
  }),

  // Mise à jour des compteurs non lus
  [setChannelUnreadCount.type]: (state, payload) => ({
    ...state,
    unreadCounts: {
      ...state.unreadCounts,
      [payload.channelId]: {
        messageCount: payload.messageCount,
        mentionCount: payload.mentionCount,
        lastMessageId: payload.lastMessageId,
        lastViewedAt: payload.lastViewedAt,
      },
    },
  }),

  // Mise à jour des utilisateurs en train de taper
  [updateTypingUsers.type]: (state, payload) => ({
    ...state,
    typingUsers: {
      ...state.typingUsers,
      [payload.channelId]: payload.userIds,
    },
  }),

  // Réinitialiser l'état lors de la déconnexion
  AUTH_LOGOUT: () => ({
    ...initialState,
  }),
});
