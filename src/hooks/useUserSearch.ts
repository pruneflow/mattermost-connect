import { useCallback, useRef, useEffect } from 'react';
import { client } from '../api/client';
import { handleError } from '../services/errorService';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { setUsers } from '../store/slices/entitiesSlice';
import { 
  setUserSearching, 
  setUserSearchResults, 
  clearUserSearch,
  setUserSearchTerm 
} from '../store/slices/viewsSlice';
import { 
  selectChannelsForCurrentTeam,
  selectUserSearchResults,
  selectIsUserSearching,
  selectUserSearchTerm,
  selectLastUserSearchTerm,
  selectChannelMembers,
  selectUserProfiles
} from '../store/selectors';
import { filterUsersBySearchTerm } from '../utils/searchUtils';
import type { EnrichedChannel } from '../api/types';

export interface UserSearchOptions {
  teamId?: string;
  notInTeamId?: string;
  notInChannelId?: string;
  limit?: number;
}

/**
 * Hook for searching users with Mattermost search API
 * Supports filtering by team/channel membership with debouncing
 */
export const useUserSearch = (debounceMs: number = 300) => {
  const dispatch = useAppDispatch();
  const enrichedChannels = useAppSelector(selectChannelsForCurrentTeam);
  const userProfiles = useAppSelector(selectUserProfiles);
  
  // Redux state
  const searchResults = useAppSelector(selectUserSearchResults);
  const isSearching = useAppSelector(selectIsUserSearching);
  const searchTerm = useAppSelector(selectUserSearchTerm);
  const lastSearchTerm = useAppSelector(selectLastUserSearchTerm);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const currentSearchRef = useRef<string>('');

  /**
   * Internal search function
   */
  const performSearch = useCallback(async (
    term: string, 
    options: UserSearchOptions = {}
  ): Promise<string[]> => {
    if (!term.trim() || term.length < 2) {
      dispatch(clearUserSearch());
      return [];
    }

    const {
      teamId,
      notInTeamId,
      notInChannelId,
      limit = 100
    } = options;

    dispatch(setUserSearching(true));
    currentSearchRef.current = term;

    try {
      const searchOptions: any = {
        limit,
        allow_inactive: false
      };

      // Add team/channel filtering
      if (teamId) {
        searchOptions.team_id = teamId;
      }
      if (notInTeamId) {
        searchOptions.not_in_team_id = notInTeamId;
      }
      if (notInChannelId) {
        searchOptions.not_in_channel_id = notInChannelId;
      }

      const users = await client.searchUsers(term.trim(), searchOptions);
      
      // Check if this search is still current (avoid race conditions)
      if (currentSearchRef.current !== term) {
        return [];
      }
      
      // Filter out deleted users and limit results
      const activeUsers = users
        .filter(user => !user.delete_at)
        .slice(0, limit);

      // Store user profiles in Redux store
      dispatch(setUsers(activeUsers));
      
      // Return IDs only
      const userIds = activeUsers.map(user => user.id);
      dispatch(setUserSearchResults({ term, results: userIds }));
      return userIds;
    } catch (error) {
      // Only handle error if this search is still current
      if (currentSearchRef.current === term) {
        handleError('Failed to search users', error as any);
        dispatch(setUserSearchResults({ term, results: [] }));
      }
      return [];
    } finally {
      if (currentSearchRef.current === term) {
        dispatch(setUserSearching(false));
      }
    }
  }, [handleError, dispatch]);

  /**
   * Debounced search users function
   */
  const searchUsers = useCallback((
    term: string, 
    options: UserSearchOptions = {}
  ): void => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Clear results immediately if term is too short
    if (!term.trim() || term.length < 2) {
      dispatch(clearUserSearch());
      return;
    }

    // Set searching state immediately for UX
    dispatch(setUserSearching(true));
    dispatch(setUserSearchTerm(term));

    // Debounce the actual search
    debounceRef.current = setTimeout(() => {
      performSearch(term, options);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  /**
   * Search users not in team (for team invitations)
   */
  const searchUsersNotInTeam = useCallback((
    term: string, 
    teamId: string,
    limit: number = 100
  ): void => {
    searchUsers(term, { notInTeamId: teamId, limit });
  }, [searchUsers]);

  /**
   * Search team members not in channel (for channel invitations)
   */
  const searchTeamMembersNotInChannel = useCallback((
    term: string,
    teamId: string,
    channelId: string,
    limit: number = 100
  ): void => {
    searchUsers(term, { 
      teamId, 
      notInChannelId: channelId, 
      limit 
    });
  }, [searchUsers]);

  /**
   * Advanced search for adding users to channel (API + DM contacts + channel members)
   */
  const searchUsersToAddInChannel = useCallback(async (
    term: string,
    teamId: string,
    channelId: string,
    channelMemberIds: string[] = [],
    limit: number = 100
  ): Promise<void> => {
    if (!term || term.length < 2) {
      dispatch(clearUserSearch());
      return;
    }

    dispatch(setUserSearching(true));
    dispatch(setUserSearchTerm(term));
    currentSearchRef.current = term;
    
    try {
      // 1. Recherche API : team members not in channel with allow_inactive = false
      const apiUsers = await client.searchUsers(term, {
        team_id: teamId,
        not_in_channel_id: channelId,
        allow_inactive: false,
        group_constrained: false,
        limit
      });
      
      // 2. Get DM contacts from enriched channels (otherUser already calculated)
      const dmContacts = (enrichedChannels as EnrichedChannel[] || [])
        .filter((channel: EnrichedChannel) => channel.type === 'D' && channel.otherUser)
        .map((channel: EnrichedChannel) => channel.otherUser!)
        .filter(Boolean);
      
      // 3. Get channel members from passed IDs
      const channelMembersUsers = channelMemberIds
        .map(userId => userProfiles[userId])
        .filter(Boolean);
      
      // 4. Filter users that match search term (including nickname)
      const dmMatches = filterUsersBySearchTerm(dmContacts, term);
      const channelMatches = filterUsersBySearchTerm(channelMembersUsers, term);
      
      // 5. Combine and deduplicate
      const apiUserIds = apiUsers.map(user => user.id);
      const dmUserIds = dmMatches
        .filter(user => !apiUserIds.includes(user.id))
        .map(user => user.id);
      const channelUserIds = channelMatches
        .filter(user => !apiUserIds.includes(user.id) && !dmUserIds.includes(user.id))
        .map(user => user.id);
      
      // 6. Store all users in profiles
      const allUsers = [
        ...apiUsers, 
        ...dmMatches.filter(user => !apiUserIds.includes(user.id)),
        ...channelMatches.filter(user => !apiUserIds.includes(user.id) && !dmUserIds.includes(user.id))
      ];
      if (allUsers.length > 0) {
        dispatch(setUsers(allUsers));
      }
      
      // 7. Final combined result: API users + unique DM users + unique channel members
      const combinedResults = [...apiUserIds, ...dmUserIds, ...channelUserIds];
      
      // Only update if this is still the current search
      if (currentSearchRef.current === term) {
        dispatch(setUserSearchResults({ term, results: combinedResults }));
      }
      
    } catch (error) {
      if (currentSearchRef.current === term) {
        handleError('User search failed', error as any);
        dispatch(setUserSearchResults({ term, results: [] }));
      }
    } finally {
      if (currentSearchRef.current === term) {
        dispatch(setUserSearching(false));
      }
    }
  }, [dispatch, handleError, enrichedChannels]);

  /**
   * Clear search results and cancel pending searches
   */
  const clearSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    dispatch(clearUserSearch());
    currentSearchRef.current = '';
  }, [dispatch]);

  const setSearchTerm = useCallback((term: string) => {
    dispatch(setUserSearchTerm(term));
  }, [dispatch]);

  /**
   * Check if search term matches current results
   */
  const isCurrentSearch = useCallback((term: string): boolean => {
    return term.trim() === lastSearchTerm;
  }, [lastSearchTerm]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    // State
    isSearching,
    searchResults,
    searchTerm,
    lastSearchTerm,

    // Actions
    searchUsers,
    searchUsersNotInTeam,
    searchTeamMembersNotInChannel,
    searchUsersToAddInChannel,
    clearSearch,
    setSearchTerm,

    // Utilities
    isCurrentSearch,
  };
};

export default useUserSearch;