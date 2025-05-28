import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { Client4 } from '../api/client';
import { setTeam, setCurrentTeamId } from '../store/slices/entitiesSlice';
import type { CreateTeamData } from '../components/organisms/CreateTeamModal';
import type { Team, TeamCreationRequest } from '../api/types';

export const useTeamCreation = () => {
  const dispatch = useAppDispatch();

  const createTeam = useCallback(async (teamData: CreateTeamData): Promise<Team> => {
    try {
      // Prepare team creation request - matching Mattermost API exactly
      const teamRequest: TeamCreationRequest = {
        name: teamData.name,
        display_name: teamData.display_name,
        type: teamData.type,
        description: teamData.description || '',
        allow_open_invite: teamData.type === 'O',
      };

      // Create team via API - following mattermost-redux pattern
      const newTeam = await Client4.createTeam(teamRequest as Team);

      // Add to store
      dispatch(setTeam(newTeam));
      
      // Set as current team
      dispatch(setCurrentTeamId(newTeam.id));

      return newTeam;
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  }, [dispatch]);

  return {
    createTeam,
  };
};

export default useTeamCreation;