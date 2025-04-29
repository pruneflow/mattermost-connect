// src/core/store/teamStore.ts
/**
 * Team store
 * Manages team data, active team, and team-related state
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Team,
  TeamMember,
  TeamStats,
  TeamState,
  ErrorSource,
  EventType,
  TeamStore,
} from "../../types";
import { teamService } from "../services/teamService";
import { createCommonSlice } from "./slices/commonSlice";
import { emitEvent } from "../api/eventUtils";
import { handleError } from "./errorStore";

/**
 * Team store implementation with Zustand
 * Uses immer middleware for immutable state updates
 * Uses subscribeWithSelector for observing state changes
 */
export const useTeamStore = create<TeamState & TeamStore>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<TeamState>(set);

      return {
        // Include common slice for standardized state
        ...commonSlice,

        // Initial state
        teams: [],
        activeTeam: null,
        teamStats: {},
        teamMembers: {},

        /**
         * Sets all teams in the store
         * @param teams Array of teams
         */
        setTeams: (teams: Team[]) => {
          try {
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
              state.lastUpdated = now;
            });

            // Emit teams updated event
            emitEvent(EventType.TEAM_UPDATED, { teams });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setTeams",
              teamCount: teams.length,
            });
          }
        },

        /**
         * Sets a single team in the store
         * @param team Team to set
         */
        setTeam: (team: Team) => {
          try {
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
              state.lastUpdated = now;

              // Clear loading state for this team
              state.loadingIds = state.loadingIds.filter(
                (id: string) => id !== team.id,
              );
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setTeam",
              teamId: team.id,
            });
          }
        },

        /**
         * Removes a team from the store
         * @param teamId Team ID to remove
         */
        removeTeam: (teamId: string) => {
          try {
            set((state) => {
              // Find the team to be removed for event emission
              const teamToRemove = state.teams.find(
                (team: Team) => team.id === teamId,
              );

              if (!teamToRemove) {
                return;
              }

              // Remove team from teams array
              state.teams = state.teams.filter(
                (team: Team) => team.id !== teamId,
              );

              // If removing active team, set a new active team
              if (state.activeTeam?.id === teamId) {
                state.activeTeam =
                  state.teams.length > 0 ? state.teams[0] : null;
              }

              // Remove stats and members for this team
              delete state.teamStats[teamId];
              delete state.teamMembers[teamId];
              delete state.lastFetchTimes[teamId];

              state.lastUpdated = Date.now();

              // Emit team removed event
              emitEvent(EventType.TEAM_DELETED, { teamId, team: teamToRemove });
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "removeTeam",
              teamId,
            });
          }
        },

        /**
         * Sets the active team
         * @param team Team to set as active
         */
        setActiveTeam: (team: Team | null) => {
          try {
            set((state) => {
              // Skip if already active
              if (team?.id === state.activeTeam?.id) {
                return;
              }

              state.activeTeam = team;
              state.lastUpdated = Date.now();

              // Emit team selected event
              if (team) {
                emitEvent(EventType.TEAM_SELECTED, { team });
              }
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setActiveTeam",
              teamId: team?.id,
            });
          }
        },

        /**
         * Sets team statistics
         * @param teamId Team ID
         * @param stats Team statistics
         */
        setTeamStats: (teamId: string, stats: TeamStats) => {
          try {
            set((state) => {
              state.teamStats[teamId] = stats;
              state.lastFetchTimes[`stats_${teamId}`] = Date.now();
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setTeamStats",
              teamId,
            });
          }
        },

        /**
         * Sets team members
         * @param teamId Team ID
         * @param members Team members
         */
        setTeamMembers: (teamId: string, members: TeamMember[]) => {
          try {
            set((state) => {
              state.teamMembers[teamId] = members;
              state.lastFetchTimes[`members_${teamId}`] = Date.now();
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setTeamMembers",
              teamId,
              memberCount: members.length,
            });
          }
        },

        /**
         * Updates a team with partial data
         * @param team Partial team data with ID
         */
        updateTeam: (team: Partial<Team> & { id: string }) => {
          try {
            set((state) => {
              const teamIndex = state.teams.findIndex(
                (t: Team) => t.id === team.id,
              );

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
              state.lastUpdated = Date.now();

              // Emit team updated event
              emitEvent(EventType.TEAM_UPDATED, {
                team: state.teams[teamIndex],
              });
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "updateTeam",
              teamId: team.id,
            });
          }
        },

        /**
         * Clears all teams
         */
        clearTeams: () => {
          try {
            set((state) => {
              state.teams = [];
              state.activeTeam = null;
              state.teamStats = {};
              state.teamMembers = {};
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "clearTeams",
            });
          }
        },

        /**
         * Gets a team by ID
         * @param teamId Team ID
         * @returns Team or null if not found
         */
        getTeamById: (teamId: string): Team | null => {
          try {
            return get().teams.find((team) => team.id === teamId) || null;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getTeamById",
              teamId,
            });
            return null;
          }
        },

        /**
         * Gets statistics for a team
         * @param teamId Team ID
         * @returns Team statistics or null
         */
        getTeamStats: (teamId: string): TeamStats | null => {
          try {
            return get().teamStats[teamId] || null;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getTeamStats",
              teamId,
            });
            return null;
          }
        },

        /**
         * Gets members for a team
         * @param teamId Team ID
         * @returns Array of team members
         */
        getTeamMembers: (teamId: string): TeamMember[] => {
          try {
            return get().teamMembers[teamId] || [];
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getTeamMembers",
              teamId,
            });
            return [];
          }
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          try {
            set((state) => {
              // Reset domain-specific state
              state.teams = [];
              state.activeTeam = null;
              state.teamStats = {};
              state.teamMembers = {};

              // Reset common state from CommonSlice
              state.isLoading = false;
              state.loadingIds = [];
              state.error = null;
              state.errors = [];
              state.lastFetchTimes = {};
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "reset",
            });
          }
        },
      };
    }),
  ),
);

/**
 * Gets a formatted team name using teamService
 * @param teamId Team ID
 * @returns Formatted team name
 */
export function getFormattedTeamName(teamId: string): string {
  try {
    const team = useTeamStore.getState().getTeamById(teamId);
    if (!team) return "";
    return teamService.formatTeam(team).displayName;
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "getFormattedTeamName",
      teamId,
    });
    return "";
  }
}

/**
 * Checks if user has admin permissions in a team
 * @param teamId Team ID
 * @param userId User ID
 * @returns Whether user is a team admin
 */
export function isTeamAdmin(teamId: string, userId: string): boolean {
  try {
    const teamMembers = useTeamStore.getState().getTeamMembers(teamId);
    const member = teamMembers.find((m) => m.user_id === userId);
    if (!member) return false;
    return teamService.isTeamAdmin(member);
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "isTeamAdmin",
      teamId,
      userId,
    });
    return false;
  }
}
