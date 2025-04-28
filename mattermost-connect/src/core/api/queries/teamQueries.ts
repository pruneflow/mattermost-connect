// src/core/api/queries/teamQueries.ts
/**
 * React Query hooks for team operations
 * Standardized queries using React Query
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { invalidateQueries } from "../queryClient";

// Team-specific query keys
const TEAM_QUERY_KEYS = {
  all: ["teams"],
  byId: (id: string) => ["teams", id],
  stats: (id: string) => ["teams", "stats", id],
  members: (id: string) => ["teams", "members", id],
};
import {
  Team,
  TeamMember,
  TeamStats,
  CreateTeamParams,
  UpdateTeamParams,
  ApiError,
} from "../../../types";
import { useTeamStore } from "../../store";
import { createQueryOptions, createMutationOptions } from "../queryUtils";

/**
 * Fetches all teams for the current user
 * @returns Query hook for teams
 */
export const useTeamsQuery = () => {
  const { setTeams, setLoading, setError } = useTeamStore();

  return useQuery<Team[], ApiError>({
    queryKey: TEAM_QUERY_KEYS.all,
    queryFn: async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<Team[]>("users/me/teams");

        // Update store with fetched teams
        setTeams(response.data);

        return response.data;
      } catch (error) {
        setError(error as Error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    ...createQueryOptions("team"),
  });
};

/**
 * Fetches a specific team by ID
 * @param teamId Team ID
 * @returns Query hook for a team
 */
export const useTeamQuery = (teamId: string | undefined) => {
  const { setTeam, setLoadingId, setErrorForId, getTeamById } = useTeamStore();

  return useQuery<Team, ApiError>({
    queryKey: teamId ? TEAM_QUERY_KEYS.byId(teamId) : ["teams", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      // Check if team is already in store
      const cachedTeam = getTeamById(teamId);
      if (cachedTeam) {
        return cachedTeam;
      }

      setLoadingId(teamId, true);
      try {
        const response = await apiClient.get<Team>(`teams/${teamId}`);

        // Update store with fetched team
        setTeam(response.data);

        return response.data;
      } catch (error) {
        setErrorForId(teamId, error as Error);
        throw error;
      } finally {
        setLoadingId(teamId, false);
      }
    },
    enabled: !!teamId,
    ...createQueryOptions("team"),
  });
};

/**
 * Creates a new team
 */
export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Team, ApiError, CreateTeamParams>({
    mutationFn: async (teamData) => {
      const response = await apiClient.post<Team>("teams", teamData);
      return response.data;
    },
    onSuccess: (newTeam) => {
      // Update team store
      const { setTeam } = useTeamStore.getState();
      setTeam(newTeam);

      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
    },
    ...createMutationOptions(),
  });
};

/**
 * Updates an existing team
 */
export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Team,
    ApiError,
    { teamId: string; teamData: UpdateTeamParams }
  >({
    mutationFn: async ({ teamId, teamData }) => {
      const response = await apiClient.put<Team>(`teams/${teamId}`, teamData);
      return response.data;
    },
    onSuccess: (updatedTeam) => {
      // Update team in store
      const { updateTeam } = useTeamStore.getState();
      updateTeam(updatedTeam);

      // Invalidate specific team query
      queryClient.invalidateQueries({
        queryKey: TEAM_QUERY_KEYS.byId(updatedTeam.id),
      });
    },
    ...createMutationOptions(),
  });
};

/**
 * Deletes a team
 */
export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<string, ApiError, string>({
    mutationFn: async (teamId) => {
      await apiClient.delete(`teams/${teamId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Remove team from store
      const { removeTeam } = useTeamStore.getState();
      removeTeam(teamId);

      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      queryClient.removeQueries({ queryKey: TEAM_QUERY_KEYS.byId(teamId) });
    },
    ...createMutationOptions(),
  });
};

/**
 * Joins a team using an invite code
 */
export const useJoinTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Team, ApiError, string>({
    mutationFn: async (inviteId) => {
      const response = await apiClient.post<Team>(`teams/invite/${inviteId}`);
      return response.data;
    },
    onSuccess: (newTeam) => {
      // Update team store
      const { setTeam } = useTeamStore.getState();
      setTeam(newTeam);

      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
    },
    ...createMutationOptions(),
  });
};

/**
 * Leaves a team
 */
export const useLeaveTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<string, ApiError, string>({
    mutationFn: async (teamId) => {
      await apiClient.delete(`teams/${teamId}/members/me`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Remove team from store
      const { removeTeam } = useTeamStore.getState();
      removeTeam(teamId);

      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      queryClient.removeQueries({ queryKey: TEAM_QUERY_KEYS.byId(teamId) });
    },
    ...createMutationOptions(),
  });
};

/**
 * Fetches team statistics
 * @param teamId Team ID
 * @returns Query hook for team statistics
 */
export const useTeamStatsQuery = (teamId: string | undefined) => {
  const { setTeamStats } = useTeamStore();

  return useQuery<TeamStats, ApiError>({
    queryKey: teamId
      ? TEAM_QUERY_KEYS.stats(teamId)
      : ["teamStats", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      const response = await apiClient.get<TeamStats>(`teams/${teamId}/stats`);

      // Update store with team stats
      setTeamStats(teamId, response.data);

      return response.data;
    },
    enabled: !!teamId,
    ...createQueryOptions("team", { staleTime: 5 * 60 * 1000 }), // 5 minutes
  });
};

/**
 * Fetches team members
 * @param teamId Team ID
 * @returns Query hook for team members
 */
export const useTeamMembersQuery = (teamId: string | undefined) => {
  const { setTeamMembers } = useTeamStore();

  return useQuery<TeamMember[], ApiError>({
    queryKey: teamId
      ? TEAM_QUERY_KEYS.members(teamId)
      : ["teamMembers", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      const response = await apiClient.get<TeamMember[]>(
        `teams/${teamId}/members`,
      );

      // Update store with team members
      setTeamMembers(teamId, response.data);

      return response.data;
    },
    enabled: !!teamId,
    ...createQueryOptions("team", { staleTime: 5 * 60 * 1000 }), // 5 minutes
  });
};

/**
 * Searches for teams
 * @param searchTerm Search term
 * @returns Query hook for team search results
 */
export const useSearchTeamsQuery = (searchTerm: string | undefined) => {
  return useQuery<Team[], ApiError>({
    queryKey: ["teams", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const response = await apiClient.post<Team[]>(`teams/search`, {
        term: searchTerm,
      });

      return response.data;
    },
    enabled: !!searchTerm && searchTerm.trim().length > 0,
    ...createQueryOptions("team", { staleTime: 2 * 60 * 1000 }), // 2 minutes
  });
};

/**
 * Gets information about a team invite
 * @param inviteId Invite ID
 * @returns Query hook for team invite information
 */
export const useTeamInviteInfoQuery = (inviteId: string | undefined) => {
  return useQuery<{ name: string; display_name: string; id: string }, ApiError>(
    {
      queryKey: ["teams", "invite", inviteId],
      queryFn: async () => {
        if (!inviteId) {
          throw new Error("Invite ID is required");
        }

        const response = await apiClient.get<{
          name: string;
          display_name: string;
          id: string;
        }>(`teams/invite/${inviteId}`);

        return response.data;
      },
      enabled: !!inviteId,
      ...createQueryOptions("team", { staleTime: 5 * 60 * 1000 }), // 5 minutes
    },
  );
};
