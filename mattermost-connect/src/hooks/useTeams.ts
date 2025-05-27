import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { Client4 } from '../api/client';
import { setCurrentTeamId, setTeams, setTeamUnreads } from '../store/slices/entitiesSlice';
import type { Team } from '../api/types';

export const useTeams = (): {
  teams: Team[];
  teamsById: Record<string, Team>;
  currentTeam: Team | null;
  currentTeamId: string;
  loadTeams: () => Promise<Team[] | undefined>;
  loadTeamUnreads: () => Promise<any[]>;
  switchTeam: (teamId: string) => void;
  getAllTeamsUnread: () => Promise<any[]>;
} => {
  const dispatch = useAppDispatch();
  
  // Teams state
  const { currentTeamId, teams } = useAppSelector(state => state.entities.teams);
  const currentUser = useAppSelector(state => {
    const userId = state.entities.users.currentUserId;
    return userId ? state.entities.users.profiles[userId] : null;
  });

  // Get teams array
  const teamsArray = Object.values(teams);
  const currentTeam = currentTeamId ? teams[currentTeamId] : null;

  // Actions
  const loadTeams = useCallback(async () => {
    try {
      if (!currentUser) return;
      
      const userTeams = await Client4.getTeamsForUser(currentUser.id);
      
      // Convert array to normalized object
      const teamsById = userTeams.reduce((acc: Record<string, Team>, team: Team) => {
        acc[team.id] = team;
        return acc;
      }, {});
      
      dispatch(setTeams(teamsById));
      
      // Set first team as current if none selected
      if (!currentTeamId && userTeams.length > 0) {
        dispatch(setCurrentTeamId(userTeams[0].id));
      }
      
      return userTeams;
    } catch (error) {
      console.error('Failed to load teams:', error);
      throw error;
    }
  }, [dispatch, currentUser, currentTeamId]);

  const switchTeam = useCallback((teamId: string) => {
    if (teams[teamId]) {
      dispatch(setCurrentTeamId(teamId));
    }
  }, [dispatch, teams]);

  // Load team unread counts into Redux store
  const loadTeamUnreads = useCallback(async () => {
    try {
      if (!currentUser) return [];
      
      const teamUnreads = await Client4.getMyTeamUnreads();
      
      // Convert to normalized format and store in Redux
      const unreadsByTeam: Record<string, { msg_count: number; mention_count: number }> = {};
      teamUnreads.forEach((unread: any) => {
        unreadsByTeam[unread.team_id] = {
          msg_count: unread.msg_count,
          mention_count: unread.mention_count
        };
      });
      
      dispatch(setTeamUnreads(unreadsByTeam));
      return teamUnreads;
    } catch (error) {
      console.error('Failed to load team unread counts:', error);
      return [];
    }
  }, [dispatch, currentUser]);

  const getAllTeamsUnread = useCallback(async () => {
    // Alias for backwards compatibility
    return loadTeamUnreads();
  }, [loadTeamUnreads]);

  return {
    // State
    teams: teamsArray,
    teamsById: teams,
    currentTeam,
    currentTeamId,
    
    // Actions
    loadTeams,
    loadTeamUnreads,
    switchTeam,
    getAllTeamsUnread,
  };
};

export default useTeams;