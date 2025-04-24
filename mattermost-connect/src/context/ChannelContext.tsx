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
import { Channel, Team } from "../types";
import { ServiceContainer } from "../services";
import { useConnection } from "./ConnectionContext";
import { useTeamState } from "./TeamContext";
import { useUserContext } from "./UserContext";
import { useAuth } from "./AuthContext";

// 1. Channel State Context Interface
interface ChannelStateContextType {
  activeChannel: Channel | null;
  isActiveChannelLoading: boolean;
  activeChannelError: Error | null;
  setActiveChannel: (channel: Channel | null) => void;
  loadChannel: (channelId: string) => Promise<Channel | null>;
  navigateToChannel: (channelId: string) => Promise<void>;
  getChannelById: (channelId: string, teamId?: string) => Channel | undefined;
  getChannelByName: (
    channelName: string,
    teamId: string,
  ) => Channel | undefined;
}

const ChannelStateContext = createContext<ChannelStateContextType | null>(null);

export const useChannelState = () => {
  const context = useContext(ChannelStateContext);
  if (!context) {
    throw new Error(
      "useChannelState must be used within a ChannelStateProvider",
    );
  }
  return context;
};

// 2. Channel Loading Context Interface
interface ChannelLoadingContextType {
  channels: Record<string, Channel[]>;
  isChannelsLoading: Record<string, boolean>;
  channelsError: Record<string, Error | null>;
  loadChannels: (teamId: string, force?: boolean) => Promise<Channel[]>;
  getChannelsByTeam: (teamId: string) => Channel[];
  getChannelsByType: (
    teamId: string,
    type: "public" | "private" | "direct" | "group" | "favorite",
  ) => Channel[];
}

const ChannelLoadingContext = createContext<ChannelLoadingContextType | null>(
  null,
);

export const useChannelLoading = () => {
  const context = useContext(ChannelLoadingContext);
  if (!context) {
    throw new Error(
      "useChannelLoading must be used within a ChannelLoadingProvider",
    );
  }
  return context;
};

// 3. Channel Unread Context Interface
interface ChannelUnreadContextType {
  unreadState: {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };
  typingIndicator: string;
  getChannelUnreadState: (channelId: string) => {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };
  markAsRead: (channelId?: string) => Promise<boolean>;
}

const ChannelUnreadContext = createContext<ChannelUnreadContextType | null>(
  null,
);

export const useChannelUnread = () => {
  const context = useContext(ChannelUnreadContext);
  if (!context) {
    throw new Error(
      "useChannelUnread must be used within a ChannelUnreadProvider",
    );
  }
  return context;
};

