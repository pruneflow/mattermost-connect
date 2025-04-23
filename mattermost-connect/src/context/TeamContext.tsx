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
import { Team } from "../types";
import { ServiceContainer } from "../services";
import { useConnection } from "./ConnectionContext";
import { useAuth } from "./AuthContext";

// 1. Team State Context
interface TeamStateContextType {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (team: Team | null) => void;
  switchTeam: (teamIdOrTeam: string | Team) => Promise<Team | null>;
  getTeamById: (teamId: string) => Team | undefined;
}

const TeamStateContext = createContext<TeamStateContextType | null>(null);

export const useTeamState = () => {
  const context = useContext(TeamStateContext);
  if (!context) {
    throw new Error("useTeamState must be used within a TeamStateProvider");
  }
  return context;
};

// 2. Team Loading Context
interface TeamLoadingContextType {
  isTeamsLoading: boolean;
  teamsError: Error | null;
  loadTeams: () => Promise<Team[]>;
  refreshInterval?: number;
}

const TeamLoadingContext = createContext<TeamLoadingContextType | null>(null);

export const useTeamLoading = () => {
  const context = useContext(TeamLoadingContext);
  if (!context) {
    throw new Error("useTeamLoading must be used within a TeamLoadingProvider");
  }
  return context;
};

// 3. Team Unread Context
interface TeamUnreadContextType {
  unreadCounts: Record<
    string,
    {
      messageCount: number;
      mentionCount: number;
    }
  >;
  getTeamUnreadCount: (teamId: string) => {
    messageCount: number;
    mentionCount: number;
  };
}

const TeamUnreadContext = createContext<TeamUnreadContextType | null>(null);

export const useTeamUnread = () => {
  const context = useContext(TeamUnreadContext);
  if (!context) {
    throw new Error("useTeamUnread must be used within a TeamUnreadProvider");
  }
  return context;
};

