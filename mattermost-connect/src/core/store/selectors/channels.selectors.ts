// src/core/store/selectors/channels.selectors.ts
/**
 * Sélecteurs pour l'état des canaux
 */

import { createSelector, createParameterizedSelector } from "../selector-utils";
import { RootState } from "../store.config";
import { Channel, ChannelGroupType } from "../../types/channels.types";

/**
 * Sélectionne l'état complet des canaux
 */
export const selectChannelsState = (state: RootState) => state.channels;

/**
 * Sélectionne les canaux par équipe
 */
export const selectChannelsByTeam = createSelector(
  selectChannelsState,
  (channelsState) => channelsState.channelsByTeam,
);

/**
 * Sélectionne le canal actif
 */
export const selectActiveChannel = createSelector(
  selectChannelsState,
  (channelsState) => channelsState.activeChannel,
);

/**
 * Sélectionne l'ID du canal actif
 */
export const selectActiveChannelId = createSelector(
  selectActiveChannel,
  (activeChannel) => activeChannel?.id || null,
);

/**
 * Sélectionne les états de chargement des canaux
 */
export const selectChannelsLoadingStates = createSelector(
  selectChannelsState,
  (channelsState) => channelsState.loadingStates,
);

/**
 * Sélectionne les erreurs de chargement des canaux
 */
export const selectChannelsErrors = createSelector(
  selectChannelsState,
  (channelsState) => channelsState.errors,
);

/**
 * Sélectionne les compteurs non lus de tous les canaux
 */
export const selectChannelsUnreadCounts = createSelector(
  selectChannelsState,
  (channelsState) => channelsState.unreadCounts,
);

/**
 * Sélectionne les utilisateurs en train de taper par canal
 */
export const selectTypingUsers = createSelector(
  selectChannelsState,
  (channelsState) => channelsState.typingUsers,
);

/**
 * Crée un sélecteur pour obtenir les canaux d'une équipe spécifique
 */
export const makeSelectChannelsByTeamId = createParameterizedSelector(
  (teamId: string) =>
    createSelector(
      selectChannelsByTeam,
      (channelsByTeam): Channel[] => channelsByTeam[teamId] || [],
    ),
);

/**
 * Crée un sélecteur pour filtrer les canaux d'une équipe par type
 */
export const makeSelectChannelsByType = createParameterizedSelector(
  (teamId: string, type: ChannelGroupType) =>
    createSelector(selectChannelsByTeam, (channelsByTeam): Channel[] => {
      const channels = channelsByTeam[teamId] || [];

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
    }),
);

/**
 * Crée un sélecteur pour obtenir un canal par son ID
 */
export const makeSelectChannelById = createParameterizedSelector(
  (channelId: string) =>
    createSelector(selectChannelsByTeam, (channelsByTeam): Channel | null => {
      // Rechercher dans tous les canaux de toutes les équipes
      for (const teamChannels of Object.values(channelsByTeam)) {
        const channel = teamChannels.find((c) => c.id === channelId);
        if (channel) {
          return channel;
        }
      }
      return null;
    }),
);

/**
 * Crée un sélecteur pour obtenir l'état de chargement d'une équipe
 */
export const makeSelectChannelsLoadingByTeamId = createParameterizedSelector(
  (teamId: string) =>
    createSelector(
      selectChannelsLoadingStates,
      (loadingStates): boolean => loadingStates[teamId] || false,
    ),
);

/**
 * Crée un sélecteur pour obtenir l'erreur de chargement d'une équipe
 */
export const makeSelectChannelsErrorByTeamId = createParameterizedSelector(
  (teamId: string) =>
    createSelector(
      selectChannelsErrors,
      (errors): Error | null => errors[teamId] || null,
    ),
);

/**
 * Crée un sélecteur pour obtenir les compteurs non lus d'un canal
 */
export const makeSelectChannelUnreadCount = createParameterizedSelector(
  (channelId: string) =>
    createSelector(
      selectChannelsUnreadCounts,
      (unreadCounts) =>
        unreadCounts[channelId] || { messageCount: 0, mentionCount: 0 },
    ),
);

/**
 * Crée un sélecteur pour obtenir les utilisateurs en train de taper dans un canal
 */
export const makeSelectTypingUsersByChannelId = createParameterizedSelector(
  (channelId: string) =>
    createSelector(
      selectTypingUsers,
      (typingUsers): string[] => typingUsers[channelId] || [],
    ),
);

/**
 * Sélectionne l'état des canaux pour le hook useChannels
 */
export const selectChannelsStateForHook = createSelector(
  selectChannelsByTeam,
  selectActiveChannel,
  selectChannelsLoadingStates,
  selectChannelsErrors,
  (channelsByTeam, activeChannel, loadingStates, errors) => ({
    channelsByTeam,
    activeChannel,
    loadingStates,
    errors,
  }),
);
