import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
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
  loadUsers: () => Promise<void>;
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
  
  // Users state
  const { currentUserId, profiles } = useAppSelector(state => state.entities.users);
  const currentUser = currentUserId ? profiles[currentUserId] : null;

  // Get users array
  const usersArray = Object.values(profiles);

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

  const loadUsers = useCallback(async () => {
    // Placeholder for Phase 3 - will load channel users
    // For now, this is a no-op since we focus on individual user loading
    console.log('loadUsers called - placeholder for Phase 3');
  }, []);

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
    users: usersArray,
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