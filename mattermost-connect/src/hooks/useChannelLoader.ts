import { useCallback, useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { loadChannelsForTeam } from "../store";
import { selectCurrentTeamId } from '../store/selectors';

/**
 * Hook for loading channel data with smart lazy loading
 * 
 * Pattern Mattermost-style:
 * - Only loads when team changes
 * - Checks store before making API calls
 * - Centralized loading via Redux action
 */
export const useChannelLoader = () => {
  const dispatch = useAppDispatch();
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const channelsInTeam = useAppSelector(state => state.entities.channels.channelsInTeam);

  // Check if channels are loaded for a specific team
  const isTeamChannelsLoaded = useCallback((teamId: string | null) => {
    if (!teamId) return false;
    const teamChannels = channelsInTeam[teamId];
    return teamChannels && teamChannels.length > 0;
  }, [channelsInTeam]);

  // Load channels for specific team
  const loadTeamChannels = useCallback(async (teamId: string) => {
    if (!teamId) return;
    
    // Action already handles store verification internally
    await dispatch(loadChannelsForTeam(teamId));
  }, [dispatch]);

  // Auto-load channels when current team changes
  useEffect(() => {
    if (currentTeamId && !isTeamChannelsLoaded(currentTeamId)) {
      loadTeamChannels(currentTeamId);
    }
  }, [currentTeamId, isTeamChannelsLoaded, loadTeamChannels]);

  return {
    // Actions
    loadTeamChannels,
    
    // Status checks
    isTeamChannelsLoaded,
    
    // Current state
    currentTeamId,
    isCurrentTeamLoaded: isTeamChannelsLoaded(currentTeamId),
  };
};

export default useChannelLoader;