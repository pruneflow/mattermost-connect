// src/core/api/queries/teamQueries.ts
/**
 * React Query hooks for team operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { Team, useTeamStore } from "../../store/teamStore";

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
        const teams = response.data;

        // Update store
        setTeams(teams);

        return teams;
      } catch (error) {
        setError(error as Error);
        throw error;
      }
    },
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep unused data for 30 minutes
    gcTime: 30 * 60 * 1000,
  });
};

/**
 * Fetches a specific team by ID
 * @param teamId Team ID
 * @returns Query hook for a team
 */
export const useTeamQuery = (teamId: string | undefined) => {
  const { setTeams, getTeamById, setLoading, setError } = useTeamStore();

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

      setLoading(true);
      try {
        const response = await apiClient.get<Team>(`teams/${teamId}`);
        const team = response.data;

        // Update store with the single team
        setTeams([team]);

        return team;
      } catch (error) {
        setError(error as Error);
        throw error;
      }
    },
    // Don't run query if teamId is not provided
    enabled: !!teamId,
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Creates a new team
 */
export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient();

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
      // Invalidate and refetch teams queries
      invalidateQueries.allTeams();

      // Update team store
      const { setTeams, teams } = useTeamStore.getState();
      setTeams([...teams, newTeam]);
    },
  });
};

/**
 * Updates an existing team
 */
export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient();

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
      // Invalidate and refetch specific team query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.teams.byId(updatedTeam.id),
      });

      // Update team in store
      const { setTeams, teams } = useTeamStore.getState();
      const updatedTeams = teams.map((team) =>
        team.id === updatedTeam.id ? updatedTeam : team,
      );
      setTeams(updatedTeams);
    },
  });
};

/**
 * Deletes a team
 */
export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await apiClient.delete(`teams/${teamId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Invalidate and refetch teams queries
      invalidateQueries.allTeams();

      // Update team store
      const { setTeams, teams, setActiveTeam, activeTeam } =
        useTeamStore.getState();
      const updatedTeams = teams.filter((team) => team.id !== teamId);
      setTeams(updatedTeams);

      // If the deleted team was active, set a new active team or null
      if (activeTeam?.id === teamId) {
        setActiveTeam(updatedTeams.length > 0 ? updatedTeams[0] : null);
      }
    },
  });
};

/**
 * Joins a team using an invite code
 */
export const useJoinTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiClient.post<Team>(`teams/invite/${inviteId}`);
      return response.data;
    },
    onSuccess: (newTeam) => {
      // Invalidate and refetch teams queries
      invalidateQueries.allTeams();

      // Update team store
      const { setTeams, teams } = useTeamStore.getState();
      if (!teams.some((team) => team.id === newTeam.id)) {
        setTeams([...teams, newTeam]);
      }
    },
  });
};

/**
 * Leaves a team
 */
export const useLeaveTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await apiClient.delete(`teams/${teamId}/members/me`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Invalidate and refetch teams queries
      invalidateQueries.allTeams();

      // Update team store
      const { setTeams, teams, setActiveTeam, activeTeam } =
        useTeamStore.getState();
      const updatedTeams = teams.filter((team) => team.id !== teamId);
      setTeams(updatedTeams);

      // If the left team was active, set a new active team or null
      if (activeTeam?.id === teamId) {
        setActiveTeam(updatedTeams.length > 0 ? updatedTeams[0] : null);
      }
    },
  });
};

/**
 * Fetches team statistics
 * @param teamId Team ID
 * @returns Query hook for team statistics
 */
export const useTeamStatsQuery = (teamId: string | undefined) => {
  return useQuery({
    queryKey: teamId ? ["teamStats", teamId] : ["teamStats", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      const response = await apiClient.get(`teams/${teamId}/stats`);
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetches team members
 * @param teamId Team ID
 * @returns Query hook for team members
 */
export const useTeamMembersQuery = (teamId: string | undefined) => {
  return useQuery({
    queryKey: teamId ? ["teamMembers", teamId] : ["teamMembers", "undefined"],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      const response = await apiClient.get(`teams/${teamId}/members`);
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
