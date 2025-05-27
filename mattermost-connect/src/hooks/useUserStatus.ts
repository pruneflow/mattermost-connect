import { useCallback, useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { Client4 } from '../api/client';
import { setUsersStatus } from "../store";
import type { UserStatus } from '../api/types';

export const useUserStatus = (): {
  statuses: Record<string, UserStatus>;
  status: UserStatus['status'];
  loadUsersStatus: (userIds: string[]) => Promise<UserStatus[]>;
  updateStatus: (status: UserStatus['status']) => Promise<void>;
  getUserStatus: (userId: string) => UserStatus | null;
  isUserOnline: (userId: string) => boolean;
  isUserAway: (userId: string) => boolean;
  isUserDnd: (userId: string) => boolean;
  isUserOffline: (userId: string) => boolean;
} => {
  const dispatch = useAppDispatch();
  
  // Status state
  const { statuses } = useAppSelector(state => state.entities.users);
  const currentUserId = useAppSelector(state => state.entities.users.currentUserId);
  
  const currentUserStatus = currentUserId ? statuses[currentUserId] : null;

  // Load current user status on mount (only once)
  useEffect(() => {
    if (currentUserId && !statuses[currentUserId]) {
      const loadCurrentUserStatus = async () => {
        try {
          const userStatus = await Client4.getStatus(currentUserId);
          dispatch(setUsersStatus({ [currentUserId]: userStatus }));
        } catch (error) {
          console.error('Failed to load current user status:', error);
        }
      };
      loadCurrentUserStatus();
    }
  }, [currentUserId, dispatch]);

  // Actions
  const loadUsersStatus = useCallback(async (userIds: string[]) => {
    try {
      const statuses = await Client4.getStatusesByIds(userIds);
      
      // Convert array to record format expected by the store
      const statusRecord: Record<string, UserStatus> = {};
      statuses.forEach((status: UserStatus) => {
        statusRecord[status.user_id] = status;
      });
      
      dispatch(setUsersStatus(statusRecord));
      return statuses;
    } catch (error) {
      console.error('Failed to load users status:', error);
      throw error;
    }
  }, [dispatch]);

  // Helper functions
  const getUserStatus = useCallback((userId: string): UserStatus | null => {
    return statuses[userId] || null;
  }, [statuses]);

  const isUserOnline = useCallback((userId: string): boolean => {
    const status = statuses[userId];
    return status?.status === 'online';
  }, [statuses]);

  const isUserAway = useCallback((userId: string): boolean => {
    const status = statuses[userId];
    return status?.status === 'away';
  }, [statuses]);

  const isUserDnd = useCallback((userId: string): boolean => {
    const status = statuses[userId];
    return status?.status === 'dnd';
  }, [statuses]);

  const isUserOffline = useCallback((userId: string): boolean => {
    const status = statuses[userId];
    return !status || status.status === 'offline';
  }, [statuses]);

  const updateStatus = useCallback(async (newStatus: UserStatus['status']) => {
    if (!currentUserId) return;
    
    try {
      await Client4.updateStatus({ user_id: currentUserId, status: newStatus });
      // Update local state
      dispatch(setUsersStatus({
        [currentUserId]: { user_id: currentUserId, status: newStatus, manual: true, last_activity_at: Date.now() }
      }));
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    }
  }, [currentUserId, dispatch]);

  return {
    // State
    statuses,
    status: currentUserStatus?.status || 'offline',
    
    // Actions
    loadUsersStatus,
    updateStatus,
    
    // Helpers
    getUserStatus,
    isUserOnline,
    isUserAway,
    isUserDnd,
    isUserOffline,
  };
};

export default useUserStatus;