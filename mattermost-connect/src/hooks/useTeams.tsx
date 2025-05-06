// src/hooks/useTeams.tsx
/**
 * Team hooks
 * Provides access to team functionality
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useTeamsQuery,
  useTeamQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useTeamStatsQuery,
  useTeamMembersQuery,
} from "../core/api/queries/teamQueries";
import { useTeamStore } from "../core/store/teamStore";
import { teamService } from "../core/services/teamService";
import {
  Team,
  TeamMember,
  CreateTeamParams,
  UpdateTeamParams,
  TeamStats,
  FormattedTeam,
} from "../types";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for team management functionality
 * @returns Team operations and data
 */
export function useTeams() {
  // Get teams using React Query
  const teamsQuery = useTeamsQuery();

  // Get team state from store
  const {
    teams,
    activeTeam,
    isLoading: storeLoading,
    error: storeError,
  } = useTeamStore();

  const setActiveTeam = useCallback((team: Team) => {
    return useTeamStore.getState().setActiveTeam(team);
  }, []);

  // Computed values with useMemo
  const formattedTeams = useMemo(() => {
    return teams.map((team) => teamService.formatTeam(team));
  }, [teams]);

  /**
   * Sets the active team
   * @param team Team to make active
   */
  const selectTeam = useCallback(
    (team: Team) => {
      // Check if team is already active to prevent unnecessary updates
      if (activeTeam && activeTeam.id === team.id) {
        return;
      }
      setActiveTeam(team);
    },
    [setActiveTeam, activeTeam],
  );

  /**
   * Refreshes team data
   */
  const refreshTeams = useCallback(() => {
    return teamsQuery.refetch();
  }, [teamsQuery]);

  return {
    // Data
    teams,
    formattedTeams,
    activeTeam,

    // State
    isLoading: teamsQuery.isLoading || storeLoading,
    isFetching: teamsQuery.isFetching,
    error: teamsQuery.error || storeError,

    // Actions
    selectTeam,
    refreshTeams,
    setActiveTeam,
  };
}

/**
 * Hook for a specific team
 * @param teamId Team ID
 * @returns Team data and operations
 */
export function useTeam(teamId: string | undefined) {
  // Get specific team using React Query
  const teamQuery = useTeamQuery(teamId);

  // Get team stats
  const statsQuery = useTeamStatsQuery(teamId);

  // Get team members
  const membersQuery = useTeamMembersQuery(teamId);

  // Team store access
  const { getTeamById, updateTeam, removeTeam } = useTeamStore();

  // Update team mutation
  const updateMutation = useUpdateTeamMutation();

  // Delete team mutation
  const deleteMutation = useDeleteTeamMutation();

  // Current team from store or query
  const team = useMemo(() => {
    if (!teamId) return null;
    return getTeamById(teamId) || teamQuery.data || null;
  }, [teamId, getTeamById, teamQuery.data]);

  // Formatted team with consistent display properties
  const formattedTeam = useMemo(() => {
    if (!team) return null;
    return teamService.formatTeam(team);
  }, [team]);

  /**
   * Updates the team
   * @param updateData Team update data
   */
  const update = useCallback(
    async (updateData: UpdateTeamParams) => {
      if (!teamId) return null;
      try {
        return await updateMutation.mutateAsync({
          teamId,
          teamData: updateData,
        });
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        throw error;
      }
    },
    [teamId, updateMutation],
  );

  /**
   * Deletes the team
   */
  const deleteTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      await deleteMutation.mutateAsync(teamId);
    } catch (error) {
      handleError(error as Error, ErrorSource.API);
      throw error;
    }
  }, [teamId, deleteMutation]);

  /**
   * Refreshes team data
   */
  const refreshTeam = useCallback(() => {
    return teamQuery.refetch();
  }, [teamQuery]);

  /**
   * Refreshes team stats
   */
  const refreshStats = useCallback(() => {
    return statsQuery.refetch();
  }, [statsQuery]);

  /**
   * Refreshes team members
   */
  const refreshMembers = useCallback(() => {
    return membersQuery.refetch();
  }, [membersQuery]);

  // Normalized members with user data
  const formattedMembers = useMemo(() => {
    if (!membersQuery.data) return [];

    // Combine with user data from user store when needed
    // Using teamService to format members consistently
    return teamService.formatTeamMembers(membersQuery.data, {});
  }, [membersQuery.data]);

  return {
    // Data
    team,
    formattedTeam,
    stats: statsQuery.data,
    members: membersQuery.data || [],
    formattedMembers,

    // State
    isLoading:
      teamQuery.isLoading || statsQuery.isLoading || membersQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingMembers: membersQuery.isLoading,
    error: teamQuery.error || statsQuery.error || membersQuery.error,

    // Actions
    update,
    deleteTeam,
    refreshTeam,
    refreshStats,
    refreshMembers,

    // Mutations state
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}

/**
 * Hook for team creation
 * @returns Team creation functionality
 */
export function useTeamCreation() {
  // Create team mutation
  const createMutation = useCreateTeamMutation();

  /**
   * Creates a new team
   * @param teamData Team creation data
   */
  const createTeam = useCallback(
    async (teamData: CreateTeamParams): Promise<Team> => {
      try {
        return await createMutation.mutateAsync(teamData);
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        throw error;
      }
    },
    [createMutation],
  );

  /**
   * Validates team name for creation
   * @param name Team name to validate
   */
  const validateTeamName = useCallback((name: string): boolean => {
    return teamService.validateTeamName(name);
  }, []);

  /**
   * Creates URL-friendly team name from display name
   * @param displayName Display name
   */
  const sanitizeTeamName = useCallback((displayName: string): string => {
    return teamService.sanitizeTeamName(displayName);
  }, []);

  return {
    // Actions
    createTeam,
    validateTeamName,
    sanitizeTeamName,

    // State
    isCreating: createMutation.isPending,
    error: createMutation.error,
  };
}
