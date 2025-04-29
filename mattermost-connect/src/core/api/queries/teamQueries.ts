// src/core/api/queries/teamQueries.ts
/**
 * React Query hooks for team operations
 * Standardized queries using React Query
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { emitEvent } from "../../api/eventUtils";
import { EventType, ErrorSource } from "../../../types";
import { createQueryOptions, createMutationOptions } from "../queryUtils";
import { useTeamStore } from "../../store";
import { handleError } from "../../store/errorStore";
import { teamService } from "../../services/teamService";

import {
  Team,
  TeamMember,
  TeamStats,
  CreateTeamParams,
  UpdateTeamParams,
  ApiError,
} from "../../../types";

// Team-specific query keys
const TEAM_QUERY_KEYS = {
  all: ["teams"],
  byId: (id: string) => ["teams", id],
  stats: (id: string) => ["teams", "stats", id],
  members: (id: string) => ["teams", "members", id],
  search: (term: string) => ["teams", "search", term],
  invite: (inviteId: string) => ["teams", "invite", inviteId],
};

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
        const teams = response.data;

        // Update store with fetched teams
        setTeams(teams);

        return teams;
      } catch (error) {
        setError(error as Error);
        handleError(error as Error, ErrorSource.API);
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
        const team = response.data;

        // Update store with fetched team
        setTeam(team);

        return team;
      } catch (error) {
        setErrorForId(teamId, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          teamId,
          method: "fetchTeam",
        });
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

      // Emit team created event
      teamService.notifyTeamUpdate(newTeam, "created");
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

      // Emit team updated event
      teamService.notifyTeamUpdate(updatedTeam, "updated");
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
      const team = useTeamStore.getState().getTeamById(teamId);
      if (!team) {
        throw new Error("Team not found");
      }

      await apiClient.delete(`teams/${teamId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Get team before removing from store
      const team = useTeamStore.getState().getTeamById(teamId);

      // Remove team from store
      const { removeTeam } = useTeamStore.getState();
      removeTeam(teamId);

      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      queryClient.removeQueries({ queryKey: TEAM_QUERY_KEYS.byId(teamId) });

      // Emit team deleted event
      if (team) {
        teamService.notifyTeamUpdate(team, "deleted");
      }
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

      // Emit team joined event
      teamService.notifyTeamUpdate(newTeam, "joined");
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
      const team = useTeamStore.getState().getTeamById(teamId);
      if (!team) {
        throw new Error("Team not found");
      }

      await apiClient.delete(`teams/${teamId}/members/me`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Get team before removing from store
      const team = useTeamStore.getState().getTeamById(teamId);

      // Remove team from store
      const { removeTeam } = useTeamStore.getState();
      removeTeam(teamId);

      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      queryClient.removeQueries({ queryKey: TEAM_QUERY_KEYS.byId(teamId) });

      // Emit team left event
      if (team) {
        teamService.notifyTeamUpdate(team, "left");
      }
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
  const { setTeamStats, setLoadingId, setErrorForId } = useTeamStore();

  return useQuery<TeamStats, ApiError>({
    queryKey: teamId
      ? TEAM_QUERY_KEYS.stats(teamId)
      : ["teamStats", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      setLoadingId(`stats_${teamId}`, true);
      try {
        const response = await apiClient.get<TeamStats>(
          `teams/${teamId}/stats`,
        );
        const stats = response.data;

        // Update store with team stats
        setTeamStats(teamId, stats);

        return stats;
      } catch (error) {
        setErrorForId(`stats_${teamId}`, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          teamId,
          method: "fetchTeamStats",
        });
        throw error;
      } finally {
        setLoadingId(`stats_${teamId}`, false);
      }
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
  const { setTeamMembers, setLoadingId, setErrorForId } = useTeamStore();

  return useQuery<TeamMember[], ApiError>({
    queryKey: teamId
      ? TEAM_QUERY_KEYS.members(teamId)
      : ["teamMembers", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      setLoadingId(`members_${teamId}`, true);
      try {
        const response = await apiClient.get<TeamMember[]>(
          `teams/${teamId}/members`,
        );
        const members = response.data;

        // Update store with team members
        setTeamMembers(teamId, members);

        return members;
      } catch (error) {
        setErrorForId(`members_${teamId}`, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          teamId,
          method: "fetchTeamMembers",
        });
        throw error;
      } finally {
        setLoadingId(`members_${teamId}`, false);
      }
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
  const { setLoading, setError } = useTeamStore();

  return useQuery<Team[], ApiError>({
    queryKey: ["teams", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      setLoading(true);
      try {
        const response = await apiClient.post<Team[]>(`teams/search`, {
          term: searchTerm,
        });
        return response.data;
      } catch (error) {
        setError(error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          searchTerm,
          method: "searchTeams",
        });
        throw error;
      } finally {
        setLoading(false);
      }
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
  const { setLoading, setError } = useTeamStore();

  return useQuery<{ name: string; display_name: string; id: string }, ApiError>(
    {
      queryKey: ["teams", "invite", inviteId],
      queryFn: async () => {
        if (!inviteId) {
          throw new Error("Invite ID is required");
        }

        setLoading(true);
        try {
          const response = await apiClient.get<{
            name: string;
            display_name: string;
            id: string;
          }>(`teams/invite/${inviteId}`);

          return response.data;
        } catch (error) {
          setError(error as Error);
          handleError(error as Error, ErrorSource.API, undefined, {
            inviteId,
            method: "getTeamInviteInfo",
          });
          throw error;
        } finally {
          setLoading(false);
        }
      },
      enabled: !!inviteId,
      ...createQueryOptions("team", { staleTime: 5 * 60 * 1000 }), // 5 minutes
    },
  );
};
