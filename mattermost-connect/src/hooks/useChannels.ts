// src/hooks/useChannels.ts
/**
 * Hook pour la gestion des canaux
 */
import { useCallback } from "react";
import { useStoreSelector } from "./useStoreSelector";
import { useStoreDispatch } from "./useStoreDispatch";
import { getServices } from "../core/services";
import {
  getChannels,
  getChannel,
  selectChannel,
  viewChannel,
} from "../core/store/thunks/channels.thunks";
import { Channel } from "../core/store/slices/channels.slice";

interface UseChannelsReturnType {
  // État
  channelsByTeam: Record<string, Channel[]>;
  activeChannel: Channel | null;
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;

  // Actions
  loadChannels: (teamId: string, forceRefresh?: boolean) => Promise<Channel[]>;
  loadChannel: (
    channelId: string,
    forceRefresh?: boolean,
  ) => Promise<Channel | null>;
  selectChannel: (channel: Channel | null) => Promise<Channel | null>;
  markAsRead: (channelId: string) => Promise<boolean>;

  // Utilitaires
  getChannelsByType: (
    teamId: string,
    type: "public" | "private" | "direct" | "group" | "favorite",
  ) => Channel[];
  getChannelUnreadCount: (channelId: string) => {
    messageCount: number;
    mentionCount: number;
  };
  getTypingUsers: (channelId: string) => string[];
}

export function useChannels(): UseChannelsReturnType {
  const dispatch = useStoreDispatch();
  const { apiClient, cacheService } = getServices();

  // Sélectionner les données de canaux du store
  const channelsState = useStoreSelector((state) => state.channels);

  // Action pour charger les canaux d'une équipe
  const loadChannels = useCallback(
    async (teamId: string, forceRefresh: boolean = false) => {
      return dispatch(
        getChannels(apiClient, cacheService, teamId, { forceRefresh }),
      );
    },
    [dispatch, apiClient, cacheService],
  );

  // Action pour charger un canal spécifique
  const loadChannel = useCallback(
    async (channelId: string, forceRefresh: boolean = false) => {
      return dispatch(
        getChannel(apiClient, cacheService, channelId, { forceRefresh }),
      );
    },
    [dispatch, apiClient, cacheService],
  );

  // Action pour sélectionner un canal
  const selectChannelAction = useCallback(
    async (channel: Channel | null) => {
      return dispatch(selectChannel(channel, apiClient));
    },
    [dispatch, apiClient],
  );

  // Action pour marquer un canal comme lu
  const markAsRead = useCallback(
    async (channelId: string) => {
      return dispatch(viewChannel(apiClient, channelId));
    },
    [dispatch, apiClient],
  );

  // Fonction pour filtrer les canaux par type
  const getChannelsByType = useCallback(
    (
      teamId: string,
      type: "public" | "private" | "direct" | "group" | "favorite",
    ) => {
      const channels = channelsState.channelsByTeam[teamId] || [];

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
    [channelsState.channelsByTeam],
  );

  // Fonction pour obtenir les compteurs non lus d'un canal
  const getChannelUnreadCount = useCallback(
    (channelId: string) => {
      const unread = channelsState.unreadCounts[channelId] || {
        messageCount: 0,
        mentionCount: 0,
      };
      return {
        messageCount: unread.messageCount,
        mentionCount: unread.mentionCount,
      };
    },
    [channelsState.unreadCounts],
  );

  // Fonction pour obtenir les utilisateurs en train de taper dans un canal
  const getTypingUsers = useCallback(
    (channelId: string) => {
      return channelsState.typingUsers[channelId] || [];
    },
    [channelsState.typingUsers],
  );

  return {
    // État
    channelsByTeam: channelsState.channelsByTeam,
    activeChannel: channelsState.activeChannel,
    loadingStates: channelsState.loadingStates,
    errors: channelsState.errors,

    // Actions
    loadChannels,
    loadChannel,
    selectChannel: selectChannelAction,
    markAsRead,

    // Utilitaires
    getChannelsByType,
    getChannelUnreadCount,
    getTypingUsers,
  };
}
