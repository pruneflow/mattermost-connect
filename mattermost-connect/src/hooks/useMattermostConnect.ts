// src/hooks/useMattermostConnect.ts
import { useMemo, useState, useEffect, useCallback } from "react";
import { useMattermost } from "../context";
import { useAuth } from "./useAuth";
import { useTeam } from "./useTeam";
import { useChannel } from "./useChannel";
import { useRealtime } from "./useRealtime";
import { useFile } from "./useFile";
import { assertServiceInitialized } from "../services";
import { Channel, Team, User, Message } from "../types";
import { WebSocketEventType } from "../services/notification/notification.service";

/**
 * Options pour le hook useMattermostConnect
 */
interface UseMattermostConnectOptions {
  /** ID de l'équipe à charger automatiquement */
  teamId?: string;

  /** ID du canal à charger automatiquement */
  channelId?: string;

  /** Activer les mises à jour en temps réel */
  enableRealtime?: boolean;

  /** Intervalle de rafraîchissement des données en ms (0 pour désactiver) */
  refreshInterval?: number;

  /** Précharger les états non lus pour tous les canaux */
  preloadUnreadStates?: boolean;

  /** Précharger les utilisateurs des messages directs */
  preloadDirectMessageUsers?: boolean;

  /** Stocke les tokens d'authentification entre les sessions */
  persistAuth?: boolean;
}

/**
 * État de retour du hook useMattermostConnect
 */
interface UseMattermostConnectState {
  /** État d'authentification */
  auth: {
    /** Indique si l'utilisateur est authentifié */
    isAuthenticated: boolean;
    /** Indique si l'authentification est en cours */
    isAuthenticating: boolean;
    /** Erreur d'authentification éventuelle */
    error: Error | null;
  };

  /** État de connexion */
  connection: {
    /** Indique si la connexion WebSocket est active */
    isConnected: boolean;
    /** Indique si une connexion est en cours d'établissement */
    isConnecting: boolean;
    /** Mode de connexion actuel */
    mode: "direct" | "proxy" | "custom" | null;
  };

  /** État de l'équipe */
  team: {
    /** Équipe active */
    current: Team | null;
    /** Liste des équipes disponibles */
    teams: Team[];
    /** État de chargement des équipes */
    loading: boolean;
    /** Erreur éventuelle lors du chargement des équipes */
    error: Error | null;
    /** Canaux de l'équipe active */
    channels: Channel[];
    /** État de chargement des canaux */
    loadingChannels: boolean;
  };

  /** État du canal */
  channel: {
    /** Canal actif */
    current: Channel | null;
    /** Messages du canal actif */
    messages: Message[];
    /** État de chargement des messages */
    loadingMessages: boolean;
    /** Erreur éventuelle lors du chargement des messages */
    error: Error | null;
    /** Utilisateurs en train de taper dans le canal */
    typingUsers: string[];
    /** Texte formaté indiquant qui est en train de taper */
    typingIndicator: string;
  };

  /** État de l'utilisateur */
  user: {
    /** Utilisateur courant */
    current: User | null;
    /** Tous les utilisateurs connus */
    users: Record<string, User>;
  };

  /** État des notifications */
  notifications: {
    /** Nombre total de messages non lus dans tous les canaux */
    unreadMessagesCount: number;
    /** Nombre total de mentions dans tous les canaux */
    unreadMentionsCount: number;
    /** État des messages non lus par canal */
    unreadByChannel: Record<
      string,
      {
        msg_count: number;
        mention_count: number;
      }
    >;
  };
}

/**
 * Hook principal fournissant une façade unifiée pour toutes les fonctionnalités MattermostConnect
 *
 * Combine plusieurs hooks spécialisés pour offrir une API simple et cohérente
 *
 * @param options Options de configuration
 * @returns État et fonctions pour interagir avec Mattermost
 */
