// src/core/store/teamStore.ts
/**
 * Team store
 * Manages team data and state
 */
import { create } from "zustand";
import { Team, TeamMember, TeamStats, ErrorSource } from "../../types";
import { handleError } from "./errorStore";
import { createLoadingSlice } from "./storeUtils";

/**
 * Team state interface
 */
export interface TeamState {
  // Data
  teams: Team[];
  activeTeam: Team | null;
  teamStats: Record<string, TeamStats>;
  teamMembers: Record<string, TeamMember[]>;
  lastFetchTimes: Record<string, number>;

  // Loading/Error
  isLoading: boolean;
  loadingIds: string[];
  error: Error | null;
  errors: Record<string, Error | null>;

  // Actions
  setTeams: (teams: Team[]) => void;
  setTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
  setActiveTeam: (team: Team | null) => void;
  setTeamStats: (teamId: string, stats: TeamStats) => void;
  setTeamMembers: (teamId: string, members: TeamMember[]) => void;
  updateTeam: (team: Partial<Team> & { id: string }) => void;
  clearTeams: () => void;

  // Selectors
  getTeamById: (teamId: string) => Team | null;
  getTeamStats: (teamId: string) => TeamStats | null;
  getTeamMembers: (teamId: string) => TeamMember[];

  // Reset
  reset: () => void;
}

/**
 * Creates the team store
 */
export const useTeamStore = create<TeamState>((set, get) => ({
  // Initial state
  teams: [],
  activeTeam: null,
  teamStats: {},
  teamMembers: {},
  lastFetchTimes: {},

  // Include loading/error slice
  ...createLoadingSlice<any>(set),

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
      }

      // Remove stats and members for this team
      const { [teamId]: _, ...teamStats } = state.teamStats;
      const { [teamId]: __, ...teamMembers } = state.teamMembers;

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
   * @param team Team to set as active
   */
  setActiveTeam: (team: Team | null) => {
    set((state) => {
      // Skip if already active
      if (team?.id === state.activeTeam?.id) {
        return state;
      }

      return { activeTeam: team };
    });
  },

  /**
   * Sets team statistics
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
   * Sets team members
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
   * Clears all teams
   */
  clearTeams: () => {
    set({
      teams: [],
      activeTeam: null,
      teamStats: {},
      teamMembers: {},
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
      loadingIds: [],
      error: null,
      errors: {},
    });
  },
}));
