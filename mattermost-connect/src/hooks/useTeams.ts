import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { client } from '../api/client';
import { setCurrentTeamId, setTeams, setTeamUnreads } from '../store/slices/entitiesSlice';
import { useLoading } from './useLoading';
import type { Team } from '../api/types';

export const useTeams = (): {
  teams: Team[];
  teamsById: Record<string, Team>;
  currentTeam: Team | null;
  currentTeamId: string;
  switchTeam: (teamId: string) => void;
  loadTeams: (forceRefresh?: boolean) => Promise<void>;
  loadTeamUnreads: (forceRefresh?: boolean) => Promise<void>;
  getAllTeamsUnread: () => Promise<any[]>; // Legacy compatibility
  isLoadingTeams: boolean;
  isLoadingUnreads: boolean;
  teamsError: string | null;
  unreadsError: string | null;
} => {
  const dispatch = useAppDispatch();
  const { withLoading, isLoading, getError } = useLoading();
  
  // Teams state
  const { currentTeamId, teams, unreads } = useAppSelector(state => state.entities.teams);
  const currentUser = useAppSelector(state => {
    const userId = state.entities.users.currentUserId;
    return userId ? state.entities.users.profiles[userId] : null;
  });

  // Get teams array
  const teamsArray = Object.values(teams);
  const currentTeam = currentTeamId ? teams[currentTeamId] : null;

  const switchTeam = useCallback((teamId: string) => {
    // Follow Mattermost pattern: just dispatch the team ID without validation
    dispatch(setCurrentTeamId(teamId));
  }, [dispatch]);

  // Load teams - Only if forced or really empty
  const loadTeams = useCallback(async (forceRefresh = false) => {
    if (!currentUser) return;

    // Check current teams length without dependency
    const currentTeamsCount = Object.keys(teams).length;
    
    // Don't load if teams exist and not forcing
    if (!forceRefresh && currentTeamsCount > 0) {
      return;
    }

    await withLoading('teams.loadTeams', async () => {
      const teamsData = await client.getMyTeams();
      
      const teamsById: Record<string, Team> = {};
      teamsData.forEach((team: Team) => {
        teamsById[team.id] = team;
      });
      
      dispatch(setTeams(teamsById));
    });
  }, [withLoading, dispatch, currentUser]); // REMOVED teams dependency

  // Load team unread counts - Simple check then load
  const loadTeamUnreads = useCallback(async (forceRefresh = false) => {
    if (!currentUser) return;
    
    // Check current unreads length without dependency
    const currentUnreadsCount = Object.keys(unreads).length;
    
    // Simple check: if we have unreads and not forcing refresh, skip
    if (!forceRefresh && currentUnreadsCount > 0) {
      return;
    }

    await withLoading('teams.loadUnreads', async () => {
      const teamUnreads = await client.getMyTeamUnreads();
      
      const unreadsByTeam: Record<string, { msg_count: number; mention_count: number }> = {};
      teamUnreads.forEach((unread: any) => {
        unreadsByTeam[unread.team_id] = {
          msg_count: unread.msg_count,
          mention_count: unread.mention_count
        };
      });
      
      dispatch(setTeamUnreads(unreadsByTeam));
    });
  }, [withLoading, dispatch, currentUser]); // REMOVED unreads dependency

  const getAllTeamsUnread = useCallback(async () => {
    // Legacy compatibility - calls loadTeamUnreads but returns teams format
    await loadTeamUnreads();
    return teamsArray; // Return teams for backwards compatibility
  }, [loadTeamUnreads, teamsArray]);

  return {
    // State
    teams: teamsArray,
    teamsById: teams,
    currentTeam,
    currentTeamId,
    
    // Actions
    switchTeam,
    loadTeams,
    loadTeamUnreads,
    getAllTeamsUnread, // Legacy compatibility
    
    // Loading states
    isLoadingTeams: isLoading('teams.loadTeams'),
    isLoadingUnreads: isLoading('teams.loadUnreads'),
    teamsError: getError('teams.loadTeams'),
    unreadsError: getError('teams.loadUnreads'),
  };
};

export default useTeams;