// Combined Team Providers
export const TeamProvider: React.FC<{
  children: ReactNode;
  services: ServiceContainer | null;
  refreshInterval?: number;
}> = ({ children, services, refreshInterval = 0 }) => {
  const { isConnected } = useConnection();
  const { isAuthenticated } = useAuth();
  // State Management
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);
  const [isTeamsLoading, setIsTeamsLoading] = useState<boolean>(false);
  const [teamsError, setTeamsError] = useState<Error | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<
    Record<
      string,
      {
        messageCount: number;
        mentionCount: number;
      }
    >
  >({});

  // Refs for state tracking
  const activeTeamRef = useRef<Team | null>(null);
  const teamsRef = useRef<Team[]>([]);
  const lastTeamsFetchRef = useRef<number>(0);

  // Team State Methods
  const setActiveTeam = useCallback((team: Team | null) => {
    setActiveTeamState(team);
    activeTeamRef.current = team;
  }, []);

  const getTeamById = useCallback((teamId: string): Team | undefined => {
    return teamsRef.current.find((team) => team.id === teamId);
  }, []);

  const switchTeam = useCallback(
    async (teamIdOrTeam: string | Team): Promise<Team | null> => {
      if (!services?.mattermostService) {
        return null;
      }

      const teamId =
        typeof teamIdOrTeam === "string" ? teamIdOrTeam : teamIdOrTeam.id;

      if (activeTeamRef.current?.id === teamId) {
        return activeTeamRef.current;
      }

      try {
        if (typeof teamIdOrTeam !== "string") {
          setActiveTeam(teamIdOrTeam);
          return teamIdOrTeam;
        }

        const existingTeam = teamsRef.current.find((t) => t.id === teamId);
        if (existingTeam) {
          setActiveTeam(existingTeam);
          return existingTeam;
        }
        if (isAuthenticated) {
          const team = await services.mattermostService.getTeam(teamId);
          setActiveTeam(team);
          return team;
        }
        return null;
      } catch (error) {
        console.error(`Error switching to team ${teamId}:`, error);
        return null;
      }
    },
    [services, setActiveTeam],
  );

  // Team Loading Methods
  const loadTeams = async (): Promise<Team[]> => {
    if (!services?.mattermostService) {
      return [];
    }

    setIsTeamsLoading(true);
    setTeamsError(null);

    try {
      if (isAuthenticated) {
        const availableTeams = await services.mattermostService.getTeams();

        setTeams(availableTeams);
        teamsRef.current = availableTeams;
        lastTeamsFetchRef.current = Date.now();

        return availableTeams;
      }
      return [];
    } catch (error) {
      console.error("Error loading teams:", error);
      const typedError =
        error instanceof Error ? error : new Error(String(error));

      setTeamsError(typedError);
      return [];
    } finally {
      setIsTeamsLoading(false);
    }
  };

  // Team Unread Methods
  const initializeTeamsUnreadStates = async (): Promise<void> => {
    if (teamsRef.current.length === 0) {
      return;
    }

    try {
      const newUnreadCounts: Record<
        string,
        { messageCount: number; mentionCount: number }
      > = {};

      for (const team of teamsRef.current) {
        if (isAuthenticated && services?.mattermostService.getTeamUnreadCount) {
          try {
            const teamUnread =
              await services.mattermostService.getTeamUnreadCount(team.id);

            newUnreadCounts[team.id] = {
              messageCount: teamUnread.msg_count || 0,
              mentionCount: teamUnread.mention_count || 0,
            };
          } catch (error) {
            console.warn(
              `Unable to get unread count for team ${team.id}:`,
              error,
            );
          }
        }
      }

      setUnreadCounts(newUnreadCounts);
    } catch (error) {
      console.error("Error initializing teams unread states:", error);
    }
  };

  const getTeamUnreadCount = useCallback(
    (teamId: string) => {
      return unreadCounts[teamId] || { messageCount: 0, mentionCount: 0 };
    },
    [unreadCounts],
  );

  // Side Effects
  useEffect(() => {
    if (isAuthenticated && services?.mattermostService) {
      void loadTeams();
    }
  }, [isAuthenticated, services, loadTeams, initializeTeamsUnreadStates]);

  useEffect(() => {
    if (
      isAuthenticated &&
      teams &&
      teams.length > 0 &&
      !isTeamsLoading &&
      services?.mattermostService
    ) {
      void initializeTeamsUnreadStates();
    }
  }, [services, teams, isTeamsLoading, isAuthenticated]);

  useEffect(() => {
    if (!services?.notificationService || !isConnected || !isAuthenticated)
      return;

    const handleUnreadUpdated = () => {
      void initializeTeamsUnreadStates();
    };

    return services.notificationService.addEventListener(
      "unread_updated",
      handleUnreadUpdated,
    );
  }, [services, isConnected, isAuthenticated]);

  // Context Values
  const teamStateValue = useMemo(
    () => ({
      teams,
      activeTeam,
      setActiveTeam,
      switchTeam,
      getTeamById,
    }),
    [teams, activeTeam, setActiveTeam, switchTeam, getTeamById],
  );

  const teamLoadingValue = useMemo(
    () => ({
      isTeamsLoading,
      teamsError,
      loadTeams,
      refreshInterval,
    }),
    [isTeamsLoading, teamsError, loadTeams, refreshInterval],
  );

  const teamUnreadValue = useMemo(
    () => ({
      unreadCounts,
      getTeamUnreadCount,
    }),
    [unreadCounts, getTeamUnreadCount],
  );

  return (
    <TeamStateContext.Provider value={teamStateValue}>
      <TeamLoadingContext.Provider value={teamLoadingValue}>
        <TeamUnreadContext.Provider value={teamUnreadValue}>
          {children}
        </TeamUnreadContext.Provider>
      </TeamLoadingContext.Provider>
    </TeamStateContext.Provider>
  );
};

// Convenience hook to get all team-related contexts
export const useTeamContext = () => ({
  state: useTeamState(),
  loading: useTeamLoading(),
  unread: useTeamUnread(),
});
