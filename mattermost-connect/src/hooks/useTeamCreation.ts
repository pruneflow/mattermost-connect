import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { client } from '../api/client';
import { setTeam, updateTeam, setCurrentTeamId } from '../store/slices/entitiesSlice';
import type { CreateTeamData } from '../components/organisms/CreateTeamDialog';
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
      const newTeam = await client.createTeam(teamRequest as Team);

      // Add to store
      dispatch(setTeam(newTeam));
      
      // Set as current team
      dispatch(setCurrentTeamId(newTeam.id));

      return newTeam;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const uploadTeamIcon = useCallback(async (teamId: string, imageFile: File): Promise<void> => {
    try {
      // Validate file type - following Mattermost requirements
      const allowedTypes = ['image/bmp', 'image/jpg', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(imageFile.type)) {
        throw new Error('Invalid file type. Only BMP, JPG, JPEG, and PNG files are supported.');
      }

      // Validate file size (reasonable limit for team icons)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageFile.size > maxSize) {
        throw new Error('File too large. Maximum size is 10MB.');
      }

      // Upload team icon via API - following mattermost-redux setTeamIcon pattern
      await client.setTeamIcon(teamId, imageFile);

      // Manually update store with new timestamp for cache busting
      // (Mattermost API doesn't return updated team object or send WebSocket events for icons)
      dispatch(updateTeam({ 
        id: teamId, 
        last_team_icon_update: Date.now() 
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    createTeam,
    uploadTeamIcon,
  };
};

export default useTeamCreation;