import { useState, useCallback, useRef, useEffect } from 'react';
import { client } from '../api/client';
import { useErrorHandler } from './useErrorHandler';
import { useAppDispatch } from './useAppDispatch';
import { setUsers } from '../store/slices/entitiesSlice';
import type { UserProfile } from '../api/types';

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
  const { handleError } = useErrorHandler();
  const dispatch = useAppDispatch();
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [lastSearchTerm, setLastSearchTerm] = useState<string>('');
  
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
      setSearchResults([]);
      setLastSearchTerm('');
      return [];
    }

    const {
      teamId,
      notInTeamId,
      notInChannelId,
      limit = 100
    } = options;

    setIsSearching(true);
    setLastSearchTerm(term);
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
      console.debug("useUserSearch - setting results:", userIds, "length:", userIds.length);

      setSearchResults(userIds);
      return userIds;
    } catch (error) {
      // Only handle error if this search is still current
      if (currentSearchRef.current === term) {
        handleError('Failed to search users', error as any);
        setSearchResults([]);
      }
      return [];
    } finally {
      if (currentSearchRef.current === term) {
        setIsSearching(false);
      }
    }
  }, [handleError]);

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
      setSearchResults([]);
      setLastSearchTerm('');
      setIsSearching(false);
      return;
    }

    // Set searching state immediately for UX
    setIsSearching(true);

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
   * Clear search results and cancel pending searches
   */
  const clearSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchResults([]);
    setLastSearchTerm('');
    setIsSearching(false);
    currentSearchRef.current = '';
  }, []);

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
    lastSearchTerm,

    // Actions
    searchUsers,
    searchUsersNotInTeam,
    searchTeamMembersNotInChannel,
    clearSearch,

    // Utilities
    isCurrentSearch,
  };
};

export default useUserSearch;