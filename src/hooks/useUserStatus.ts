import { useCallback, useEffect, useRef } from 'react';
import { useAppSelector } from './useAppSelector';
import { selectUserStatuses } from '../store/selectors';
import { useAppDispatch } from './useAppDispatch';
import { selectCurrentUserId } from '../store/selectors';
import { client } from '../api/client';
import { setUsersStatus } from "../store";
import type { UserStatus } from '../api/types';

// Mattermost status management constants
const STATUS_INTERVAL = 60000; // 1 minute - following Mattermost pattern
const AWAY_TIMEOUT = 600000; // 10 minutes - Mattermost standard

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
  const statuses = useAppSelector(selectUserStatuses);
  const currentUserId = useAppSelector(selectCurrentUserId);
  
  const currentUserStatus = currentUserId ? statuses[currentUserId] : null;
  
  // Auto-away management - following Mattermost pattern
  const lastActivityRef = useRef<number>(Date.now());
  const awayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity time - called on user interactions
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check and set away status if inactive - Mattermost pattern
  const checkAwayStatus = useCallback(async () => {
    if (!currentUserId) return;
    
    // Get current status from store to avoid stale closure
    const currentStatus = statuses[currentUserId];
    if (!currentStatus) return;
    
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const isCurrentlyAway = currentStatus.status === 'away';
    const isManualStatus = currentStatus.manual;
    
    // Only auto-set away if not manually set and not already away
    if (timeSinceActivity >= AWAY_TIMEOUT && !isCurrentlyAway && !isManualStatus) {
      try {
        await client.updateStatus({ 
          user_id: currentUserId, 
          status: 'away',
          manual: false,
          last_activity_at: lastActivityRef.current 
        });
        
        dispatch(setUsersStatus({
          [currentUserId]: {
            ...currentStatus,
            status: 'away',
            manual: false,
            last_activity_at: lastActivityRef.current
          }
        }));
      } catch (error) {
        // Failed to set away status
      }
    }
  }, [currentUserId, statuses, dispatch]);


  // Start periodic status updates - following Mattermost pattern
  useEffect(() => {
    if (!currentUserId) return;
    
    // Set up away timer
    awayTimerRef.current = setInterval(checkAwayStatus, STATUS_INTERVAL);
    
    // Activity listeners to reset away timer
    const handleActivity = () => {
      updateLastActivity();
      
      // If user was away and becomes active, set back to online
      const currentStatus = statuses[currentUserId];
      if (currentStatus?.status === 'away' && !currentStatus.manual) {
        updateStatus('online', false); // false = automatic status change
      }
    };
    
    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      if (awayTimerRef.current) {
        clearInterval(awayTimerRef.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [currentUserId, checkAwayStatus, updateLastActivity]);


  // Actions
  const loadUsersStatus = useCallback(async (userIds: string[]) => {
    try {
      const statuses = await client.getStatusesByIds(userIds);

      // Convert array to record format expected by the store
      const statusRecord: Record<string, UserStatus> = {};
      statuses.forEach((status: UserStatus) => {
        statusRecord[status.user_id] = status;
      });

      dispatch(setUsersStatus(statusRecord));
      return statuses;
    } catch (error) {
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

  const updateStatus = useCallback(async (newStatus: UserStatus['status'], manual: boolean = true) => {
    if (!currentUserId) return;
    
    try {
      await client.updateStatus({ 
        user_id: currentUserId, 
        status: newStatus,
        manual,
        last_activity_at: Date.now()
      });
      
      // Update local state
      dispatch(setUsersStatus({
        [currentUserId]: { 
          user_id: currentUserId, 
          status: newStatus, 
          manual,
          last_activity_at: Date.now() 
        }
      }));
      
      
      // Reset activity timer on manual status change
      if (manual) {
        updateLastActivity();
      }
      
    } catch (error) {
      throw error;
    }
  }, [currentUserId, dispatch, updateLastActivity]);

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