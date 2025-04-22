// src/context/ChannelContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { Channel } from "../types";
import { ServiceContainer } from "../services";
import { useConnection } from "./ConnectionContext";
import { useTeamContext } from "./TeamContext";
import { useUserContext } from "./UserContext";

/**
 * Interface pour le ChannelContext
 * Fournit les fonctionnalités liées aux canaux uniquement
 */
export interface ChannelContextType {
  // État des canaux
  activeChannel: Channel | null;
  isActiveChannelLoading: boolean;
  activeChannelError: Error | null;

  // Canaux par équipe
  channels: Record<string, Channel[]>;
  isChannelsLoading: Record<string, boolean>;
  channelsError: Record<string, Error | null>;

  // État des non-lus
  unreadState: {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };

  // État de frappe
  typingIndicator: string;

  // Méthodes pour les canaux
  setActiveChannel: (channel: Channel | null) => void;
  loadChannel: (channelId: string) => Promise<Channel | null>;
  loadChannels: (teamId: string, force?: boolean) => Promise<Channel[]>;
  getChannelsByTeam: (teamId: string) => Channel[];
  getChannelsByType: (
    teamId: string,
    type: "public" | "private" | "direct" | "group" | "favorite",
  ) => Channel[];
  getChannelById: (channelId: string, teamId?: string) => Channel | undefined;
  getChannelByName: (
    channelName: string,
    teamId: string,
  ) => Channel | undefined;
  getChannelUnreadState: (channelId: string) => {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };
  markAsRead: (channelId?: string) => Promise<boolean>;

  // Navigation
  navigateToChannel: (channelId: string) => Promise<void>;
}

// Création du contexte avec une valeur par défaut null
export const ChannelContext = createContext<ChannelContextType | null>(null);

/**
 * Hook personnalisé pour accéder au ChannelContext
 */
export function useChannelContext(): ChannelContextType {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error("useChannelContext must be used within a ChannelProvider");
  }
  return context;
}

/**
 * Props pour le ChannelProvider
 */
export interface ChannelProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
  refreshInterval?: number;
}

/**
 * Provider pour la gestion des canaux
 */
