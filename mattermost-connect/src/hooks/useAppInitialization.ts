import { useState, useCallback, useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { selectCurrentUserId, selectIsAuthenticated, selectAuthToken, selectServerUrl, selectCurrentTeamId, selectTeamsById } from '../store/selectors';
import { setUsersStatus, setTeams, setCurrentTeamId, setTeamUnreads } from '../store/slices/entitiesSlice';
import { client } from '../api/client';
import { useWebSocket } from './useWebSocket';

/**
 * Centralised app initialization hook following Mattermost pattern
 * Single point for all initial API calls to avoid duplication
 */
export const useAppInitialization = () => {
  const dispatch = useAppDispatch();
  const { connect: connectWebSocket, disconnect: disconnectWebSocket } = useWebSocket();
  
  // Mattermost pattern: track initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const token = useAppSelector(selectAuthToken);
  const serverUrl = useAppSelector(selectServerUrl);
  const currentUserId = useAppSelector(selectCurrentUserId);
  const currentTeamId = useAppSelector(selectCurrentTeamId);

  const initializeApp = useCallback(async () => {
    if (!isAuthenticated || !currentUserId || !token || !serverUrl) {
      setIsInitialized(false);
      return;
    }

    // Skip if already initialized
    if (isInitialized) return;

    try {
      console.log('🚀 Initializing app data (Mattermost pattern)...');

      // Configure client
      if (client.getToken() !== token) {
        client.setUrl(serverUrl);
        client.setToken(token);
      }

      // Initialize WebSocket
      connectWebSocket(serverUrl, token);

      // Load all initial data in parallel (Mattermost pattern)
      const [userTeams, teamUnreads, userStatus] = await Promise.all([
        client.getMyTeams(),
        client.getMyTeamUnreads(),
        client.getStatus(currentUserId)
      ]);

      console.log('✅ Initial data loaded:', { 
        teams: userTeams.length, 
        unreads: teamUnreads.length
      });

      // Update store with all data
      const teamsById = userTeams.reduce((acc: Record<string, any>, team: any) => {
        acc[team.id] = team;
        return acc;
      }, {});
      dispatch(setTeams(teamsById));

      // Set team unreads
      const teamUnreadMap: Record<string, { msg_count: number; mention_count: number }> = {};
      teamUnreads.forEach(unread => {
        teamUnreadMap[unread.team_id] = {
          msg_count: unread.msg_count,
          mention_count: unread.mention_count
        };
      });
      dispatch(setTeamUnreads(teamUnreadMap));

      // Set user status
      dispatch(setUsersStatus({ [currentUserId]: userStatus }));

      // Set first team as current if none selected
      if (!currentTeamId && userTeams.length > 0) {
        dispatch(setCurrentTeamId(userTeams[0].id));
      }

      // Mark as initialized (Mattermost pattern)
      setIsInitialized(true);
      console.log('✅ App initialization completed');

    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setIsInitialized(false);
    }
  }, [isAuthenticated, currentUserId, token, serverUrl]);

  // Single effect for initialization
  useEffect(() => {
    void initializeApp();
  }, [initializeApp]);

  // Cleanup on logout
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectWebSocket();
    }
  }, [isAuthenticated, disconnectWebSocket]);

  return {
    initializeApp,
    isInitialized: isInitialized && isAuthenticated && currentUserId
  };
};

export default useAppInitialization;