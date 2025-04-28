// src/core/store/teamStore.ts
/**
 * Team store
 * Manages team data and active team selection
 */
import { create } from "zustand";
import {
  Team,
  TeamState,
  TeamStats,
  TeamMember,
  EventType,
  ErrorSource,
} from "../../types";
import { emitEvent } from "./eventStore";
import { handleError } from "./errorStore";

/**
 * Team store state and actions
 */
interface TeamStoreState extends TeamState {
  // Actions
  setTeams: (teams: Team[]) => void;
  setTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
  setActiveTeam: (team: Team | null) => void;
  setTeamStats: (teamId: string, stats: TeamStats) => void;
  setTeamMembers: (teamId: string, members: TeamMember[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  updateTeam: (team: Partial<Team> & { id: string }) => void;
  isLoading: boolean;
  error: Error | null;

  // Selectors
  getTeamById: (teamId: string) => Team | null;
  getTeamStats: (teamId: string) => TeamStats | null;
  getTeamMembers: (teamId: string) => TeamMember[];

  // Reset
  reset: () => void;
}

/**
 * Team store for managing team data and selection
 */
export const useTeamStore = create<TeamStoreState>()((set, get) => ({
  // Initial state
  teams: [],
  activeTeam: null,
  teamStats: {},
  teamMembers: {},
  lastFetchTimes: {},
  isLoading: false,
  error: null,

  /**
   * Sets all teams in the store
   * @param teams Array of teams
   */
  setTeams: (teams: Team[]) => {
    set((state) => {
      const now = Date.now();
      const lastFetchTimes = { ...state.lastFetchTimes };

      // Update fetch times for all teams
      teams.forEach((team) => {
        lastFetchTimes[team.id] = now;
      });

      // Auto-select first team if none is active
      let activeTeam = state.activeTeam;
      if (!activeTeam && teams.length > 0) {
        activeTeam = teams[0];

        // Emit team selected event
        if (activeTeam) {
          emitEvent(EventType.TEAM_SELECTED, { team: activeTeam });
        }
      }

      return {
        teams,
        activeTeam,
        lastFetchTimes,
        isLoading: false,
        error: null,
      };
    });
  },

  /**
   * Sets a single team in the store
   * @param team Team to set
   */
  setTeam: (team: Team) => {
    set((state) => {
      // Check if team already exists
      const existingTeamIndex = state.teams.findIndex((t) => t.id === team.id);
      const now = Date.now();

      // Create new teams array
      let teams: Team[];
      if (existingTeamIndex !== -1) {
        // Update existing team
        teams = [...state.teams];
        teams[existingTeamIndex] = team;
      } else {
        // Add new team
        teams = [...state.teams, team];

        // Emit team joined event
        emitEvent(EventType.TEAM_JOINED, { team });
      }

      return {
        teams,
        lastFetchTimes: {
          ...state.lastFetchTimes,
          [team.id]: now,
        },
      };
    });
  },

  /**
   * Removes a team from the store
   * @param teamId Team ID to remove
   */
  removeTeam: (teamId: string) => {
    set((state) => {
      // Find the team to be removed
      const teamToRemove = state.teams.find((team) => team.id === teamId);

      if (!teamToRemove) {
        return state;
      }

      // Create new teams array without the team
      const teams = state.teams.filter((team) => team.id !== teamId);

      // If removing active team, set a new active team
      let activeTeam = state.activeTeam;
      if (state.activeTeam?.id === teamId) {
        activeTeam = teams.length > 0 ? teams[0] : null;

        // Emit team selected event for new active team
        if (activeTeam) {
          emitEvent(EventType.TEAM_SELECTED, { team: activeTeam });
        }
      }

      // Remove stats and members for this team
      const { [teamId]: _, ...teamStats } = state.teamStats;
      const { [teamId]: __, ...teamMembers } = state.teamMembers;

      // Emit team left event
      emitEvent(EventType.TEAM_LEFT, { team: teamToRemove });

      return {
        teams,
        activeTeam,
        teamStats,
        teamMembers,
      };
    });
  },

  /**
   * Sets the active team
   * @param team Team to set as active or null
   */
  setActiveTeam: (team: Team | null) => {
    set((state) => {
      // Skip if already active
      if (team?.id === state.activeTeam?.id) {
        return state;
      }

      // Emit team selected event
      if (team) {
        emitEvent(EventType.TEAM_SELECTED, { team });
      }

      return { activeTeam: team };
    });
  },

  /**
   * Sets statistics for a team
   * @param teamId Team ID
   * @param stats Team statistics
   */
  setTeamStats: (teamId: string, stats: TeamStats) => {
    set((state) => ({
      teamStats: {
        ...state.teamStats,
        [teamId]: stats,
      },
    }));
  },

  /**
   * Sets members for a team
   * @param teamId Team ID
   * @param members Team members
   */
  setTeamMembers: (teamId: string, members: TeamMember[]) => {
    set((state) => ({
      teamMembers: {
        ...state.teamMembers,
        [teamId]: members,
      },
    }));
  },

  /**
   * Sets the loading state
   * @param isLoading Whether teams are loading
   */
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  /**
   * Sets the error state
   * @param error Error object or null
   */
  setError: (error: Error | null) => {
    set({
      error,
      isLoading: false,
    });

    if (error) {
      handleError(error, ErrorSource.API);
    }
  },

  /**
   * Updates a team with partial data
   * @param team Partial team data with ID
   */
  updateTeam: (team: Partial<Team> & { id: string }) => {
    set((state) => {
      const teamIndex = state.teams.findIndex((t) => t.id === team.id);

      if (teamIndex === -1) {
        return state;
      }

      // Create updated team object
      const updatedTeam = {
        ...state.teams[teamIndex],
        ...team,
      };

      // Create new teams array
      const teams = [...state.teams];
      teams[teamIndex] = updatedTeam;

      // Update active team if needed
      let activeTeam = state.activeTeam;
      if (state.activeTeam?.id === team.id) {
        activeTeam = updatedTeam;
      }

      // Emit team updated event
      emitEvent(EventType.TEAM_UPDATED, { team: updatedTeam });

      return {
        teams,
        activeTeam,
        lastFetchTimes: {
          ...state.lastFetchTimes,
          [team.id]: Date.now(),
        },
      };
    });
  },

  /**
   * Gets a team by ID
   * @param teamId Team ID
   * @returns Team or null if not found
   */
  getTeamById: (teamId: string): Team | null => {
    return get().teams.find((team) => team.id === teamId) || null;
  },

  /**
   * Gets statistics for a team
   * @param teamId Team ID
   * @returns Team statistics or null
   */
  getTeamStats: (teamId: string): TeamStats | null => {
    return get().teamStats[teamId] || null;
  },

  /**
   * Gets members for a team
   * @param teamId Team ID
   * @returns Array of team members
   */
  getTeamMembers: (teamId: string): TeamMember[] => {
    return get().teamMembers[teamId] || [];
  },

  /**
   * Resets the store to initial state
   */
  reset: () => {
    set({
      teams: [],
      activeTeam: null,
      teamStats: {},
      teamMembers: {},
      lastFetchTimes: {},
      isLoading: false,
      error: null,
    });
  },
}));
