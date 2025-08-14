import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { incrementTeamMemberCount, decrementTeamMemberCount } from '../store/slices/entitiesSlice';

export const useTeamWebSocket = () => {
  const dispatch = useAppDispatch();

  const handleTeamEvent = useCallback((eventType: string, data: any) => {
    try {
      switch (eventType) {
        case 'user_added_to_team':
        case 'added_to_team':
          if (data.team_id) {
            dispatch(incrementTeamMemberCount(data.team_id));
          }
          break;

        case 'user_removed_from_team':
        case 'leave_team':
          if (data.team_id) {
            dispatch(decrementTeamMemberCount(data.team_id));
          }
          break;

        default:
          break;
      }
    } catch (error) {
      // Error handling team WebSocket event
    }
  }, [dispatch]);

  return {
    handleTeamEvent,
  };
};

export default useTeamWebSocket;