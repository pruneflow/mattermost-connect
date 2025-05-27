import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../api/client';
import { Team, TeamMember } from '../api/types';
import { useActiveSelections } from './useActiveSelections';

// Query keys
export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...teamKeys.lists(), filters] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
};

/**
 * Get all teams the current user is a member of
 */
export function useTeams() {
  const queryClient = useQueryClient();
  
  // Auto-selection logic integration
  const { activeTeam, setActiveTeam, autoSelectFirstTeam } = useActiveSelections();

  // Fetch teams query
  const teamsQuery = useQuery({
    queryKey: teamKeys.lists(),
    queryFn: async () => {
      const response = await api.get<Team[]>('users/me/teams');
      return response.data;
    },
  });

  // Auto-select first team when teams are loaded
  useEffect(() => {
    const teams = teamsQuery.data || [];
    
    // Only auto-select if teams are loaded and query is not loading
    if (teams.length > 0 && !teamsQuery.isLoading) {
      autoSelectFirstTeam(teams);
    }
  }, [teamsQuery.data, teamsQuery.isLoading, autoSelectFirstTeam]);

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (newTeam: Partial<Team>) => {
      const response = await api.post<Team>('teams', newTeam);
      return response.data;
    },
    onSuccess: (newTeam) => {
      // Invalidate teams cache
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      
      // Add the new team to the cache
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (oldTeams = []) => {
        return [...oldTeams, newTeam];
      });
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Team> & { id: string }) => {
      const response = await api.put<Team>(`teams/${id}`, updates);
      return response.data;
    },
    onSuccess: (updatedTeam) => {
      // Update team in cache
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (oldTeams = []) => {
        return oldTeams.map((team) => 
          team.id === updatedTeam.id ? updatedTeam : team
        );
      });

      // Update individual team cache
      queryClient.setQueryData(
        teamKeys.detail(updatedTeam.id),
        updatedTeam
      );
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      await api.delete(`teams/${teamId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Update teams cache
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (oldTeams = []) => {
        return oldTeams.filter((team) => team.id !== teamId);
      });

      // Remove team from cache
      queryClient.removeQueries({ queryKey: teamKeys.detail(teamId) });
    },
  });

  return {
    teams: teamsQuery.data || [],
    isLoading: teamsQuery.isLoading,
    isError: teamsQuery.isError,
    error: teamsQuery.error,
    refetch: teamsQuery.refetch,
    
    // Active selections from global state
    activeTeam,
    setActiveTeam,
    
    createTeam: createTeamMutation.mutateAsync,
    isCreating: createTeamMutation.isPending,
    
    updateTeam: updateTeamMutation.mutateAsync,
    isUpdating: updateTeamMutation.isPending,
    
    deleteTeam: deleteTeamMutation.mutateAsync,
    isDeleting: deleteTeamMutation.isPending,
  };
}

/**
 * Get a specific team by ID
 */
export function useTeam(teamId: string | undefined) {
  const queryClient = useQueryClient();

  // Skip query if teamId is undefined
  const enabled = !!teamId;

  // Fetch team query
  const teamQuery = useQuery({
    queryKey: teamKeys.detail(teamId || ''),
    queryFn: async () => {
      const response = await api.get<Team>(`teams/${teamId}`);
      return response.data;
    },
    enabled,
  });

  // Fetch team members
  const membersQuery = useQuery({
    queryKey: [...teamKeys.detail(teamId || ''), 'members'],
    queryFn: async () => {
      const response = await api.get<TeamMember[]>(`teams/${teamId}/members`);
      return response.data;
    },
    enabled,
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (updates: Partial<Team>) => {
      if (!teamId) {
        throw new Error('Team ID is required to update a team');
      }
      
      const response = await api.put<Team>(`teams/${teamId}`, updates);
      return response.data;
    },
    onSuccess: (updatedTeam) => {
      // Update team in cache
      queryClient.setQueryData(
        teamKeys.detail(updatedTeam.id),
        updatedTeam
      );

      // Update team in list cache
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (oldTeams = []) => {
        return oldTeams.map((team) => 
          team.id === updatedTeam.id ? updatedTeam : team
        );
      });
    },
  });

  // Join team mutation
  const joinTeamMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) {
        throw new Error('Team ID is required to join a team');
      }
      
      const response = await api.post<TeamMember>(`teams/${teamId}/members`, {
        team_id: teamId,
        user_id: 'me',
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate team members
      queryClient.invalidateQueries({ queryKey: [...teamKeys.detail(teamId || ''), 'members'] });
    },
  });

  // Leave team mutation
  const leaveTeamMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) {
        throw new Error('Team ID is required to leave a team');
      }
      
      await api.delete(`teams/${teamId}/members/me`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Update teams cache to remove team
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (oldTeams = []) => {
        return oldTeams.filter((team) => team.id !== teamId);
      });
      
      // Remove team from cache
      queryClient.removeQueries({ queryKey: teamKeys.detail(teamId) });
    },
  });

  return {
    team: teamQuery.data,
    members: membersQuery.data || [],
    isLoading: teamQuery.isLoading || membersQuery.isLoading,
    isError: teamQuery.isError,
    error: teamQuery.error,
    refetch: teamQuery.refetch,
    refetchMembers: membersQuery.refetch,
    
    updateTeam: updateTeamMutation.mutateAsync,
    isUpdating: updateTeamMutation.isPending,
    
    joinTeam: joinTeamMutation.mutateAsync,
    isJoining: joinTeamMutation.isPending,
    
    leaveTeam: leaveTeamMutation.mutateAsync,
    isLeaving: leaveTeamMutation.isPending,
  };
}