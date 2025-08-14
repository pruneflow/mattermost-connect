import { useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { switchToChannel } from '../services/channelService';
import { 
  selectCurrentTeamId, 
  selectCurrentChannelId, 
  selectChannelsForCurrentTeam,
  selectLastVisitedChannels
} from '../store/selectors';
import { selectChannelByRules } from '../utils/channelUtils';
import type { EnrichedChannel } from '../api/types';

/**
 * Hook for auto-selecting channels after team changes
 * 
 * Pattern Mattermost-style:
 * - Separate from loading logic
 * - Uses lastVisitedChannels first, then selectChannelByRules
 * - Only triggers when channels are loaded for current team
 */
export const useAutoChannelSelection = () => {
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const currentChannelId = useAppSelector(selectCurrentChannelId);
  const allChannels = useAppSelector(selectChannelsForCurrentTeam) as EnrichedChannel[];
  const lastVisitedChannels = useAppSelector(selectLastVisitedChannels);

  // Auto-select channel when team changes and channels are loaded
  useEffect(() => {
    // Skip if no team or no channels loaded yet
    if (!currentTeamId || !allChannels || allChannels.length === 0) return;

    // 1. Try lastVisitedChannel for this team
    const lastChannelId = lastVisitedChannels[currentTeamId];
    
    // Check that lastChannel exists in current channels
    const lastChannelExists = lastChannelId && allChannels.some((ch: EnrichedChannel) => ch.id === lastChannelId);
    
    // 2. Otherwise use selectChannelByRules
    const bestChannelId = lastChannelExists 
      ? lastChannelId 
      : selectChannelByRules(currentChannelId, allChannels as EnrichedChannel[]);

    // Switch if different from current
    if (bestChannelId && bestChannelId !== currentChannelId) {
      switchToChannel(bestChannelId);
    }
  }, [currentTeamId, allChannels, currentChannelId, lastVisitedChannels, switchToChannel]);

  return {
    // Status info (for debugging if needed)
    hasChannels: allChannels ? allChannels.length > 0 : false,
    currentChannelValid: allChannels ? allChannels.some((ch: EnrichedChannel) => ch.id === currentChannelId) : false,
  };
};

export default useAutoChannelSelection;