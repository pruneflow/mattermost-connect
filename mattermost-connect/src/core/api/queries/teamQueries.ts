// src/core/api/queries/teamQueries.ts
/**
 * React Query hooks for team operations
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { Team, TeamMember, TeamStats } from "../../types";
import { useTeamStore } from "../../store/teamStore";
import { createQueryOptions, createMutationOptions } from "../queryUtils";

/**
 * Fetches all teams for the current user
 * @returns Query hook for teams
 */
export const useTeamsQuery = () => {
  const { setTeams, setLoading, setError } = useTeamStore();

  return useQuery({
    queryKey: QUERY_KEYS.teams.all,
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

  return useQuery({
    queryKey: teamId ? QUERY_KEYS.teams.byId(teamId) : ["teams", "undefined"],
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
  return useMutation({
    mutationFn: async (teamData: {
      name: string;
      display_name: string;
      type: "O" | "I";
      description?: string;
    }) => {
      const response = await apiClient.post<Team>("teams", teamData);
      return response.data;
    },
    onSuccess: (newTeam) => {
      // Update team store
      const { setTeam } = useTeamStore.getState();
      setTeam(newTeam);

      // Invalidate teams queries
      invalidateQueries.allTeams();
    },
    ...createMutationOptions(),
  });
};

/**
 * Updates an existing team
 */
export const useUpdateTeamMutation = () => {
  return useMutation({
    mutationFn: async ({
      teamId,
      teamData,
    }: {
      teamId: string;
      teamData: Partial<{
        display_name: string;
        description: string;
        company_name: string;
        allowed_domains: string;
        invite_id: string;
        allow_open_invite: boolean;
      }>;
    }) => {
      const response = await apiClient.put<Team>(`teams/${teamId}`, teamData);
      return response.data;
    },
    onSuccess: (updatedTeam) => {
      // Update team in store
      const { updateTeam } = useTeamStore.getState();
      updateTeam(updatedTeam);

      // Invalidate specific team query
      invalidateQueries.team(updatedTeam.id);
    },
    ...createMutationOptions(),
  });
};

/**
 * Deletes a team
 */
export const useDeleteTeamMutation = () => {
  return useMutation({
    mutationFn: async (teamId: string) => {
      await apiClient.delete(`teams/${teamId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Remove team from store
      const { removeTeam } = useTeamStore.getState();
      removeTeam(teamId);

      // Invalidate teams queries
      invalidateQueries.allTeams();
    },
    ...createMutationOptions(),
  });
};

/**
 * Joins a team using an invite code
 */
export const useJoinTeamMutation = () => {
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiClient.post<Team>(`teams/invite/${inviteId}`);
      return response.data;
    },
    onSuccess: (newTeam) => {
      // Update team store
      const { setTeam } = useTeamStore.getState();
      setTeam(newTeam);

      // Invalidate teams queries
      invalidateQueries.allTeams();
    },
    ...createMutationOptions(),
  });
};

/**
 * Leaves a team
 */
export const useLeaveTeamMutation = () => {
  return useMutation({
    mutationFn: async (teamId: string) => {
      await apiClient.delete(`teams/${teamId}/members/me`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Remove team from store
      const { removeTeam } = useTeamStore.getState();
      removeTeam(teamId);

      // Invalidate teams queries
      invalidateQueries.allTeams();
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

  return useQuery({
    queryKey: teamId
      ? QUERY_KEYS.teams.stats(teamId)
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

  return useQuery({
    queryKey: teamId
      ? QUERY_KEYS.teams.members(teamId)
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
