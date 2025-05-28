import { useCallback, useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { 
  setCurrentUrl, 
  setNavigating, 
  setLastVisitedChannel, 
  restoreLastVisitedChannels 
} from '../store/slices/viewsSlice';
import { setCurrentTeamId } from '../store/slices/entitiesSlice';

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
  
  // Navigation state
  const { currentUrl, previousUrl, lastVisitedChannels, isNavigating } = useAppSelector(
    state => state.views.navigation
  );
  
  // Entity state for navigation
  const teams = useAppSelector(state => state.entities.teams.teams);
  const currentTeamId = useAppSelector(state => state.entities.teams.currentTeamId);
  const currentTeam = currentTeamId ? teams[currentTeamId] : null;
  
  // Restore last visited channels from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mattermostLastVisitedChannels');
      if (stored) {
        const parsed = JSON.parse(stored);
        dispatch(restoreLastVisitedChannels(parsed));
      }
    } catch (error) {
      console.warn('Failed to restore last visited channels:', error);
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
  
  // Navigate to URL - following Mattermost pattern
  const navigateToUrl = useCallback((url: string) => {
    if (url === currentUrl) return; // No-op if same URL
    
    dispatch(setNavigating(true));
    dispatch(setCurrentUrl(url));
    
    // Update browser URL if we're in a browser environment
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', url);
    }
    
    dispatch(setNavigating(false));
  }, [currentUrl, dispatch]);
  
  // Navigate to team - following Mattermost pattern
  const navigateToTeam = useCallback((teamId: string) => {
    const team = teams[teamId];
    if (!team) return;
    
    // Get last visited channel for this team, or use team root
    const lastChannelId = lastVisitedChannels[teamId];
    let url: string;
    
    if (lastChannelId) {
      // Would need channel data to get channel name
      // For now, navigate to team root
      url = buildUrl(team.name);
    } else {
      url = buildUrl(team.name);
    }
    
    // Update current team
    dispatch(setCurrentTeamId(teamId));
    
    navigateToUrl(url);
  }, [teams, lastVisitedChannels, dispatch, navigateToUrl]);
  
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
      dispatch(setCurrentTeamId(teamId));
    }
    
    navigateToUrl(url);
  }, [teams, currentTeamId, dispatch, navigateToUrl]);
  
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
  
  // Handle browser back/forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handlePopState = (event: PopStateEvent) => {
      const url = window.location.pathname;
      dispatch(setCurrentUrl(url));
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [dispatch]);
  
  return {
    // State
    currentUrl,
    previousUrl,
    lastVisitedChannels,
    isNavigating,
    
    // Navigation actions
    navigateToUrl,
    navigateToTeam,
    navigateToChannel,
    goBack,
    
    // Utilities
    getCurrentLocation,
    getLastVisitedChannel,
    isAtTeam,
    isAtChannel,
    parseUrl,
    buildUrl,
  };
};

export default useNavigation;