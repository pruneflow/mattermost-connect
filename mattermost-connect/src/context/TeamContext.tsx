// src/context/TeamContext.tsx
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
import { Team, Channel } from "../types";
import { ServiceContainer } from "../services/factory";
import { useConnection } from "./ConnectionContext";
import { useUserContext } from "./UserContext";

/**
 * Interface for the TeamContext
 * Provides team management functionality
 */
export interface TeamContextType {
  // Team state
  teams: Team[];
  activeTeam: Team | null;
  isTeamsLoading: boolean;
  teamsError: Error | null;

  // Channel state
  channels: Record<string, Channel[]>;
  isChannelsLoading: Record<string, boolean>;
  channelsError: Record<string, Error | null>;

  // Unread state
  unreadCounts: Record<
    string,
    {
      messageCount: number;
      mentionCount: number;
    }
  >;

  // Methods for team management
  loadTeams: () => Promise<Team[]>;
  setActiveTeam: (team: Team | null) => void;
  switchTeam: (teamId: string | Team) => Promise<Team | null>;
  getTeamById: (teamId: string) => Team | undefined;

  // Methods for channel management
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

  // Methods for unread state
  initializeTeamUnreadStates: (teamId: string) => Promise<void>;
  getTeamUnreadCount: (teamId: string) => {
    messageCount: number;
    mentionCount: number;
  };
}

// Create the context with a default value of null
export const TeamContext = createContext<TeamContextType | null>(null);

/**
 * Custom hook to access the TeamContext
 * Throws an error if used outside of a TeamProvider
 */
export function useTeamContext(): TeamContextType {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
}

/**
 * Props for TeamProvider component
 */
export interface TeamProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
  refreshInterval?: number;
}

/**
 * Provider component for team management
 * Handles teams, channels, and unread states
 */
