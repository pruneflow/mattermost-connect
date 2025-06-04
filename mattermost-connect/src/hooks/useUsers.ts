import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { 
  selectCurrentUserId, 
  selectUserProfiles, 
  selectCurrentUser,
  selectUsersArray
} from '../store/selectors';
import { useAppDispatch } from './useAppDispatch';
import { client } from '../api/client';
import { setUser } from '../store/slices/entitiesSlice';
import { displayUsername } from '../utils/userUtils';
import { useLoading } from './useLoading';
import type { UserProfile } from '../api/types';

export const useUsers = (): {
  users: UserProfile[];
  usersById: Record<string, UserProfile>;
  currentUser: UserProfile | null;
  currentUserId: string;
  loadUser: (userId: string) => Promise<UserProfile>;
  loadUsers: (userIds: string[]) => Promise<UserProfile[]>;
  updateCurrentUser: (userData: Partial<UserProfile>) => Promise<UserProfile>;
  getUserById: (userId: string) => UserProfile | null;
  getDisplayName: (user: UserProfile) => string;
  isLoadingUser: boolean;
  isLoadingUsers: boolean;
  userError: string | null;
  usersError: string | null;
} => {
  const dispatch = useAppDispatch();
  const { withLoading, isLoading, getError } = useLoading();
  
  // Users state using memoized selectors
  const currentUserId = useAppSelector(selectCurrentUserId);
  const profiles = useAppSelector(selectUserProfiles);
  const currentUser = useAppSelector(selectCurrentUser);
  const users = useAppSelector(selectUsersArray);

  // Actions - Simple loading pattern
  const loadUser = useCallback(async (userId: string) => {
    if (!userId) throw new Error('User ID is required');

    // If user exists in store, return it
    if (profiles[userId]) {
      return profiles[userId];
    }

    return await withLoading('users.loadUser', async () => {
      const user = await client.getUser(userId);
      dispatch(setUser(user));
      return user;
    });
  }, [withLoading, dispatch, profiles]);

  const loadUsers = useCallback(async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return [];

    // Filter out users we already have
    const missingUserIds = userIds.filter(id => !profiles[id]);
    if (missingUserIds.length === 0) return [];

    return await withLoading('users.loadUsers', async () => {
      console.log(`Loading ${missingUserIds.length} missing users for direct channels`);
      
      // Use efficient batch loading (official Mattermost pattern)
      const users = await client.getProfilesByIds(missingUserIds);
      
      // Update store with all loaded users
      users.forEach(user => {
        dispatch(setUser(user));
      });
      
      return users;
    });
  }, [withLoading, dispatch, profiles]);

  const updateCurrentUser = useCallback(async (userData: Partial<UserProfile>) => {
    try {
      if (!currentUser) throw new Error('No current user');
      
      const updatedUser = await client.patchMe(userData);
      dispatch(setUser(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error('Failed to update current user:', error);
      throw error;
    }
  }, [dispatch, currentUser]);

  // Helper functions
  const getUserById = useCallback((userId: string): UserProfile | null => {
    return profiles[userId] || null;
  }, [profiles]);

  const getDisplayName = useCallback((user: UserProfile): string => {
    return displayUsername(user, 'full_name');
  }, []);

  return {
    // State
    users,
    usersById: profiles,
    currentUser,
    currentUserId,
    
    // Actions
    loadUser,
    loadUsers,
    updateCurrentUser,
    
    // Helpers
    getUserById,
    getDisplayName,
    
    // Loading states
    isLoadingUser: isLoading('users.loadUser'),
    isLoadingUsers: isLoading('users.loadUsers'),
    userError: getError('users.loadUser'),
    usersError: getError('users.loadUsers'),
  };
};

export default useUsers;