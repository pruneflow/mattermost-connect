import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { setCurrentTeamId } from '../store/slices/entitiesSlice';
import { 
  selectTeams, 
  selectCurrentTeam, 
  selectCurrentTeamId,
  selectTeamsById
} from '../store/selectors';
import type { Team } from '../api/types';

/**
 * Teams hook - READ-ONLY following Mattermost pattern
 * All data loading is handled by useAppInitialization
 */
export const useTeams = (): {
  teams: Team[];
  teamsById: Record<string, Team>;
  currentTeam: Team | null;
  currentTeamId: string;
  switchTeam: (teamId: string) => void;
} => {
  const dispatch = useAppDispatch();
  
  // Read-only access to store (Mattermost pattern)
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const currentTeam = useAppSelector(selectCurrentTeam);
  const teamsArray = useAppSelector(selectTeams);
  const teamsById = useAppSelector(selectTeamsById);

  const switchTeam = useCallback((teamId: string) => {
    dispatch(setCurrentTeamId(teamId));
  }, [dispatch]);

  return {
    teams: teamsArray,
    teamsById,
    currentTeam,
    currentTeamId,
    switchTeam,
  };
};

export default useTeams;