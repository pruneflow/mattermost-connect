import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { selectCurrentUserId } from '../store/selectors';
import { setUserStatus } from '../store/slices/entitiesSlice';
import type { UserStatus } from '../api/types';

/**
 * WebSocket handler for user status events
 * Following Mattermost's real-time status update patterns
 * 
 * IMPORTANT: Only handles OTHER users' status changes, not current user
 * Current user status is managed manually in useUserStatus hook
 */
export const useStatusWebSocket = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);

  const handleStatusEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'status_change':
      case 'user_status_changed':
        if (data && data.user_id && data.status) {
          // Skip status events for current user - managed manually in useUserStatus
          if (data.user_id === currentUserId) {
            console.log(`WebSocket: Ignoring own status event for user ${data.user_id}`);
            return;
          }

          // Transform WebSocket data to UserStatus format
          const userStatus: UserStatus = {
            user_id: data.user_id,
            status: data.status,
            manual: data.manual || false,
            last_activity_at: data.last_activity_at || Date.now()
          };

          console.log(`WebSocket: User ${data.user_id} status changed to ${data.status}`);
          dispatch(setUserStatus(userStatus));
        }
        break;

      default:
        // Not a status-related event, ignore
        break;
    }
  }, [dispatch, currentUserId]);

  return {
    handleStatusEvent,
  };
};

export default useStatusWebSocket;