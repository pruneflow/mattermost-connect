import { useCallback, useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { loginUser, logoutUser, getCurrentUser, setServerUrl } from '../store/slices/authSlice';
import { setUsersStatus, setTeams, setCurrentTeamId } from '../store/slices/entitiesSlice';
import { LoginRequest } from '../api/types';
import { client } from '../api/client';

// Auth hook providing authentication state and actions
export const useAuth = () => {
  const dispatch = useAppDispatch();
  
  // Auth state
  const { isAuthenticated, token, serverUrl } = useAppSelector(state => state.auth);
  const { isLoggingIn, loginError } = useAppSelector(state => state.views.auth);
  const currentUserId = useAppSelector(state => state.entities.users.currentUserId);
  const currentTeamId = useAppSelector(state => state.entities.teams.currentTeamId);
  const currentUser = useAppSelector(state => 
    currentUserId ? state.entities.users.profiles[currentUserId] : null
  );
  const teams = useAppSelector(state => state.entities.teams.teams);

  // Configure Client4 with stored credentials if authenticated
  useEffect(() => {
    if (isAuthenticated && token && serverUrl) {
      if (client.getToken() !== token) {
        client.setUrl(serverUrl);
        client.setToken(token);
      }
    }
  }, [isAuthenticated, token, serverUrl]);

  // Auto-load essential data after authentication - ONCE only
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      const loadInitialData = async () => {
        try {
          // Load user status
          const userStatus = await client.getStatus(currentUserId);
          dispatch(setUsersStatus({ [currentUserId]: userStatus }));

          // Load user teams - this is the main place for initial loading
          const userTeams = await client.getMyTeams();
          const teamsById = userTeams.reduce((acc: Record<string, any>, team: any) => {
            acc[team.id] = team;
            return acc;
          }, {});
          dispatch(setTeams(teamsById));

          // Set first team as current if none selected
          if (!currentTeamId && userTeams.length > 0) {
            dispatch(setCurrentTeamId(userTeams[0].id));
          }
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
      };
      loadInitialData();
    }
  }, [isAuthenticated, currentUserId]); // REMOVED teams and currentTeamId to prevent loops

  // Auth actions
  const login = useCallback(
    async (credentials: LoginRequest & { serverUrl: string }) => {
      const result = await dispatch(loginUser(credentials));
      return loginUser.fulfilled.match(result);
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
  }, [dispatch]);

  const refreshUser = useCallback(async () => {
    const result = await dispatch(getCurrentUser());
    return getCurrentUser.fulfilled.match(result);
  }, [dispatch]);

  const updateServerUrl = useCallback((url: string) => {
    dispatch(setServerUrl(url));
  }, [dispatch]);

  return {
    // State
    isAuthenticated,
    isLoggingIn,
    loginError,
    token,
    serverUrl,
    currentUser,
    currentUserId,
    
    // Actions
    login,
    logout,
    refreshUser,
    updateServerUrl,
  };
};

export default useAuth;