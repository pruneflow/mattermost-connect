// src/hooks/useTeams.tsx
/**
 * Hooks for team functionality
 * Provides optimized React hooks for working with teams
 */
import { useCallback, useMemo } from "react";
import {
  Team,
  TeamMember,
  TeamStats,
  FormattedTeam,
  CreateTeamParams,
  UpdateTeamParams,
  ApiError,
} from "../types";
import { useTeamStore } from "../core/store";
import { teamService } from "../core/services/teamService";
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
  useSearchTeamsQuery,
  useTeamInviteInfoQuery,
} from "../core/api/queries/teamQueries";

/**
 * Hook that provides teams functionality
 * Combines store and API access for teams
 * @returns Teams state and actions
 */
export function useTeams() {
  // Get state from store
  const { teams, activeTeam, isLoading, error, setActiveTeam, getTeamById } =
    useTeamStore();

  // Get teams query
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

  /**
   * Gets formatted teams for UI display
   */
  const formattedTeams = useMemo<FormattedTeam[]>(() => {
    return teamService.formatTeams(teams);
  }, [teams]);

  /**
   * Gets alphabetically sorted teams
   */
  const sortedTeams = useMemo<Team[]>(() => {
    return teamService.sortTeams(teams);
  }, [teams]);

  return {
    // State
    teams,
    formattedTeams,
    sortedTeams,
    activeTeam,
    isLoading: isLoading || teamsQuery.isLoading || teamsQuery.isFetching,
    error: error || teamsQuery.error,

    // Actions
    setActiveTeam,
    setActiveTeamById,
    refreshTeams,
    getTeamById,

    // Query states
    isRefreshing: teamsQuery.isRefetching,
  };
}

/**
 * Interface for team detail return
 */
export interface TeamDetailResult {
  team: Team | null;
  stats: TeamStats | null;
  members: TeamMember[];
  isLoading: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isLeaving: boolean;
  error: ApiError | null;
  updateTeam: (data: UpdateTeamParams) => Promise<Team>;
  deleteTeam: () => Promise<string>;
  leaveTeam: () => Promise<string>;
  setAsActive: () => void;
  refreshTeam: () => Promise<Team | null>;
  refreshStats: () => Promise<TeamStats | null>;
  refreshMembers: () => Promise<TeamMember[] | null>;
  getMemberById: (userId: string) => TeamMember | undefined;
  getFormattedTeam: () => FormattedTeam;
}

/**
 * Hook that provides functionality for a specific team
 * @param teamId Team ID
 * @returns Team detail state and actions
 */
export function useTeam(teamId: string | undefined): TeamDetailResult {
  // Get state from store
  const { setActiveTeam, getTeamById, getTeamMembers } = useTeamStore();

  // Get team queries
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
    async (teamData: UpdateTeamParams) => {
      if (!teamId) {
        throw new Error("Team ID is required for update");
      }

      return updateTeamMutation.mutateAsync({
        teamId,
        teamData,
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

  /**
   * Refreshes the team stats
   * @returns Promise resolving to the refreshed team stats
   */
  const refreshStats = useCallback(async () => {
    return teamStatsQuery.refetch().then((result) => result.data || null);
  }, [teamStatsQuery]);

  /**
   * Refreshes the team members
   * @returns Promise resolving to the refreshed team members
   */
  const refreshMembers = useCallback(async () => {
    return teamMembersQuery.refetch().then((result) => result.data || null);
  }, [teamMembersQuery]);

  /**
   * Gets a team member by user ID
   * @param userId User ID
   * @returns Team member or undefined if not found
   */
  const getMemberById = useCallback(
    (userId: string) => {
      if (!teamId) return undefined;
      const members = getTeamMembers(teamId);
      return members.find((member) => member.user_id === userId);
    },
    [teamId, getTeamMembers],
  );

  /**
   * Gets formatted team data for UI
   * @returns Formatted team data
   */
  const getFormattedTeam = useCallback(() => {
    const team = teamQuery.data;
    if (!team) {
      return {
        id: teamId || "",
        name: "",
        displayName: "Loading...",
        description: "",
        type: "O" as const,
        isOpen: true,
        memberCount: null,
        url: "",
      };
    }
    return teamService.formatTeam(team);
  }, [teamId, teamQuery.data]);

  return {
    // State
    team: teamQuery.data || null,
    stats: teamStatsQuery.data || null,
    members: teamMembersQuery.data || [],
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
    refreshStats,
    refreshMembers,
    getMemberById,
    getFormattedTeam,
  };
}

/**
 * Hook that provides team creation and joining functionality
 * @returns Team creation and joining actions and state
 */
export function useTeamCreation() {
  // Get team creation and join mutations
  const createTeamMutation = useCreateTeamMutation();
  const joinTeamMutation = useJoinTeamMutation();

  // Get invite info query hook generator
  const getTeamInviteInfoQuery = (inviteId: string) =>
    useTeamInviteInfoQuery(inviteId);

  /**
   * Creates a new team
   * @param teamData Team data to create
   * @returns Promise resolving to the created team
   */
  const createTeam = useCallback(
    async (teamData: CreateTeamParams) => {
      // Validate team name
      if (!teamService.validateTeamName(teamData.name)) {
        throw new Error("Invalid team name format");
      }

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

  /**
   * Creates a URL-friendly team name from display name
   * @param displayName Display name
   * @returns URL-friendly team name
   */
  const generateTeamName = useCallback((displayName: string) => {
    return teamService.sanitizeTeamName(displayName);
  }, []);

  /**
   * Validates a team name
   * @param name Team name
   * @returns Whether the name is valid
   */
  const validateTeamName = useCallback((name: string) => {
    return teamService.validateTeamName(name);
  }, []);

  /**
   * Gets information about a team invite
   * @param inviteId Invite ID
   * @returns Query for team invite info
   */
  const getInviteInfo = useCallback((inviteId: string) => {
    return getTeamInviteInfoQuery(inviteId);
  }, []);

  return {
    // State
    isCreating: createTeamMutation.isPending,
    isJoining: joinTeamMutation.isPending,
    createError: createTeamMutation.error,
    joinError: joinTeamMutation.error,

    // Actions
    createTeam,
    joinTeamByInvite,
    generateTeamName,
    validateTeamName,
    getInviteInfo,
  };
}

/**
 * Hook that provides team search functionality
 * @param searchTerm Search term
 * @returns Search results and state
 */
export function useTeamSearch(searchTerm: string | undefined) {
  // Get search query
  const searchQuery = useSearchTeamsQuery(searchTerm);

  /**
   * Refreshes search results
   * @returns Promise resolving to the refreshed search results
   */
  const refreshResults = useCallback(async () => {
    return searchQuery.refetch().then((result) => result.data || []);
  }, [searchQuery]);

  /**
   * Gets formatted search results
   */
  const formattedResults = useMemo<FormattedTeam[]>(() => {
    return searchQuery.data ? teamService.formatTeams(searchQuery.data) : [];
  }, [searchQuery.data]);

  return {
    results: searchQuery.data || [],
    formattedResults,
    isLoading: searchQuery.isLoading || searchQuery.isFetching,
    error: searchQuery.error,
    refreshResults,
  };
}
