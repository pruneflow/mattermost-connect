import { useMemo, useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { setCurrentChannelId } from '../store/slices/entitiesSlice';
import {
  selectCurrentTeamId,
  selectChannelsForCurrentTeam,
  selectPublicChannelsInCurrentTeam,
  selectPrivateChannelsInCurrentTeam,
  selectDirectChannelsInCurrentTeam,
  selectGroupChannelsInCurrentTeam, selectCurrentChannel
} from "../store/selectors";

/**
 * Read-only hook for accessing channel data from Redux store
 * 
 * IMPORTANT: This hook does NOT load data - it only reads from store
 * To load channels, use useChannelLoader hook or dispatch loadChannelsForTeam action
 * 
 * Following Mattermost pattern: separate data loading from data reading
 */
export const useChannels = () => {
  const dispatch = useAppDispatch();
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  
  // Get all enriched channels for current team
  const allChannels = useAppSelector(selectChannelsForCurrentTeam);
  
  // Get channels by type (memoized for performance)
  const publicChannels = useAppSelector(selectPublicChannelsInCurrentTeam);
  const privateChannels = useAppSelector(selectPrivateChannelsInCurrentTeam);
  const directChannels = useAppSelector(selectDirectChannelsInCurrentTeam);
  const groupChannels = useAppSelector(selectGroupChannelsInCurrentTeam);
  const currentChannel = useAppSelector(selectCurrentChannel);

  // Computed data (memoized)
  const channelCounts = useMemo(() => ({
    total: allChannels.length,
    public: publicChannels.length,
    private: privateChannels.length,
    direct: directChannels.length,
    group: groupChannels.length,
  }), [allChannels.length, publicChannels.length, privateChannels.length, directChannels.length, groupChannels.length]);

  const hasChannels = useMemo(() => allChannels.length > 0, [allChannels.length]);

  // Actions
  const switchToChannel = useCallback((channelId: string) => {
    dispatch(setCurrentChannelId(channelId));
  }, [dispatch]);

  return {
    currentChannel,
    // Channel lists (enriched with unread counts, user names, etc.)
    allChannels,
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
    
    // Computed data
    channelCounts,
    hasChannels,
    currentTeamId,
    
    // Status
    isLoaded: hasChannels, // Simple check: if we have channels, they're loaded
    
    // Actions
    switchToChannel,
  };
};

export default useChannels;