// src/hooks/useTeams.tsx
/**
 * Hook for team functionality
 */
import { useCallback } from "react";
import { useTeamStore, Team } from "../core/store/teamStore";
import {
  useTeamsQuery,
  useTeamQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useJoinTeamMutation,
  useLeaveTeamMutation,
  useTeamStatsQuery,
  useTeamMembersQuery,
} from "../core/api/queries/teamQueries";

/**
 * Hook that provides team functionality
 * @returns Team state and actions
 */
export function useTeams() {
  // Get state from store
  const {
    teams,
    activeTeam,
    isLoading,
    error,
    setActiveTeam,
    getTeamById,
    updateUnreadCount,
  } = useTeamStore();

  // Get team queries
  const teamsQuery = useTeamsQuery();

  /**
   * Refreshes the teams list
   * @returns Promise resolving to the refreshed teams
   */
  const refreshTeams = useCallback(async () => {
    return teamsQuery.refetch().then((result) => result.data || []);
  }, [teamsQuery]);

  /**
   * Sets the active team by ID
   * @param teamId Team ID
   */
  const setActiveTeamById = useCallback(
    (teamId: string | null) => {
      if (!teamId) {
        setActiveTeam(null);
        return;
      }

      const team = getTeamById(teamId);
      if (team) {
        setActiveTeam(team);
      }
    },
    [getTeamById, setActiveTeam],
  );

  return {
    // State
    teams,
    activeTeam,
    isLoading: isLoading || teamsQuery.isLoading || teamsQuery.isFetching,
    error: error || teamsQuery.error,

    // Actions
    setActiveTeam,
    setActiveTeamById,
    refreshTeams,
    updateUnreadCount,
    getTeamById,

    // Query states
    isRefreshing: teamsQuery.isRefetching,
  };
}

/**
 * Hook that provides functionality for a specific team
 * @param teamId Team ID
 * @returns Team state and actions
 */
export function useTeam(teamId: string | undefined) {
  // Get state from store
  const { setActiveTeam, getTeamById } = useTeamStore();

  // Get team query
  const teamQuery = useTeamQuery(teamId);
  const teamStatsQuery = useTeamStatsQuery(teamId);
  const teamMembersQuery = useTeamMembersQuery(teamId);

  // Get team mutations
  const updateTeamMutation = useUpdateTeamMutation();
  const deleteTeamMutation = useDeleteTeamMutation();
  const leaveTeamMutation = useLeaveTeamMutation();

  /**
   * Updates a team
   * @param teamData Team data to update
   * @returns Promise resolving to the updated team
   */
  const updateTeam = useCallback(
    async (teamData: Partial<Team>) => {
      if (!teamId) {
        throw new Error("Team ID is required for update");
      }

      return updateTeamMutation.mutateAsync({
        teamId,
        teamData: teamData,
      });
    },
    [teamId, updateTeamMutation],
  );

  /**
   * Deletes a team
   * @returns Promise resolving to the deleted team ID
   */
  const deleteTeam = useCallback(async () => {
    if (!teamId) {
      throw new Error("Team ID is required for deletion");
    }

    return deleteTeamMutation.mutateAsync(teamId);
  }, [teamId, deleteTeamMutation]);

  /**
   * Leaves a team
   * @returns Promise resolving to the left team ID
   */
  const leaveTeam = useCallback(async () => {
    if (!teamId) {
      throw new Error("Team ID is required to leave");
    }

    return leaveTeamMutation.mutateAsync(teamId);
  }, [teamId, leaveTeamMutation]);

  /**
   * Sets this team as active
   */
  const setAsActive = useCallback(() => {
    if (teamId) {
      const team = getTeamById(teamId);
      if (team) {
        setActiveTeam(team);
      }
    }
  }, [teamId, getTeamById, setActiveTeam]);

  /**
   * Refreshes the team data
   * @returns Promise resolving to the refreshed team
   */
  const refreshTeam = useCallback(async () => {
    return teamQuery.refetch().then((result) => result.data || null);
  }, [teamQuery]);

  return {
    // State
    team: teamQuery.data,
    stats: teamStatsQuery.data,
    members: teamMembersQuery.data,
    isLoading: teamQuery.isLoading || teamQuery.isFetching,
    isUpdating: updateTeamMutation.isPending,
    isDeleting: deleteTeamMutation.isPending,
    isLeaving: leaveTeamMutation.isPending,
    error: teamQuery.error,

    // Actions
    updateTeam,
    deleteTeam,
    leaveTeam,
    setAsActive,
    refreshTeam,
  };
}

/**
 * Hook that provides team creation functionality
 * @returns Team creation actions and state
 */
export function useTeamCreation() {
  // Get team creation mutation
  const createTeamMutation = useCreateTeamMutation();
  const joinTeamMutation = useJoinTeamMutation();

  /**
   * Creates a new team
   * @param teamData Team data to create
   * @returns Promise resolving to the created team
   */
  const createTeam = useCallback(
    async (teamData: {
      name: string;
      display_name: string;
      type: "O" | "I";
      description?: string;
    }) => {
      return createTeamMutation.mutateAsync(teamData);
    },
    [createTeamMutation],
  );

  /**
   * Joins a team using an invite code
   * @param inviteId Invite code
   * @returns Promise resolving to the joined team
   */
  const joinTeamByInvite = useCallback(
    async (inviteId: string) => {
      return joinTeamMutation.mutateAsync(inviteId);
    },
    [joinTeamMutation],
  );

  return {
    // State
    isCreating: createTeamMutation.isPending,
    isJoining: joinTeamMutation.isPending,
    createError: createTeamMutation.error,
    joinError: joinTeamMutation.error,

    // Actions
    createTeam,
    joinTeamByInvite,
  };
}
