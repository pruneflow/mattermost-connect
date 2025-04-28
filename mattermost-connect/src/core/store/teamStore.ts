// src/core/store/teamStore.ts
/**
 * Team store
 * Manages team data, active team, and team-related state
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Team, TeamMember, TeamStats, TeamState } from "../../types";
import { handleError } from "./errorStore";
import { createLoadingSlice } from "./storeUtils";
import { EventType } from "../../types/common";
import { emitEvent } from "./eventStore";
import { LoadingState, ErrorState } from "../../types/common";

/**
 * Extended team state with actions
 */
interface TeamStoreState extends TeamState {
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

  // Loading/Error State Management
  setLoading: (isLoading: boolean) => void;
  setLoadingId: (id: string, isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setErrorForId: (id: string, error: Error | null) => void;

  // Reset
  reset: () => void;
}

/**
 * Creates the team store with Zustand
 * Using immer middleware for easier nested state updates
 */
export const useTeamStore = create<TeamStoreState>()(
  immer((set, get) => ({
    // Initial state
    teams: [],
    activeTeam: null,
    teamStats: {},
    teamMembers: {},
    lastFetchTimes: {},

    // Loading/error state - defined by createLoadingSlice
    // Include loading/error slice
    ...createLoadingSlice<
      TeamStoreState &
        LoadingState &
        ErrorState & {
          errors: Record<string, Error | null>;
          loadingIds: string[];
        }
    >(set),

    /**
     * Sets all teams in the store
     * @param teams Array of teams
     */
    setTeams: (teams: Team[]) => {
      set((state) => {
        const now = Date.now();

        // Update all teams
        state.teams = teams;

        // Update fetch times for all teams
        teams.forEach((team) => {
          state.lastFetchTimes[team.id] = now;
        });

        // Auto-select first team if none is active
        if (!state.activeTeam && teams.length > 0) {
          state.activeTeam = teams[0];
        }

        // Reset loading state
        state.isLoading = false;
        state.error = null;
      });

      // Emit teams updated event
      emitEvent(EventType.TEAM_UPDATED, { teams });
    },

    /**
     * Sets a single team in the store
     * @param team Team to set
     */
    setTeam: (team: Team) => {
      set((state) => {
        const now = Date.now();

        // Check if team already exists
        const existingTeamIndex = state.teams.findIndex(
          (t: Team) => t.id === team.id,
        );

        if (existingTeamIndex !== -1) {
          // Update existing team
          state.teams[existingTeamIndex] = team;
        } else {
          // Add new team
          state.teams.push(team);

          // Emit team created event
          emitEvent(EventType.TEAM_CREATED, { team });
        }

        // Update fetch time
        state.lastFetchTimes[team.id] = now;
      });
    },

    /**
     * Removes a team from the store
     * @param teamId Team ID to remove
     */
    removeTeam: (teamId: string) => {
      set((state) => {
        // Find the team to be removed
        const teamToRemove = state.teams.find(
          (team: Team) => team.id === teamId,
        );

        if (!teamToRemove) {
          return;
        }

        // Remove team from teams array
        state.teams = state.teams.filter((team: Team) => team.id !== teamId);

        // If removing active team, set a new active team
        if (state.activeTeam?.id === teamId) {
          state.activeTeam = state.teams.length > 0 ? state.teams[0] : null;
        }

        // Remove stats and members for this team
        delete state.teamStats[teamId];
        delete state.teamMembers[teamId];

        // Emit team removed event
        emitEvent(EventType.TEAM_DELETED, { teamId, team: teamToRemove });
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
          return;
        }

        state.activeTeam = team;

        // Emit team selected event
        if (team) {
          emitEvent(EventType.TEAM_SELECTED, { team });
        }
      });
    },

    /**
     * Sets team statistics
     * @param teamId Team ID
     * @param stats Team statistics
     */
    setTeamStats: (teamId: string, stats: TeamStats) => {
      set((state) => {
        state.teamStats[teamId] = stats;
      });
    },

    /**
     * Sets team members
     * @param teamId Team ID
     * @param members Team members
     */
    setTeamMembers: (teamId: string, members: TeamMember[]) => {
      set((state) => {
        state.teamMembers[teamId] = members;
      });
    },

    /**
     * Updates a team with partial data
     * @param team Partial team data with ID
     */
    updateTeam: (team: Partial<Team> & { id: string }) => {
      set((state) => {
        const teamIndex = state.teams.findIndex((t: Team) => t.id === team.id);

        if (teamIndex === -1) {
          return;
        }

        // Update team properties
        state.teams[teamIndex] = {
          ...state.teams[teamIndex],
          ...team,
        };

        // Update active team if needed
        if (state.activeTeam?.id === team.id) {
          state.activeTeam = state.teams[teamIndex];
        }

        // Update fetch time
        state.lastFetchTimes[team.id] = Date.now();

        // Emit team updated event
        emitEvent(EventType.TEAM_UPDATED, { team: state.teams[teamIndex] });
      });
    },

    /**
     * Clears all teams
     */
    clearTeams: () => {
      set((state) => {
        state.teams = [];
        state.activeTeam = null;
        state.teamStats = {};
        state.teamMembers = {};
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
      set((state) => {
        state.teams = [];
        state.activeTeam = null;
        state.teamStats = {};
        state.teamMembers = {};
        state.lastFetchTimes = {};
        state.isLoading = false;
        state.loadingIds = [];
        state.error = null;
        state.errors = {};
      });
    },
  })),
);
