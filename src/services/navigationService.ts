import { store } from '../store';
import { 
  setCurrentUrl, 
  setNavigating, 
  setLastVisitedChannel, 
  restoreLastVisitedChannels,
  setLastVisited 
} from '../store/slices/viewsSlice';
import { 
  selectTeamsById, 
  selectCurrentTeamId, 
  selectCurrentUrl, 
  selectPreviousUrl, 
  selectLastVisitedChannels, 
  selectLastVisited, 
  selectChannelsForCurrentTeam, 
  selectCurrentChannelId 
} from '../store/selectors';
import { selectChannelByRules } from '../utils/channelUtils';
import { buildUrl, getCurrentLocation, isAtTeam, isAtChannel } from '../utils/navigationUtils';
import { switchTeam } from './teamService';
import { switchToChannel } from './channelService';
import type { EnrichedChannel } from '../api/types';

export const initializeNavigation = () => {
  try {
    const stored = localStorage.getItem('mattermostLastVisitedChannels');
    if (stored) {
      const parsed = JSON.parse(stored);
      store.dispatch(restoreLastVisitedChannels(parsed));
    }
    
    const storedLastVisited = localStorage.getItem('mattermostLastVisited');
    if (storedLastVisited) {
      const parsedLastVisited = JSON.parse(storedLastVisited);
      store.dispatch(setLastVisited(parsedLastVisited));
    }
  } catch (error) {
  }
};

export const navigateToUrl = (url: string) => {
  const state = store.getState();
  const currentUrl = selectCurrentUrl(state);
  
  if (url === currentUrl) return;
  
  store.dispatch(setNavigating(true));
  store.dispatch(setCurrentUrl(url));
  store.dispatch(setNavigating(false));
};

export const navigateToChannel = (teamId: string, channelId: string) => {
  const state = store.getState();
  const teams = selectTeamsById(state);
  const currentTeamId = selectCurrentTeamId(state);
  
  const team = teams[teamId];
  if (!team) return;

  const url = buildUrl(team.name, channelId);

  store.dispatch(setLastVisitedChannel({ teamId, channelId }));

  if (currentTeamId !== teamId) {
    switchTeam(teamId);
  }

  switchToChannel(channelId);
  navigateToUrl(url);
};

export const navigateToTeam = (teamId: string) => {
  const state = store.getState();
  const teams = selectTeamsById(state);
  const lastVisitedChannels = selectLastVisitedChannels(state);
  const currentChannelId = selectCurrentChannelId(state);
  const allChannels = selectChannelsForCurrentTeam(state);
  
  const team = teams[teamId];
  if (!team) return;
  
  const lastChannelId = lastVisitedChannels[teamId];
  
  const bestChannelId = lastChannelId || selectChannelByRules(currentChannelId, allChannels as EnrichedChannel[]);
  if (bestChannelId) {
    navigateToChannel(teamId, bestChannelId);
  } else {
    const url = buildUrl(team.name);
    switchTeam(teamId);
    navigateToUrl(url);
  }
};

export const goBack = () => {
  const state = store.getState();
  const previousUrl = selectPreviousUrl(state);
  const currentUrl = selectCurrentUrl(state);
  
  if (previousUrl && previousUrl !== currentUrl) {
    navigateToUrl(previousUrl);
  }
};

export const getLastVisitedChannel = (teamId: string): string | null => {
  const state = store.getState();
  const lastVisitedChannels = selectLastVisitedChannels(state);
  return lastVisitedChannels[teamId] || null;
};

export const getLastVisited = (): { teamId: string; channelId: string } | null => {
  const state = store.getState();
  return selectLastVisited(state);
};

export const getCurrentLocationFromStore = () => {
  const state = store.getState();
  const currentUrl = selectCurrentUrl(state);
  return getCurrentLocation(currentUrl);
};

export const isAtTeamFromStore = (teamId: string): boolean => {
  const state = store.getState();
  const teams = selectTeamsById(state);
  const currentUrl = selectCurrentUrl(state);
  
  const team = teams[teamId];
  if (!team) return false;
  
  return isAtTeam(currentUrl, team.name);
};

export const isAtChannelFromStore = (teamId: string, channelId: string): boolean => {
  const state = store.getState();
  const teams = selectTeamsById(state);
  const currentUrl = selectCurrentUrl(state);
  
  const team = teams[teamId];
  if (!team) return false;
  
  return isAtChannel(currentUrl, team.name, channelId);
};