// Combined Channel Provider
export const ChannelProvider: React.FC<{
  children: ReactNode;
  services: ServiceContainer | null;
  refreshInterval?: number;
}> = ({ children, services, refreshInterval = 0 }) => {
  const { isConnected } = useConnection();
  const { isAuthenticated } = useAuth();
  const { activeTeam } = useTeamState();
  const { getTypingUsersForChannel, getTypingIndicatorText } = useUserContext();

  // State Management
  const [activeChannel, setActiveChannelState] = useState<Channel | null>(null);
  const [isActiveChannelLoading, setIsActiveChannelLoading] =
    useState<boolean>(false);
  const [activeChannelError, setActiveChannelError] = useState<Error | null>(
    null,
  );

  const [channels, setChannels] = useState<Record<string, Channel[]>>({});
  const [isChannelsLoading, setIsChannelsLoading] = useState<
    Record<string, boolean>
  >({});
  const [channelsError, setChannelsError] = useState<
    Record<string, Error | null>
  >({});

  // Refs for state tracking
  const activeChannelRef = useRef<Channel | null>(null);
  const channelsRef = useRef<Record<string, Channel[]>>({});
  const lastChannelFetchRef = useRef<Record<string, number>>({});
  const isLoadingRef = useRef<boolean>(false);

  // Channel State Methods
  const setActiveChannel = useCallback(
    (channel: Channel | null) => {
      if (channel?.id === activeChannelRef.current?.id) {
        return; // Ne rien faire si l'équipe active ne change pas réellement
      }
      setActiveChannelState(channel);
      activeChannelRef.current = channel;

      // Set active channel in notification service
      if (services?.notificationService) {
        channel
          ? services.notificationService.setCurrentChannelId(channel.id)
          : services.notificationService.setCurrentChannelId(null);
      }
    },
    [services],
  );

  const loadChannel = useCallback(
    async (channelId: string): Promise<Channel | null> => {
      if (!channelId) {
        return null;
      }

      // Check if channel is already loaded in known channels
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
        if (isAuthenticated) {
          const channel =
            await services?.mattermostService?.getChannel(channelId);
          if (channel) {
            setActiveChannel(channel);
            return channel;
          }
        }
        return null;
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
    [services, setActiveChannel],
  );

  const markAsRead = useCallback(
    async (channelId?: string): Promise<boolean> => {
      const targetChannelId = channelId || activeChannelRef.current?.id;
      if (!targetChannelId) {
        return false;
      }

      try {
        // Call viewChannel method if available
        if (isAuthenticated && services?.mattermostService.viewChannel) {
          await services.mattermostService.viewChannel(targetChannelId);
        }

        // Reset unread state in notification service
        if (
          isConnected &&
          services?.notificationService.resetChannelUnreadState
        )
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

  const navigateToChannel = useCallback(
    async (channelId: string): Promise<void> => {
      if (!channelId || !services) return;

      try {
        const channel = await loadChannel(channelId);
        if (!channel) {
          console.error(`Failed to load channel ${channelId}`);
          return;
        }

        // Mark channel as read
        await markAsRead(channelId);
      } catch (error) {
        console.error(`Error navigating to channel ${channelId}:`, error);
      }
    },
    [services, loadChannel, markAsRead],
  );

  const getChannelById = useCallback(
    (channelId: string, teamId?: string): Channel | undefined => {
      if (teamId) {
        return (channels[teamId] || []).find((c) => c.id === channelId);
      }

      // Search in all teams if no teamId provided
      for (const teamChannels of Object.values(channels)) {
        const channel = teamChannels.find((c) => c.id === channelId);
        if (channel) return channel;
      }

      return undefined;
    },
    [channels],
  );

  const getChannelByName = useCallback(
    (channelName: string, teamId: string): Channel | undefined => {
      return (channels[teamId] || []).find((c) => c.name === channelName);
    },
    [channels],
  );

  // Channel Loading Methods
  const loadChannels = useCallback(
    async (teamId: string, force: boolean = false): Promise<Channel[]> => {
      if (!teamId || !services?.mattermostService || !isAuthenticated) {
        return [];
      }

      // Ignore if already loading for this team
      if (isChannelsLoading[teamId] && !force) {
        return channels[teamId] || [];
      }

      if (!force && channelsRef.current[teamId]?.length > 0) {
        const lastFetch = lastChannelFetchRef.current[teamId] || 0;
        const now = Date.now();

        // Utiliser le cache si moins de 30 secondes se sont écoulées
        if (now - lastFetch < 30000) {
          console.debug(`[ChannelContext] Using cached channels for ${teamId}`);
          return channelsRef.current[teamId];
        }
      }
      setIsChannelsLoading((prev) => ({ ...prev, [teamId]: true }));

      try {
        const teamChannels =
          await services.mattermostService.getChannels(teamId);
        const existingChannels = channelsRef.current[teamId] || [];
        const hasChanged =
          JSON.stringify(teamChannels) !== JSON.stringify(existingChannels);

        if (hasChanged || force) {
          // Mettre à jour l'état et les références en une seule fois
          setChannels((prev) => {
            const newState = { ...prev, [teamId]: teamChannels };
            // Mettre à jour la référence également
            channelsRef.current = {
              ...channelsRef.current,
              [teamId]: teamChannels,
            };
            return newState;
          });

          // Enregistrer le timestamp
          lastChannelFetchRef.current = {
            ...lastChannelFetchRef.current,
            [teamId]: Date.now(),
          };
        } else {
          console.debug(
            `[ChannelContext] Channel data unchanged for ${teamId}`,
          );
        }

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

  const getChannelsByTeam = useCallback(
    (teamId: string): Channel[] => {
      return channels[teamId] || [];
    },
    [channels],
  );

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

  // Channel Unread Methods
  const initializeChannelUnreadStates = useCallback(
    async (teamId: string): Promise<void> => {
      if (!teamId || isLoadingRef.current) {
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
              isConnected &&
              services?.mattermostService?.getChannelUnreadCount &&
              services?.notificationService?.setChannelUnreadState
            ) {
              const unreadState =
                await services?.mattermostService?.getChannelUnreadCount(
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
    [services, isConnected, channels],
  );

  const getChannelUnreadState = useCallback(
    (channelId: string) => {
      if (!services?.notificationService) {
        return { msg_count: 0, mention_count: 0 };
      }
      return services.notificationService.getChannelUnreadState(channelId);
    },
    [services],
  );

  // Derive unread state and typing indicator
  const unreadState = useMemo(() => {
    if (!activeChannel || !services?.notificationService) {
      return { msg_count: 0, mention_count: 0 };
    }
    return services.notificationService.getChannelUnreadState(activeChannel.id);
  }, [activeChannel, services]);

  const typingIndicator = useMemo(() => {
    if (!activeChannel || !services?.notificationService) return "";

    const typingUsers = getTypingUsersForChannel(activeChannel.id);
    if (!typingUsers || typingUsers.length === 0) return "";

    return getTypingIndicatorText(activeChannel.id);
  }, [activeChannel, services]);

  useEffect(() => {
    if (activeTeam && !isChannelsLoading[activeTeam.id]) {
      // Vérifier si les canaux sont déjà chargés
      if (channels[activeTeam.id]?.length > 0) {
        // Éviter le rechargement si déjà chargé récemment (30 secondes)
        const lastFetchTime = lastChannelFetchRef.current[activeTeam.id] || 0;
        const now = Date.now();
        if (now - lastFetchTime < 30000) {
          return;
        }
      }
      // Charger les canaux avec un délai pour éviter les cascades
      const timeoutId = setTimeout(() => {
        void loadChannels(activeTeam.id);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTeam, isChannelsLoading, loadChannels, channels]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !activeTeam) return;

    const intervalId = setInterval(() => {
      if (activeTeam) void loadChannels(activeTeam.id);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [activeTeam, refreshInterval, loadChannels]);

  // Context Values
  const channelStateValue = useMemo<ChannelStateContextType>(
    () => ({
      activeChannel,
      isActiveChannelLoading,
      activeChannelError,
      setActiveChannel,
      loadChannel,
      navigateToChannel,
      getChannelById,
      getChannelByName,
    }),
    [
      activeChannel,
      isActiveChannelLoading,
      activeChannelError,
      setActiveChannel,
      loadChannel,
      navigateToChannel,
      getChannelById,
      getChannelByName,
    ],
  );

  const channelLoadingValue = useMemo<ChannelLoadingContextType>(
    () => ({
      channels,
      isChannelsLoading,
      channelsError,
      loadChannels,
      getChannelsByTeam,
      getChannelsByType,
    }),
    [
      channels,
      isChannelsLoading,
      channelsError,
      loadChannels,
      getChannelsByTeam,
      getChannelsByType,
    ],
  );

  const channelUnreadValue = useMemo<ChannelUnreadContextType>(
    () => ({
      unreadState,
      typingIndicator,
      getChannelUnreadState,
      markAsRead,
    }),
    [unreadState, typingIndicator, getChannelUnreadState, markAsRead],
  );

  return (
    <ChannelStateContext.Provider value={channelStateValue}>
      <ChannelLoadingContext.Provider value={channelLoadingValue}>
        <ChannelUnreadContext.Provider value={channelUnreadValue}>
          {children}
        </ChannelUnreadContext.Provider>
      </ChannelLoadingContext.Provider>
    </ChannelStateContext.Provider>
  );
};

// Convenience hook to get all channel-related contexts
export const useChannelContext = () => ({
  state: useChannelState(),
  loading: useChannelLoading(),
  unread: useChannelUnread(),
});

// Re-export individual context hooks for convenience
export type {
  ChannelStateContextType,
  ChannelLoadingContextType,
  ChannelUnreadContextType,
};