export const TeamProvider: React.FC<TeamProviderProps> = ({
  children,
  services,
  refreshInterval = 0, // Default: no auto-refresh
}) => {
  // Get dependency contexts
  const connection = useConnection();
  const { currentUser, loadDirectMessageUsers } = useUserContext();

  // State for teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [isTeamsLoading, setIsTeamsLoading] = useState<boolean>(false);
  const [teamsError, setTeamsError] = useState<Error | null>(null);

  // State for channels (by team ID)
  const [channels, setChannels] = useState<Record<string, Channel[]>>({});
  const [isChannelsLoading, setIsChannelsLoading] = useState<
    Record<string, boolean>
  >({});
  const [channelsError, setChannelsError] = useState<
    Record<string, Error | null>
  >({});

  // State for unread counts
  const [unreadCounts, setUnreadCounts] = useState<
    Record<
      string,
      {
        messageCount: number;
        mentionCount: number;
      }
    >
  >({});

  // Refs for tracking state without re-renders
  const activeTeamRef = useRef<Team | null>(null);
  const teamsRef = useRef<Team[]>([]);
  const channelsRef = useRef<Record<string, Channel[]>>({});
  const lastChannelFetchRef = useRef<Record<string, number>>({});
  const isLoadingRef = useRef<boolean>(false);

  /**
   * Load all available teams
   */
  const loadTeams = useCallback(async (): Promise<Team[]> => {
    if (!services?.mattermostService || !connection.isConnected) {
      return [];
    }

    setIsTeamsLoading(true);
    setTeamsError(null);

    try {
      const availableTeams = await services.mattermostService.getTeams();

      // Update state and ref
      setTeams(availableTeams);
      teamsRef.current = availableTeams;

      return availableTeams;
    } catch (error) {
      console.error("Error loading teams:", error);
      const typedError =
        error instanceof Error ? error : new Error(String(error));

      setTeamsError(typedError);
      return [];
    } finally {
      setIsTeamsLoading(false);
    }
  }, [services, connection.isConnected]);

  /**
   * Set the active team
   */
  const setActiveTeamState = useCallback((team: Team | null) => {
    setActiveTeam(team);
    activeTeamRef.current = team;
  }, []);

  /**
   * Load channels for a team
   */
  const loadChannels = useCallback(
    async (teamId: string, force: boolean = false): Promise<Channel[]> => {
      if (!teamId || !services?.mattermostService) {
        return [];
      }

      // Skip if already loading this team's channels
      if (isChannelsLoading[teamId] && !force) {
        return channels[teamId] || [];
      }

      // Check refresh interval if not forced
      if (!force && refreshInterval > 0 && channelsRef.current[teamId]) {
        const now = Date.now();
        const lastFetch = lastChannelFetchRef.current[teamId] || 0;

        if (now - lastFetch < refreshInterval) {
          return channelsRef.current[teamId] || [];
        }
      }

      // Update loading state
      setIsChannelsLoading((prev) => ({
        ...prev,
        [teamId]: true,
      }));

      setChannelsError((prev) => ({
        ...prev,
        [teamId]: null,
      }));

      try {
        const teamChannels =
          await services.mattermostService.getChannels(teamId);

        // Update state and refs
        setChannels((prev) => ({
          ...prev,
          [teamId]: teamChannels,
        }));

        channelsRef.current = {
          ...channelsRef.current,
          [teamId]: teamChannels,
        };

        lastChannelFetchRef.current = {
          ...lastChannelFetchRef.current,
          [teamId]: Date.now(),
        };

        // Load users for direct message channels
        const directChannels = teamChannels.filter(
          (channel) => channel.type === "D" || channel.type === "G",
        );

        if (directChannels.length > 0) {
          void loadDirectMessageUsers(directChannels);
        }

        // Initialize unread states
        void initializeTeamUnreadStates(teamId);

        return teamChannels;
      } catch (error) {
        console.error(`Error loading channels for team ${teamId}:`, error);
        const typedError =
          error instanceof Error ? error : new Error(String(error));

        setChannelsError((prev) => ({
          ...prev,
          [teamId]: typedError,
        }));

        return channels[teamId] || [];
      } finally {
        setIsChannelsLoading((prev) => ({
          ...prev,
          [teamId]: false,
        }));
      }
    },
    [
      services,
      channels,
      isChannelsLoading,
      refreshInterval,
      loadDirectMessageUsers,
    ],
  );

  /**
   * Switch to a different team
   */
  const switchTeam = useCallback(
    async (teamIdOrTeam: string | Team): Promise<Team | null> => {
      if (!services?.mattermostService) {
        return null;
      }

      // Determine team ID
      const teamId =
        typeof teamIdOrTeam === "string" ? teamIdOrTeam : teamIdOrTeam.id;

      // If already the active team, no need to switch
      if (activeTeamRef.current?.id === teamId) {
        return activeTeamRef.current;
      }

      try {
        // If team object is provided, use it directly
        if (typeof teamIdOrTeam !== "string") {
          setActiveTeamState(teamIdOrTeam);

          // Load channels for the new team if not already loaded
          if (!channelsRef.current[teamId]) {
            void loadChannels(teamId);
          }

          return teamIdOrTeam;
        }

        // Find team in already loaded teams
        const existingTeam = teamsRef.current.find((t) => t.id === teamId);
        if (existingTeam) {
          setActiveTeamState(existingTeam);

          // Load channels for the new team if not already loaded
          if (!channelsRef.current[teamId]) {
            void loadChannels(teamId);
          }

          return existingTeam;
        }

        // Load team details from API
        const team = await services.mattermostService.getTeam(teamId);
        setActiveTeamState(team);

        // Load channels for the new team
        void loadChannels(teamId);

        return team;
      } catch (error) {
        console.error(`Error switching to team ${teamId}:`, error);
        return null;
      }
    },
    [services, loadChannels, setActiveTeamState],
  );

  /**
   * Get a team by ID
   */
  const getTeamById = useCallback((teamId: string): Team | undefined => {
    return teamsRef.current.find((team) => team.id === teamId);
  }, []);

  /**
   * Get all channels for a team
   */
  const getChannelsByTeam = useCallback(
    (teamId: string): Channel[] => {
      return channels[teamId] || [];
    },
    [channels],
  );

  /**
   * Get channels of a specific type for a team
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
   * Get a channel by ID
   */
  const getChannelById = useCallback(
    (channelId: string, teamId?: string): Channel | undefined => {
      if (teamId) {
        return (channels[teamId] || []).find((c) => c.id === channelId);
      }

      // Search across all teams if no teamId provided
      for (const teamChannels of Object.values(channels)) {
        const channel = teamChannels.find((c) => c.id === channelId);
        if (channel) return channel;
      }

      return undefined;
    },
    [channels],
  );

  /**
   * Get a channel by name
   */
  const getChannelByName = useCallback(
    (channelName: string, teamId: string): Channel | undefined => {
      return (channels[teamId] || []).find((c) => c.name === channelName);
    },
    [channels],
  );

  /**
   * Initialize unread state for all channels in a team
   */
  const initializeTeamUnreadStates = useCallback(
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
        // First try to get team-level unread count
        if (
          typeof services.mattermostService.getTeamUnreadCount === "function"
        ) {
          try {
            const teamUnread =
              await services.mattermostService.getTeamUnreadCount(teamId);

            setUnreadCounts((prev) => ({
              ...prev,
              [teamId]: {
                messageCount: teamUnread.msg_count || 0,
                mentionCount: teamUnread.mention_count || 0,
              },
            }));
          } catch (teamError) {
            console.warn(
              `Unable to get unread count for team ${teamId}:`,
              teamError,
            );
          }
        }

        // Then initialize individual channel unread states
        const teamChannels = channels[teamId] || [];

        // Skip if no channels available
        if (teamChannels.length === 0) {
          return;
        }

        // Process each channel
        for (const channel of teamChannels) {
          if (!channel.id) continue;

          try {
            // Check if the method is available
            if (
              typeof services.mattermostService.getChannelUnreadCount ===
              "function"
            ) {
              const unreadState =
                await services.mattermostService.getChannelUnreadCount(
                  channel.id,
                );

              // Update unread state in notification service
              services.notificationService.setChannelUnreadState(channel.id, {
                msg_count: unreadState.msg_count || 0,
                mention_count: unreadState.mention_count || 0,
                lastViewedAt: Date.now(),
              });
            }
          } catch (channelError) {
            console.warn(
              `Unable to get unread state for channel ${channel.id}:`,
              channelError,
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
   * Get unread count for a team
   */
  const getTeamUnreadCount = useCallback(
    (teamId: string) => {
      return unreadCounts[teamId] || { messageCount: 0, mentionCount: 0 };
    },
    [unreadCounts],
  );

  // Load teams on initial connection
  useEffect(() => {
    if (
      connection.isConnected &&
      services?.mattermostService &&
      teams.length === 0
    ) {
      void loadTeams();
    }
  }, [connection.isConnected, services, teams.length, loadTeams]);

  // Update refs when state changes
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    activeTeamRef.current = activeTeam;
  }, [activeTeam]);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  // Update unread counts when notification service reports changes
  useEffect(() => {
    if (!services?.notificationService) return;

    const handleUnreadUpdated = () => {
      const unreadState = services.notificationService.getUnreadState();

      // Group by team
      const teamUnreads: Record<
        string,
        {
          messageCount: number;
          mentionCount: number;
        }
      > = {};

      // For each channel, find its team and aggregate unread counts
      Object.entries(unreadState).forEach(([channelId, channelUnread]) => {
        // Find channel's team
        const channel = getChannelById(channelId);
        if (!channel || !channel.team_id) return;

        const teamId = channel.team_id;

        // Initialize if not already
        if (!teamUnreads[teamId]) {
          teamUnreads[teamId] = {
            messageCount: 0,
            mentionCount: 0,
          };
        }

        // Add counts
        teamUnreads[teamId].messageCount += channelUnread.msg_count || 0;
        teamUnreads[teamId].mentionCount += channelUnread.mention_count || 0;
      });

      // Update state
      setUnreadCounts((prev) => ({
        ...prev,
        ...teamUnreads,
      }));
    };

    // Initial update
    handleUnreadUpdated();

    // Subscribe to changes
    return services.notificationService.addEventListener(
      "unread_updated",
      handleUnreadUpdated,
    );
  }, [services, getChannelById]);

  // Set up periodic channel refresh if enabled
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !activeTeam) {
      return;
    }

    const intervalId = setInterval(() => {
      if (activeTeam) {
        void loadChannels(activeTeam.id);
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [activeTeam, refreshInterval, loadChannels]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<TeamContextType>(
    () => ({
      // State
      teams,
      activeTeam,
      isTeamsLoading,
      teamsError,
      channels,
      isChannelsLoading,
      channelsError,
      unreadCounts,

      // Team methods
      loadTeams,
      setActiveTeam: setActiveTeamState,
      switchTeam,
      getTeamById,

      // Channel methods
      loadChannels,
      getChannelsByTeam,
      getChannelsByType,
      getChannelById,
      getChannelByName,

      // Unread methods
      initializeTeamUnreadStates,
      getTeamUnreadCount,
    }),
    [
      teams,
      activeTeam,
      isTeamsLoading,
      teamsError,
      channels,
      isChannelsLoading,
      channelsError,
      unreadCounts,
      loadTeams,
      setActiveTeamState,
      switchTeam,
      getTeamById,
      loadChannels,
      getChannelsByTeam,
      getChannelsByType,
      getChannelById,
      getChannelByName,
      initializeTeamUnreadStates,
      getTeamUnreadCount,
    ],
  );

  return (
    <TeamContext.Provider value={contextValue}>{children}</TeamContext.Provider>
  );
};
