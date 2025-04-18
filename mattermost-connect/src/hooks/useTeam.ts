// src/hooks/useTeam.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { Team, Channel } from "../types";
import { useMattermost } from "../context";
import { assertServiceInitialized } from "../services/factory";

/**
 * Options pour le hook useTeam
 */
interface UseTeamOptions {
  /** Inclure les canaux de l'équipe (défaut: true) */
  includeChannels?: boolean;

  /** Précharger les utilisateurs impliqués dans les messages directs (défaut: true) */
  preloadDirectMessageUsers?: boolean;

  /** Précharger l'état des messages non lus pour tous les canaux (défaut: true) */
  preloadUnreadStates?: boolean;

  /** Intervalle de rafraîchissement des canaux en ms (défaut: 0 - désactivé) */
  refreshInterval?: number;

  /** Callback appelé lorsque le changement d'équipe est terminé */
  onTeamChange?: (team: Team) => void;
}

/**
 * État de retour du hook useTeam
 */
interface UseTeamState {
  /** L'équipe active */
  team: Team | null;

  /** État de chargement de l'équipe */
  loading: boolean;

  /** Erreur éventuelle lors du chargement de l'équipe */
  error: Error | null;

  /** Liste des canaux de l'équipe */
  channels: Channel[];

  /** État de chargement des canaux */
  loadingChannels: boolean;

  /** Erreur éventuelle lors du chargement des canaux */
  channelsError: Error | null;

  /** Nombre total de messages non lus dans l'équipe */
  unreadMessagesCount: number;

  /** Nombre total de mentions dans l'équipe */
  unreadMentionsCount: number;
}

/**
 * Hook personnalisé pour interagir avec une équipe Mattermost
 *
 * @param teamId ID de l'équipe à utiliser
 * @param options Options de configuration
 * @returns État et fonctions pour interagir avec l'équipe
 */
