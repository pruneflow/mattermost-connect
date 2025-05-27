import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { Client4 } from '../api/client';
import { setCurrentTeamId, setTeams } from '../store/slices/entitiesSlice';
import type { Team } from '../api/types';

export const useTeams = (): {
  teams: Team[];
  teamsById: Record<string, Team>;
  currentTeam: Team | null;
  currentTeamId: string;
  loadTeams: () => Promise<Team[] | undefined>;
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

  const getAllTeamsUnread = useCallback(async () => {
    try {
      // Use the actual method available in Client4
      const unreadData = await Client4.getMyTeamUnreads();
      return unreadData;
    } catch (error) {
      console.error('Failed to get teams unread:', error);
      return [];
    }
  }, []);

  return {
    // State
    teams: teamsArray,
    teamsById: teams,
    currentTeam,
    currentTeamId,
    
    // Actions
    loadTeams,
    switchTeam,
    getAllTeamsUnread,
  };
};

export default useTeams;