export function useMattermostConnect(
  options: UseMattermostConnectOptions = {},
) {
  // Options avec valeurs par défaut
  const {
    teamId,
    channelId,
    enableRealtime = true,
    refreshInterval = 0,
    preloadUnreadStates = true,
    preloadDirectMessageUsers = true,
    persistAuth = false,
  } = options;

  // Utiliser les hooks spécialisés
  const mattermost = useMattermost();
  const { services, knownUsers, error: connectionError } = mattermost;

  const auth = useAuth({ storeToken: persistAuth });
  const realtime = useRealtime({ bufferEvents: true });
  const file = useFile();

  // État pour les équipes disponibles
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState<Error | null>(null);

  // État pour les statistiques globales
  const [globalStats, setGlobalStats] = useState({
    unreadMessagesCount: 0,
    unreadMentionsCount: 0,
  });

  // Hook useTeam avec l'ID d'équipe fourni
  const team = useTeam(teamId || null, {
    includeChannels: true,
    preloadDirectMessageUsers,
    preloadUnreadStates,
    refreshInterval,
  });

  // Hook useChannel avec l'ID de canal fourni
  const channel = useChannel(channelId || null, {
    includeMessages: true,
    refreshInterval,
  });

  /**
   * Charge la liste des équipes disponibles
   */
  const loadTeams = useCallback(async () => {
    if (!services || !services.mattermostService) return;

    assertServiceInitialized(services.mattermostService, "mattermostService");

    setLoadingTeams(true);
    setTeamsError(null);

    try {
      const availableTeams = await services.mattermostService.getTeams();
      setTeams(availableTeams);
    } catch (err) {
      console.error("Erreur lors du chargement des équipes:", err);
      setTeamsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingTeams(false);
    }
  }, [services]);

  /**
   * Change l'équipe active
   */
  const switchTeam = useCallback(
    (teamIdOrTeam: string | Team) => {
      const newTeamId =
        typeof teamIdOrTeam === "string" ? teamIdOrTeam : teamIdOrTeam.id;

      if (team.team?.id !== newTeamId) {
        // Appeler loadTeam du hook useTeam
        team.loadTeam();
      }
    },
    [team],
  );

  /**
   * Change le canal actif
   */
  const switchChannel = useCallback(
    (channelIdOrChannel: string | Channel) => {
      const newChannelId =
        typeof channelIdOrChannel === "string"
          ? channelIdOrChannel
          : channelIdOrChannel.id;

      if (channel.channel?.id !== newChannelId) {
        // Appeler loadChannel du hook useChannel
        channel.loadChannel();

        // Marquer automatiquement le canal comme lu
        setTimeout(() => {
          channel.markAsRead();
        }, 1000);
      }
    },
    [channel],
  );

  /**
   * Envoie un message dans le canal actif
   */
  const sendMessage = useCallback(
    async (message: string, fileIds?: string[]): Promise<Message | null> => {
      return channel.sendMessage(message, fileIds);
    },
    [channel],
  );

  /**
   * Répond à un message dans le canal actif
   */
  const replyToMessage = useCallback(
    async (
      messageId: string,
      message: string,
      fileIds?: string[],
    ): Promise<Message | null> => {
      return channel.replyToMessage(messageId, message, fileIds);
    },
    [channel],
  );

  /**
   * Télécharge des fichiers pour le canal actif
   */
  const uploadFiles = useCallback(async (): Promise<string[]> => {
    const uploadedFiles = await file.uploadFiles();
    return uploadedFiles.map((fileInfo) => fileInfo.id);
  }, [file]);

  /**
   * Met à jour les statistiques globales en agrégeant les états non lus
   */
  const updateGlobalStats = useCallback(() => {
    if (!services || !services.notificationService) return;

    const unreadState = services.notificationService.getUnreadState();

    let totalUnread = 0;
    let totalMentions = 0;

    Object.values(unreadState).forEach((state) => {
      totalUnread += state.msg_count || 0;
      totalMentions += state.mention_count || 0;
    });

    setGlobalStats({
      unreadMessagesCount: totalUnread,
      unreadMentionsCount: totalMentions,
    });
  }, [services]);

  // Charger les équipes au démarrage et quand le service change
  useEffect(() => {
    if (services && services.mattermostService && auth.isAuthenticated) {
      void loadTeams();
    }
  }, [services, auth.isAuthenticated, loadTeams]);

  // S'abonner aux mises à jour d'état non lu pour les statistiques globales
  useEffect(() => {
    if (!services || !services.notificationService || !enableRealtime) return;

    // Mettre à jour les statistiques immédiatement
    updateGlobalStats();

    // S'abonner aux mises à jour d'état non lu
    const unsubscribe = services.notificationService.addEventListener(
      "unread_updated",
      updateGlobalStats,
    );

    return unsubscribe;
  }, [services, enableRealtime, updateGlobalStats]);

  // Configurer les écouteurs WebSocket si enableRealtime est true
  useEffect(() => {
    if (!enableRealtime) return;

    // S'abonner aux événements WebSocket pertinents
    const unsubscribe = realtime.addEventListeners({
      [WebSocketEventType.POSTED]: () => channel.loadMessages(),
      [WebSocketEventType.POST_EDITED]: () => channel.loadMessages(),
      [WebSocketEventType.POST_DELETED]: () => channel.loadMessages(),
      [WebSocketEventType.CHANNEL_UPDATED]: () => team.loadChannels(),
      [WebSocketEventType.CHANNEL_CREATED]: () => team.loadChannels(),
      [WebSocketEventType.CHANNEL_DELETED]: () => team.loadChannels(),
    });

    return unsubscribe;
  }, [enableRealtime, realtime, channel, team]);

  // Construire l'état combiné
  const state: UseMattermostConnectState = useMemo(
    () => ({
      auth: {
        isAuthenticated: auth.isAuthenticated,
        isAuthenticating: auth.isAuthenticating,
        error: auth.error,
      },
      connection: {
        isConnected: realtime.isConnected,
        isConnecting: realtime.isConnecting,
        mode: mattermost.mode,
      },
      team: {
        current: team.team,
        teams,
        loading: loadingTeams || team.loading,
        error: teamsError || team.error,
        channels: team.channels,
        loadingChannels: team.loadingChannels,
      },
      channel: {
        current: channel.channel,
        messages: channel.messages,
        loadingMessages: channel.loadingMessages,
        error: channel.error,
        typingUsers: channel.typingUsers,
        typingIndicator: channel.typingIndicator,
      },
      user: {
        current: mattermost.currentUser,
        users: knownUsers,
      },
      notifications: {
        unreadMessagesCount: globalStats.unreadMessagesCount,
        unreadMentionsCount: globalStats.unreadMentionsCount,
        unreadByChannel: Object.fromEntries(
          Object.entries(
            services?.notificationService?.getUnreadState() || {},
          ).map(([channelId, state]) => [
            channelId,
            {
              msg_count: state.msg_count,
              mention_count: state.mention_count,
            },
          ]),
        ),
      },
    }),
    [
      auth,
      realtime,
      mattermost,
      team,
      teams,
      loadingTeams,
      teamsError,
      channel,
      knownUsers,
      globalStats,
      services,
    ],
  );

  // Retourner l'état combiné et les fonctions utilitaires
  return {
    ...state,

    // Fonctions d'authentification
    login: auth.login,
    logout: auth.logout,

    // Fonctions de navigation
    switchTeam,
    switchChannel,
    loadTeams,

    // Fonctions de messagerie
    sendMessage,
    replyToMessage,
    editMessage: channel.editMessage,
    deleteMessage: channel.deleteMessage,

    // Fonctions de fichiers
    uploadFiles,
    downloadFile: file.downloadFile,
    selectFiles: file.selectFiles,

    // Référence aux services modulaires pour un accès avancé
    services: mattermost.services,

    // Fonctions de mise à jour manuelle
    refresh: {
      teams: loadTeams,
      channels: team.loadChannels,
      messages: channel.loadMessages,
    },

    // Fonctions utilitaires pour les canaux et équipes
    getTeamById: (id: string) => teams.find((t) => t.id === id),
    getChannelById: team.getChannelById,
    getChannelsByType: team.getChannelsByType,

    // Fonctions d'état
    markAsRead: channel.markAsRead,
  };
}

export default useMattermostConnect;
