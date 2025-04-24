// src/core/store/teamStore.ts
/**
 * Zustand store for teams state
 */
import { create } from "zustand";

/**
 * Team interface
 */
export interface Team {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type?: "O" | "I";
  invite_id?: string;
  member_count?: number;
}

/**
 * Team unread count interface
 */
export interface TeamUnreadCount {
  messageCount: number;
  mentionCount: number;
}

/**
 * Teams state
 */
export interface TeamState {
  // State
  /** List of teams */
  teams: Team[];
  /** Currently active team */
  activeTeam: Team | null;
  /** Whether teams are being loaded */
  isLoading: boolean;
  /** Error that occurred while loading teams */
  error: Error | null;
  /** Time of last fetch */
  lastFetchTime: number;
  /** Unread counts by team ID */
  unreadCounts: Record<string, TeamUnreadCount>;

  // Actions
  /** Sets the list of teams */
  setTeams: (teams: Team[]) => void;
  /** Sets the active team */
  setActiveTeam: (team: Team | null) => void;
  /** Sets the loading state */
  setLoading: (isLoading: boolean) => void;
  /** Sets the error state */
  setError: (error: Error | null) => void;
  /** Updates the unread count for a team */
  updateUnreadCount: (
    teamId: string,
    messageCount: number,
    mentionCount: number,
  ) => void;
  /** Gets a team by ID */
  getTeamById: (teamId: string | null | undefined) => Team | null;
  /** Resets the teams state */
  reset: () => void;
}

/**
 * Initial unread count state
 */
const DEFAULT_UNREAD_COUNT: TeamUnreadCount = {
  messageCount: 0,
  mentionCount: 0,
};

/**
 * Create the teams store
 */
export const useTeamStore = create<TeamState>()((set, get) => ({
  // Initial state
  teams: [],
  activeTeam: null,
  isLoading: false,
  error: null,
  lastFetchTime: 0,
  unreadCounts: {},

  /**
   * Sets the list of teams
   * @param teams List of teams
   */
  setTeams: (teams: Team[]) => {
    set({
      teams,
      lastFetchTime: Date.now(),
      isLoading: false,
      error: null,
    });

    // If no active team is set but teams are available, set the first team as active
    const state = get();
    if (!state.activeTeam && teams.length > 0) {
      set({ activeTeam: teams[0] });
    }
  },

  /**
   * Sets the active team
   * @param team Team to set as active
   */
  setActiveTeam: (team: Team | null) => {
    set({ activeTeam: team });
  },

  /**
   * Sets the loading state
   * @param isLoading Whether teams are being loaded
   */
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  /**
   * Sets the error state
   * @param error Error to set
   */
  setError: (error: Error | null) => {
    set({ error, isLoading: false });
  },

  /**
   * Updates the unread count for a team
   * @param teamId Team ID
   * @param messageCount Number of unread messages
   * @param mentionCount Number of unread mentions
   */
  updateUnreadCount: (
    teamId: string,
    messageCount: number,
    mentionCount: number,
  ) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [teamId]: {
          messageCount,
          mentionCount,
        },
      },
    }));
  },

  /**
   * Gets a team by ID
   * @param teamId Team ID
   * @returns Team or null if not found
   */
  getTeamById: (teamId: string | null | undefined): Team | null => {
    if (!teamId) return null;
    return get().teams.find((team) => team.id === teamId) || null;
  },

  /**
   * Resets the teams state
   */
  reset: () => {
    set({
      teams: [],
      activeTeam: null,
      isLoading: false,
      error: null,
      lastFetchTime: 0,
      unreadCounts: {},
    });
  },
}));

/**
 * Gets the unread count for a team
 * @param teamId Team ID
 * @returns Unread count
 */
export const getTeamUnreadCount = (teamId: string): TeamUnreadCount => {
  return useTeamStore.getState().unreadCounts[teamId] || DEFAULT_UNREAD_COUNT;
};

/**
 * Calculates the total unread count across all teams
 * @returns Total unread count
 */
export const getTotalUnreadCount = (): {
  messageCount: number;
  mentionCount: number;
} => {
  const unreadCounts = useTeamStore.getState().unreadCounts;

  return Object.values(unreadCounts).reduce(
    (total, count) => ({
      messageCount: total.messageCount + count.messageCount,
      mentionCount: total.mentionCount + count.mentionCount,
    }),
    { messageCount: 0, mentionCount: 0 },
  );
};