export function useTeam(teamId: string | null, options: UseTeamOptions = {}) {
  // Options avec valeurs par défaut
  const {
    includeChannels = true,
    preloadDirectMessageUsers = true,
    preloadUnreadStates = true,
    refreshInterval = 0,
    onTeamChange,
  } = options;

  // Contexte Mattermost
  const { services, activeTeam, setActiveTeam, initializeTeamUnreadStates } =
    useMattermost();

  // États locaux
  const [team, setTeam] = useState<Team | null>(
    activeTeam && activeTeam.id === teamId ? activeTeam : null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [channelsError, setChannelsError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Compteurs de messages non lus et de mentions
  const [unreadStats, setUnreadStats] = useState<{
    unreadMessagesCount: number;
    unreadMentionsCount: number;
  }>({
    unreadMessagesCount: 0,
    unreadMentionsCount: 0,
  });

  // Fonction pour charger les informations de l'équipe
  const loadTeam = useCallback(async () => {
    if (!teamId || !services) return;

    assertServiceInitialized(services.mattermostService, "mattermostService");

    setLoading(true);
    setError(null);

    try {
      const teamData = await services.mattermostService.getTeam(teamId);
      setTeam(teamData);

      // Si cette équipe n'est pas déjà l'équipe active, la définir
      if (!activeTeam || activeTeam.id !== teamId) {
        setActiveTeam(teamData);
      }

      // Appeler le callback si fourni
      if (onTeamChange) {
        onTeamChange(teamData);
      }
    } catch (err) {
      console.error(`Erreur lors du chargement de l'équipe ${teamId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [teamId, services, activeTeam, setActiveTeam, onTeamChange]);

  // Fonction pour charger les canaux de l'équipe
  const loadChannels = useCallback(async () => {
    if (!teamId || !services || !includeChannels) return;

    assertServiceInitialized(services.mattermostService, "mattermostService");
    assertServiceInitialized(services.userService, "userService");

    setLoadingChannels(true);
    setChannelsError(null);

    try {
      const channelsList = await services.mattermostService.getChannels(teamId);
      setChannels(channelsList);
      setLastFetchTime(Date.now());

      // Précharger les utilisateurs des messages directs
      if (preloadDirectMessageUsers) {
        const directChannels = channelsList.filter(
          (channel) => channel.type === "D" || channel.type === "G",
        );

        if (directChannels.length > 0) {
          void services.userService.loadUsersForDirectChannels(directChannels);
        }
      }

      // Précharger les états non lus
      if (preloadUnreadStates) {
        void initializeTeamUnreadStates(teamId, channelsList);
      }

      // Charger les utilisateurs de l'équipe en arrière-plan
      void services.userService.loadTeamUsers(teamId);

      // Tenter de récupérer les statistiques de non-lus globales
      try {
        if (
          typeof (services.mattermostService as any).getTeamUnreadCount ===
          "function"
        ) {
          const unreadData = await (
            services.mattermostService as any
          ).getTeamUnreadCount(teamId);

          setUnreadStats({
            unreadMessagesCount: unreadData.msg_count || 0,
            unreadMentionsCount: unreadData.mention_count || 0,
          });
        }
      } catch (unreadError) {
        console.warn(
          `Impossible de récupérer les statistiques non lues pour l'équipe ${teamId}:`,
          unreadError,
        );
      }
    } catch (err) {
      console.error(
        `Erreur lors du chargement des canaux pour l'équipe ${teamId}:`,
        err,
      );
      setChannelsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingChannels(false);
    }
  }, [
    teamId,
    services,
    includeChannels,
    preloadDirectMessageUsers,
    preloadUnreadStates,
    initializeTeamUnreadStates,
  ]);

  // Fonction pour trier les canaux par catégorie
  const getChannelsByType = useCallback(
    (type: "public" | "private" | "direct" | "group" | "favorite") => {
      if (!channels.length) return [];

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
    [channels],
  );

  // Fonction pour obtenir un canal par son ID
  const getChannelById = useCallback(
    (channelId: string): Channel | undefined => {
      return channels.find((c) => c.id === channelId);
    },
    [channels],
  );

  // Fonction pour obtenir un canal par son nom
  const getChannelByName = useCallback(
    (channelName: string): Channel | undefined => {
      return channels.find((c) => c.name === channelName);
    },
    [channels],
  );

  // Charger l'équipe quand l'ID change
  useEffect(() => {
    if (teamId) {
      void loadTeam();
    } else {
      setTeam(null);
      setError(null);
    }
  }, [teamId, loadTeam]);

  // Charger les canaux quand l'équipe change ou quand includeChannels change
  useEffect(() => {
    if (teamId && includeChannels) {
      void loadChannels();
    } else if (!includeChannels) {
      setChannels([]);
      setChannelsError(null);
    }
  }, [teamId, includeChannels, loadChannels]);

  // Configurer le rafraîchissement périodique des canaux si demandé
  useEffect(() => {
    if (
      !refreshInterval ||
      refreshInterval <= 0 ||
      !teamId ||
      !includeChannels
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      // Ne charger que si le dernier chargement date d'au moins refreshInterval ms
      const now = Date.now();
      if (now - lastFetchTime >= refreshInterval) {
        void loadChannels();
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [teamId, includeChannels, refreshInterval, lastFetchTime, loadChannels]);

  // Calculer les statistiques par type de canal
  const stats = useMemo(() => {
    return {
      publicChannelsCount: channels.filter((c) => c.type === "O").length,
      privateChannelsCount: channels.filter((c) => c.type === "P").length,
      directMessagesCount: channels.filter((c) => c.type === "D").length,
      groupMessagesCount: channels.filter((c) => c.type === "G").length,
      favoriteChannelsCount: channels.filter((c) => c.is_favorite).length,
    };
  }, [channels]);

  // État combiné à retourner
  const state: UseTeamState = {
    team,
    loading,
    error,
    channels,
    loadingChannels,
    channelsError,
    unreadMessagesCount: unreadStats.unreadMessagesCount,
    unreadMentionsCount: unreadStats.unreadMentionsCount,
  };

  // Retourner l'état, les fonctions et les statistiques
  return {
    ...state,
    ...stats,
    loadTeam,
    loadChannels,
    getChannelsByType,
    getChannelById,
    getChannelByName,
  };
}

export default useTeam;
