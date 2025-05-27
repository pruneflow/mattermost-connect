import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { Client4 } from '../api/client';
import { setUser } from '../store/slices/entitiesSlice';
import { displayUsername } from '../utils/userUtils';
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
} => {
  const dispatch = useAppDispatch();
  
  // Users state
  const { currentUserId, profiles } = useAppSelector(state => state.entities.users);
  const currentUser = currentUserId ? profiles[currentUserId] : null;

  // Get users array
  const usersArray = Object.values(profiles);

  // Actions
  const loadUser = useCallback(async (userId: string) => {
    try {
      const user = await Client4.getUser(userId);
      dispatch(setUser(user));
      return user;
    } catch (error) {
      console.error(`Failed to load user ${userId}:`, error);
      throw error;
    }
  }, [dispatch]);

  const loadUsers = useCallback(async () => {
    try {
      // For now, just return since we have the current user
      // In Phase 3, we'll load channel users
      console.log('loadUsers called - placeholder for Phase 3');
    } catch (error) {
      console.error('Failed to load users:', error);
      throw error;
    }
  }, []);

  const updateCurrentUser = useCallback(async (userData: Partial<UserProfile>) => {
    try {
      if (!currentUser) throw new Error('No current user');
      
      const updatedUser = await Client4.patchMe(userData);
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
  };
};

export default useUsers;