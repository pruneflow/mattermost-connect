import { useState, useCallback, useEffect } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import {
  selectCurrentUserId,
  selectIsAuthenticated,
  selectAuthToken,
  selectServerUrl,
  selectCurrentTeamId,
  selectTeams,
  selectUserProfiles,
} from "../store/selectors";
import {
  setUsersStatus,
  setTeams,
  setTeamUnreads,
} from "../store/slices/entitiesSlice";
import { setPreferences } from "../store/slices/preferencesSlice";
import { client } from "../api/client";
import { store } from "../store";
import { useWebSocket } from "./useWebSocket";
import { navigateToTeam, getLastVisited, initializeNavigation } from "../services/navigationService";
import { useUserStatus } from "./useUserStatus";
import { initConfig } from "../services/configService";

const STATUS_INTERVAL = 60000;

/**
 * Centralised app initialization hook following Mattermost pattern
 * Single point for all initial API calls to avoid duplication
 */
export const useAppInitialization = () => {
  const dispatch = useAppDispatch();
  const { connect: connectWebSocket, disconnect: disconnectWebSocket } =
    useWebSocket();
  
  // Initialize user status management (includes periodic polling)
  useUserStatus();

  // Mattermost pattern: track initialization state
  const [isInitialized, setIsInitialized] = useState(false);

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const token = useAppSelector(selectAuthToken);
  const serverUrl = useAppSelector(selectServerUrl);
  const currentUserId = useAppSelector(selectCurrentUserId);
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const teams = useAppSelector(selectTeams);

  // Periodic status polling function
  const startPeriodicStatusPolling = useCallback(() => {

    const pollStatuses = async () => {
      try {
        // Get current userIds from store (not captured at creation time)
        const currentState = store.getState();
        const currentUserIds = Object.keys(selectUserProfiles(currentState));
        
        if (currentUserIds.length === 0) {
          return;
        }

        const statuses = await client.getStatusesByIds(currentUserIds);
        
        if (statuses && Array.isArray(statuses)) {
          // Transform to Record format for store
          const statusRecord: Record<string, any> = {};
          statuses.forEach((status: any) => {
            statusRecord[status.user_id] = status;
          });

          dispatch(setUsersStatus(statusRecord));
        }
      } catch (error) {
        // Failed to poll user statuses
      }
    };

    // Poll immediately
    pollStatuses();

    // Then poll every 60 seconds
    const interval = setInterval(pollStatuses, STATUS_INTERVAL);

    // Return cleanup function (could be stored in ref if needed)
    return () => clearInterval(interval);
  }, [dispatch]);

  const initializeApp = useCallback(async () => {
    
    // Mattermost pattern: only require authentication, userId and serverUrl
    // Token is optional (cookie-based authentication)
    if (!isAuthenticated || !currentUserId || !serverUrl) {
      setIsInitialized(false);
      return;
    }

    // Skip if already initialized
    if (isInitialized) return;

    try {

      // Initialize navigation state from localStorage
      initializeNavigation();

      // Initialize WebSocket (use token if available, empty string otherwise)
      connectWebSocket(serverUrl, token || '');

      // Load all initial data in parallel (Mattermost pattern)
      const [userTeams, teamUnreads, userStatus, userPreferences] = await Promise.all([
        client.getMyTeams(),
        client.getMyTeamUnreads(),
        client.getStatus(currentUserId),
        client.getUserPreferences(currentUserId),
        initConfig(), // Initialize server configuration
      ]);


      // Update store with all data
      const teamsById = userTeams.reduce(
        (acc: Record<string, any>, team: any) => {
          acc[team.id] = team;
          return acc;
        },
        {},
      );
      dispatch(setTeams(teamsById));

      // Set team unreads
      const teamUnreadMap: Record<
        string,
        { msg_count: number; mention_count: number }
      > = {};
      teamUnreads.forEach((unread) => {
        teamUnreadMap[unread.team_id] = {
          msg_count: unread.msg_count,
          mention_count: unread.mention_count,
        };
      });
      dispatch(setTeamUnreads(teamUnreadMap));

      // Set user status
      dispatch(setUsersStatus({ [currentUserId]: userStatus }));

      // Set user preferences
      dispatch(setPreferences(userPreferences));

      // Mark as initialized (Mattermost pattern)
      setIsInitialized(true);

      // Start periodic status polling after initialization
      setTimeout(() => {
        startPeriodicStatusPolling();
      }, STATUS_INTERVAL);
    } catch (error) {
      setIsInitialized(false);
    }
  }, [isAuthenticated, currentUserId, token, serverUrl, isInitialized, connectWebSocket]);

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

  useEffect(() => {
    if (
      !isInitialized ||
      !isAuthenticated ||
      currentTeamId ||
      teams.length === 0
    ) {
      return;
    }

    // Try to restore last visited team/channel
    const lastVisited = getLastVisited();
    if (lastVisited && teams.some((team) => team.id === lastVisited.teamId)) {
      navigateToTeam(lastVisited.teamId);
    } else {
      // Fallback: navigate to first team (will auto-select best channel)
      navigateToTeam(teams[0].id);
    }
  }, [isInitialized]);

  return {
    initializeApp,
    isInitialized: isInitialized && isAuthenticated && currentUserId,
  };
};

export default useAppInitialization;