export const ChannelProvider: React.FC<ChannelProviderProps> = ({
  children,
  services,
  refreshInterval = 0, // Pas de rafraîchissement automatique par défaut
}) => {
  // Récupération des contextes dépendants
  const connection = useConnection();
  const { activeTeam } = useTeamContext();
  const { getTypingUsersForChannel, getTypingIndicatorText } = useUserContext();

  // État pour le canal actif
  const [activeChannel, setActiveChannelState] = useState<Channel | null>(null);
  const [isActiveChannelLoading, setIsActiveChannelLoading] =
    useState<boolean>(false);
  const [activeChannelError, setActiveChannelError] = useState<Error | null>(
    null,
  );

  // État pour les canaux par équipe
  const [channels, setChannels] = useState<Record<string, Channel[]>>({});
  const [isChannelsLoading, setIsChannelsLoading] = useState<
    Record<string, boolean>
  >({});
  const [channelsError, setChannelsError] = useState<
    Record<string, Error | null>
  >({});

  // Références pour suivre l'état sans re-renders
  const activeChannelRef = useRef<Channel | null>(null);
  const channelsRef = useRef<Record<string, Channel[]>>({});
  const lastChannelFetchRef = useRef<Record<string, number>>({});
  const isLoadingRef = useRef<boolean>(false);

  /**
   * Définit le canal actif avec mise à jour de la référence
   */
  const setActiveChannel = useCallback(
    (channel: Channel | null) => {
      setActiveChannelState(channel);
      activeChannelRef.current = channel;

      // Définir le canal actif dans le service de notification
      if (services?.notificationService && channel) {
        services.notificationService.setCurrentChannelId(channel.id);
      } else if (services?.notificationService && !channel) {
        services.notificationService.setCurrentChannelId(null);
      }
    },
    [services],
  );

  /**
   * Charge les détails d'un canal par ID
   */
  const loadChannel = useCallback(
    async (channelId: string): Promise<Channel | null> => {
      if (
        !channelId ||
        !services?.mattermostService ||
        !connection.isConnected
      ) {
        return null;
      }

      // Vérifier si le canal est déjà chargé dans les canaux connus
      for (const teamChannels of Object.values(channelsRef.current)) {
        const existingChannel = teamChannels.find((c) => c.id === channelId);
        if (existingChannel) {
          setActiveChannel(existingChannel);
          return existingChannel;
        }
      }

      setIsActiveChannelLoading(true);
      setActiveChannelError(null);

      try {
        const channel = await services.mattermostService.getChannel(channelId);
        setActiveChannel(channel);
        return channel;
      } catch (error) {
        console.error(`Error loading channel ${channelId}:`, error);
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        setActiveChannelError(typedError);
        return null;
      } finally {
        setIsActiveChannelLoading(false);
      }
    },
    [services, connection.isConnected, setActiveChannel],
  );

  /**
   * Charge les canaux pour une équipe
   */
  const loadChannels = useCallback(
    async (teamId: string, force: boolean = false): Promise<Channel[]> => {
      if (!teamId || !services?.mattermostService) {
        return [];
      }

      // Ignorer si déjà en cours de chargement pour cette équipe
      if (isChannelsLoading[teamId] && !force) {
        return channels[teamId] || [];
      }

      // Vérifier l'intervalle de rafraîchissement si pas forcé
      if (!force && refreshInterval > 0 && channelsRef.current[teamId]) {
        const now = Date.now();
        const lastFetch = lastChannelFetchRef.current[teamId] || 0;

        if (now - lastFetch < refreshInterval) {
          return channelsRef.current[teamId] || [];
        }
      }

      // Mise à jour état de chargement
      setIsChannelsLoading((prev) => ({ ...prev, [teamId]: true }));
      setChannelsError((prev) => ({ ...prev, [teamId]: null }));

      try {
        const teamChannels =
          await services.mattermostService.getChannels(teamId);

        // Mise à jour état et références
        setChannels((prev) => ({ ...prev, [teamId]: teamChannels }));
        channelsRef.current = {
          ...channelsRef.current,
          [teamId]: teamChannels,
        };
        lastChannelFetchRef.current = {
          ...lastChannelFetchRef.current,
          [teamId]: Date.now(),
        };

        // Initialiser les états non-lus
        void initializeChannelUnreadStates(teamId);

        return teamChannels;
      } catch (error) {
        console.error(`Error loading channels for team ${teamId}:`, error);
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        setChannelsError((prev) => ({ ...prev, [teamId]: typedError }));
        return channels[teamId] || [];
      } finally {
        setIsChannelsLoading((prev) => ({ ...prev, [teamId]: false }));
      }
    },
    [services, channels, isChannelsLoading, refreshInterval],
  );

  /**
   * Récupère tous les canaux pour une équipe
   */
  const getChannelsByTeam = useCallback(
    (teamId: string): Channel[] => {
      return channels[teamId] || [];
    },
    [channels],
  );

  /**
   * Récupère les canaux d'un type spécifique pour une équipe
   */
  const getChannelsByType = useCallback(
    (
      teamId: string,
      type: "public" | "private" | "direct" | "group" | "favorite",
    ): Channel[] => {
      const teamChannels = channels[teamId] || [];
      if (!teamChannels.length) return [];

      switch (type) {
        case "public":
          return teamChannels.filter((c) => c.type === "O");
        case "private":
          return teamChannels.filter((c) => c.type === "P");
        case "direct":
          return teamChannels.filter((c) => c.type === "D");
        case "group":
          return teamChannels.filter((c) => c.type === "G");
        case "favorite":
          return teamChannels.filter((c) => c.is_favorite);
        default:
          return teamChannels;
      }
    },
    [channels],
  );

  /**
   * Récupère un canal par ID
   */
  const getChannelById = useCallback(
    (channelId: string, teamId?: string): Channel | undefined => {
      if (teamId) {
        return (channels[teamId] || []).find((c) => c.id === channelId);
      }

      // Rechercher dans toutes les équipes si pas de teamId fourni
      for (const teamChannels of Object.values(channels)) {
        const channel = teamChannels.find((c) => c.id === channelId);
        if (channel) return channel;
      }

      return undefined;
    },
    [channels],
  );

  /**
   * Récupère un canal par nom
   */
  const getChannelByName = useCallback(
    (channelName: string, teamId: string): Channel | undefined => {
      return (channels[teamId] || []).find((c) => c.name === channelName);
    },
    [channels],
  );

  /**
   * Initialise l'état non-lu pour tous les canaux d'une équipe
   */
  const initializeChannelUnreadStates = useCallback(
    async (teamId: string): Promise<void> => {
      if (
        !teamId ||
        !services?.mattermostService ||
        !services.notificationService ||
        !connection.isConnected ||
        isLoadingRef.current
      ) {
        return;
      }

      isLoadingRef.current = true;

      try {
        const teamChannels = channels[teamId] || [];
        if (teamChannels.length === 0) return;

        for (const channel of teamChannels) {
          if (!channel.id) continue;

          try {
            if (
              typeof services.mattermostService.getChannelUnreadCount ===
              "function"
            ) {
              const unreadState =
                await services.mattermostService.getChannelUnreadCount(
                  channel.id,
                );

              services.notificationService.setChannelUnreadState(channel.id, {
                msg_count: unreadState.msg_count || 0,
                mention_count: unreadState.mention_count || 0,
                lastViewedAt: Date.now(),
              });
            }
          } catch (error) {
            console.warn(
              `Unable to get unread state for channel ${channel.id}:`,
              error,
            );
          }
        }
      } catch (error) {
        console.error("Error initializing unread states:", error);
      } finally {
        isLoadingRef.current = false;
      }
    },
    [services, connection.isConnected, channels],
  );

  /**
   * Récupère l'état non-lu pour un canal
   */
  const getChannelUnreadState = useCallback(
    (channelId: string) => {
      if (!services?.notificationService) {
        return { msg_count: 0, mention_count: 0 };
      }
      return services.notificationService.getChannelUnreadState(channelId);
    },
    [services],
  );

  /**
   * Marque un canal comme lu
   */
  const markAsRead = useCallback(
    async (channelId?: string): Promise<boolean> => {
      const targetChannelId = channelId || activeChannelRef.current?.id;
      if (
        !targetChannelId ||
        !services?.mattermostService ||
        !services.notificationService
      ) {
        return false;
      }

      try {
        // Appeler la méthode viewChannel du service si disponible
        if (typeof services.mattermostService.viewChannel === "function") {
          await services.mattermostService.viewChannel(targetChannelId);
        }

        // Réinitialiser l'état non-lu dans le service de notification
        services.notificationService.resetChannelUnreadState(targetChannelId);
        return true;
      } catch (error) {
        console.error(
          `Error marking channel ${targetChannelId} as read:`,
          error,
        );
        return false;
      }
    },
    [services],
  );

  /**
   * Naviguer vers un canal spécifique
   */
  const navigateToChannel = useCallback(
    async (channelId: string): Promise<void> => {
      if (!channelId || !services) return;

      try {
        // Charger le canal
        const channel = await loadChannel(channelId);
        if (!channel) {
          console.error(`Failed to load channel ${channelId}`);
          return;
        }

        // Marquer le canal comme lu
        void markAsRead(channelId);
      } catch (error) {
        console.error(`Error navigating to channel ${channelId}:`, error);
      }
    },
    [services, loadChannel, markAsRead],
  );

  // Charger les canaux quand l'équipe active change
  useEffect(() => {
    if (activeTeam && !isChannelsLoading[activeTeam.id]) {
      void loadChannels(activeTeam.id);
    }
  }, [activeTeam, isChannelsLoading, loadChannels]);

  // Mettre à jour les références quand l'état change
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  // Configurer le rafraîchissement périodique si activé
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !activeTeam) return;

    const intervalId = setInterval(() => {
      if (activeTeam) void loadChannels(activeTeam.id);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [activeTeam, refreshInterval, loadChannels]);

  // Récupérer l'état non-lu pour le canal actif
  const unreadState = useMemo(() => {
    if (!activeChannel || !services?.notificationService) {
      return { msg_count: 0, mention_count: 0 };
    }
    return services.notificationService.getChannelUnreadState(activeChannel.id);
  }, [activeChannel, services]);

  // Récupérer l'indicateur de frappe pour le canal actif
  const typingIndicator = useMemo(() => {
    if (!activeChannel || !services?.notificationService) return "";

    const typingUsers = getTypingUsersForChannel(activeChannel.id);
    if (!typingUsers || typingUsers.length === 0) return "";

    return getTypingIndicatorText(activeChannel.id);
  }, [activeChannel, services]);

  // Valeur du contexte
  const contextValue = useMemo<ChannelContextType>(
    () => ({
      // État
      activeChannel,
      isActiveChannelLoading,
      activeChannelError,
      channels,
      isChannelsLoading,
      channelsError,
      unreadState,
      typingIndicator,

      // Méthodes
      setActiveChannel,
      loadChannel,
      loadChannels,
      getChannelsByTeam,
      getChannelsByType,
      getChannelById,
      getChannelByName,
      getChannelUnreadState,
      markAsRead,
      navigateToChannel,
    }),
    [
      activeChannel,
      isActiveChannelLoading,
      activeChannelError,
      channels,
      isChannelsLoading,
      channelsError,
      unreadState,
      typingIndicator,
      setActiveChannel,
      loadChannel,
      loadChannels,
      getChannelsByTeam,
      getChannelsByType,
      getChannelById,
      getChannelByName,
      getChannelUnreadState,
      markAsRead,
      navigateToChannel,
    ],
  );

  return (
    <ChannelContext.Provider value={contextValue}>
      {children}
    </ChannelContext.Provider>
  );
};
