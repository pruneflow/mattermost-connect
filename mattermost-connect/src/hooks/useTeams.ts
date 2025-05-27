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

  // No manual loading - teams auto-loaded by useAuth

  const switchTeam = useCallback((teamId: string) => {
    // Follow Mattermost pattern: just dispatch the team ID without validation
    dispatch(setCurrentTeamId(teamId));
  }, [dispatch]);

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
    switchTeam,
    getAllTeamsUnread,
  };
};

export default useTeams;