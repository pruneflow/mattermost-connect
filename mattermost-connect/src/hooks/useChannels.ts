import { useMemo, useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { setCurrentChannelId, markChannelAsUnreadAction, toggleChannelFavoriteAction, moveChannelToCategoryAction, loadChannelMembers } from '../store/slices/entitiesSlice';
import { useUnreadCounts } from './useUnreadCounts';
import {
  selectCurrentTeamId,
  selectChannelsForCurrentTeam,
  selectCurrentChannel,
  selectCategoriesForCurrentTeam,
} from "../store/selectors";
import { ChannelCategory } from "@mattermost/types/channel_categories";

/**
 * Read-only hook for accessing channel data from Redux store
 * Updated to use categories-based approach
 * 
 * IMPORTANT: This hook does NOT load data - it only reads from store
 * To load channels, use useChannelLoader hook or dispatch loadChannelsForTeam action
 * 
 * Following Mattermost pattern: separate data loading from data reading
 */
export const useChannels = () => {
  const dispatch = useAppDispatch();
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const { markChannelAsRead } = useUnreadCounts();
  
  // Get all enriched channels for current team
  const allChannels = useAppSelector(selectChannelsForCurrentTeam);
  const currentChannel = useAppSelector(selectCurrentChannel);
  const categories = useAppSelector(selectCategoriesForCurrentTeam);

  const hasChannels = useMemo(() => allChannels.length > 0, [allChannels.length]);

  // Helper function to check if channel is favorite
  const isChannelFavorite = useCallback((channelId: string) => {
    const favoritesCategory = categories.find(cat => cat.type === 'favorites');
    return favoritesCategory?.channel_ids.includes(channelId) || false;
  }, [categories]);

  // Helper function to get category for a channel
  const getChannelCategory = useCallback((channelId: string) => {
    return categories.find(cat => cat.channel_ids.includes(channelId));
  }, [categories]);

  // Actions
  const switchToChannel = useCallback((channelId: string) => {
    dispatch(setCurrentChannelId(channelId));
    // Mark channel as read when switching to it
    markChannelAsRead(channelId);
  }, [dispatch, markChannelAsRead]);

  // Mark channel as unread action
  const markAsUnread = useCallback((channelId: string) => {
    dispatch(markChannelAsUnreadAction({ channelId }));
  }, [dispatch]);

  // Toggle favorite status action
  const toggleFavorite = useCallback((channelId: string, isFavorite: boolean) => {
    if (!currentTeamId) return;
    const favoritesCategory = categories.find(cat => cat.type === 'favorites');
    let categoryId = null;
    if(isFavorite) {
      const channel = allChannels.find(c => c.id === channelId);
      if(channel && channel.type === 'D') {
        const directCategory = categories.find(c => c.type === 'direct_messages');
        categoryId = directCategory?.id;
      }
      else {
        const channelsCategory = categories.find(c => c.type === 'channels');
        categoryId = channelsCategory?.id;
      }
    }
    else {
      categoryId = favoritesCategory?.id;
    }
    if(categoryId) {
      moveToCategory(channelId, categoryId);
    }
  }, [currentTeamId, isChannelFavorite, categories]);

  // Move channel to category action
  const moveToCategory = useCallback((channelId: string, toCategoryId: string) => {
    const fromCategory = getChannelCategory(channelId);
    if (!fromCategory || fromCategory.id === toCategoryId) return; // Don't move if same category
    
    dispatch(moveChannelToCategoryAction({ 
      channelId, 
      fromCategoryId: fromCategory.id, 
      toCategoryId 
    }));
  }, [dispatch, getChannelCategory]);

  return {
    currentChannel,
    // Channel lists (enriched with unread counts, user names, etc.)
    allChannels,
    categories, // Expose categories for move menu
    
    // Computed data
    hasChannels,
    currentTeamId,
    
    // Status
    isLoaded: hasChannels, // Simple check: if we have channels, they're loaded
    
    // Actions
    switchToChannel,
    markAsUnread,
    toggleFavorite,
    moveToCategory,
    
    // Helpers
    isChannelFavorite,
    getChannelCategory,
  };
};

export default useChannels;