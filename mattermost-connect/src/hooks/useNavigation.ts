import { useCallback, useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { 
  setCurrentUrl, 
  setNavigating, 
  setLastVisitedChannel, 
  restoreLastVisitedChannels,
  setLastVisited 
} from '../store/slices/viewsSlice';
import { useTeams } from './useTeams';
import { useChannels } from './useChannels';
import { selectTeamsById, selectCurrentTeamId, selectCurrentUrl, selectPreviousUrl, selectLastVisitedChannels, selectLastVisited, selectIsNavigating, selectChannelsForCurrentTeam, selectCurrentChannelId } from '../store/selectors';
import { selectChannelByRules } from '../utils/channelUtils';

// URL parsing utilities following Mattermost pattern
export interface ParsedUrl {
  teamName?: string;
  channelName?: string;
  postId?: string;
  isRoot: boolean;
  isTeamRoot: boolean;
}

export const parseUrl = (url: string): ParsedUrl => {
  // Remove leading slash and split path
  const path = url.replace(/^\//, '');
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length === 0) {
    return { isRoot: true, isTeamRoot: false };
  }
  
  const teamName = parts[0];
  const channelName = parts[1];
  const postId = parts[2]; // For posts like /team/channel/postid
  
  return {
    teamName,
    channelName,
    postId,
    isRoot: false,
    isTeamRoot: !channelName,
  };
};

export const buildUrl = (teamName?: string, channelName?: string, postId?: string): string => {
  let url = '/';
  
  if (teamName) {
    url += teamName;
    
    if (channelName) {
      url += `/${channelName}`;
      
      if (postId) {
        url += `/${postId}`;
      }
    }
  }
  
  return url;
};

// Navigation hook following Mattermost pattern
export const useNavigation = () => {
  const dispatch = useAppDispatch();
  
  // Navigation state - using individual selectors to avoid object recreation
  const currentUrl = useAppSelector(selectCurrentUrl);
  const previousUrl = useAppSelector(selectPreviousUrl);
  const lastVisitedChannels = useAppSelector(selectLastVisitedChannels);
  const lastVisited = useAppSelector(selectLastVisited);
  const isNavigating = useAppSelector(selectIsNavigating);
  
  // Entity state for navigation - using memoized selectors
  const teams = useAppSelector(selectTeamsById);
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const currentChannelId = useAppSelector(selectCurrentChannelId);
  const allChannels = useAppSelector(selectChannelsForCurrentTeam);
  
  // Use business logic hooks
  const { switchTeam } = useTeams();
  const { switchToChannel } = useChannels();
  
  // Restore last visited channels and last visited from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mattermostLastVisitedChannels');
      if (stored) {
        const parsed = JSON.parse(stored);
        dispatch(restoreLastVisitedChannels(parsed));
      }
      
      const storedLastVisited = localStorage.getItem('mattermostLastVisited');
      if (storedLastVisited) {
        const parsedLastVisited = JSON.parse(storedLastVisited);
        dispatch(setLastVisited(parsedLastVisited));
      }
    } catch (error) {
      console.warn('Failed to restore navigation state:', error);
    }
  }, [dispatch]);
  
  // Save last visited channels to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('mattermostLastVisitedChannels', JSON.stringify(lastVisitedChannels));
    } catch (error) {
      console.warn('Failed to save last visited channels:', error);
    }
  }, [lastVisitedChannels]);

  // Save last visited to localStorage when updated (but don't remove on null)
  useEffect(() => {
    try {
      if (lastVisited) {
        localStorage.setItem('mattermostLastVisited', JSON.stringify(lastVisited));
      }
      // Don't remove localStorage on null - keep navigation state across logouts
    } catch (error) {
      console.warn('Failed to save last visited:', error);
    }
  }, [lastVisited]);
  
  // Navigate to URL - following Mattermost pattern (memory only)
  const navigateToUrl = useCallback((url: string) => {
    if (url === currentUrl) return; // No-op if same URL
    
    dispatch(setNavigating(true));
    dispatch(setCurrentUrl(url));
    dispatch(setNavigating(false));
  }, [currentUrl, dispatch]);


  // Navigate to channel - following Mattermost pattern
  const navigateToChannel = useCallback((teamId: string, channelId: string) => {
    const team = teams[teamId];
    if (!team) return;

    // Would need channel data to get channel name
    // For now, build URL with IDs (in real implementation, use names)
    const url = buildUrl(team.name, channelId);

    // Update last visited channel for team
    dispatch(setLastVisitedChannel({ teamId, channelId }));

    // Update current team if different
    if (currentTeamId !== teamId) {
      switchTeam(teamId);
    }

    // Use switchToChannel from useChannels hook
    switchToChannel(channelId);

    navigateToUrl(url);
  }, [teams, currentTeamId, switchTeam, switchToChannel, dispatch, navigateToUrl]);

  // Navigate to team - following Mattermost pattern
  const navigateToTeam = useCallback((teamId: string) => {
    const team = teams[teamId];
    console.debug("Navigate To Team ", team )
    console.debug("teams", teams)
    if (!team) return;
    
    // Get last visited channel for this team
    const lastChannelId = lastVisitedChannels[teamId];
    
    // Try to find best channel using our logic
    const bestChannelId = lastChannelId || selectChannelByRules(currentChannelId, allChannels);
    console.debug("bestChannelId", bestChannelId)
    if (bestChannelId) {
      // Navigate to specific channel
      navigateToChannel(teamId, bestChannelId);
    } else {
      // Fallback: navigate to team root as before
      const url = buildUrl(team.name);
      switchTeam(teamId);
      navigateToUrl(url);
    }
  }, [teams, lastVisitedChannels, currentChannelId, allChannels, navigateToChannel, switchTeam, navigateToUrl]);

  
  // Go back to previous URL
  const goBack = useCallback(() => {
    if (previousUrl && previousUrl !== currentUrl) {
      navigateToUrl(previousUrl);
    }
  }, [previousUrl, currentUrl, navigateToUrl]);
  
  // Get last visited channel for team
  const getLastVisitedChannel = useCallback((teamId: string): string | null => {
    return lastVisitedChannels[teamId] || null;
  }, [lastVisitedChannels]);

  // Get last visited team/channel globally
  const getLastVisited = useCallback((): { teamId: string; channelId: string } | null => {
    return lastVisited;
  }, [lastVisited]);
  
  // Parse current URL
  const getCurrentLocation = useCallback((): ParsedUrl => {
    return parseUrl(currentUrl);
  }, [currentUrl]);
  
  // Check if at specific location
  const isAtTeam = useCallback((teamId: string): boolean => {
    const team = teams[teamId];
    if (!team) return false;
    
    const location = getCurrentLocation();
    return location.teamName === team.name;
  }, [teams, getCurrentLocation]);
  
  const isAtChannel = useCallback((teamId: string, channelId: string): boolean => {
    const team = teams[teamId];
    if (!team) return false;
    
    const location = getCurrentLocation();
    return location.teamName === team.name && location.channelName === channelId;
  }, [teams, getCurrentLocation]);
  
  // Note: Navigation is memory-only, no browser URL handling
  
  return {
    // State
    currentUrl,
    previousUrl,
    lastVisitedChannels,
    lastVisited,
    isNavigating,
    
    // Navigation actions
    navigateToUrl,
    navigateToTeam,
    navigateToChannel,
    goBack,
    
    // Utilities
    getCurrentLocation,
    getLastVisitedChannel,
    getLastVisited,
    isAtTeam,
    isAtChannel,
    parseUrl,
    buildUrl,
  };
};

export default useNavigation;