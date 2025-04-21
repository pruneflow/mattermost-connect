// src/context/UserContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { User, UserStatus, Channel } from "../types";
import { ServiceContainer } from "../services/factory";
import { formatUserDisplayName } from "../utils";
import { useConnection } from "./ConnectionContext";

/**
 * Interface for the UserContext
 * Provides user management functionality
 */
export interface UserContextType {
  // Current user state
  currentUser: User | null;
  isCurrentUserLoading: boolean;
  currentUserError: Error | null;

  // User roster management
  knownUsers: Record<string, User>;
  userStatuses: Record<string, UserStatus>;

  // Methods for user management
  refreshCurrentUser: () => Promise<User | null>;
  getUser: (userId: string) => Promise<User | null>;
  getUserDisplayName: (userId: string) => string;
  getUserStatus: (userId: string) => Promise<UserStatus | null>;
  isCurrentUser: (userId: string) => boolean;

  // Batch loading methods
  loadUsers: (userIds: string[]) => Promise<User[]>;
  loadTeamUsers: (teamId: string) => Promise<void>;
  loadDirectMessageUsers: (channels: Channel[]) => Promise<void>;

  // Typing indicator state
  typingUsers: Record<string, string[]>;
  isUserTyping: (channelId: string, userId: string) => boolean;
  getTypingUsersForChannel: (channelId: string) => string[];
  getTypingIndicatorText: (channelId: string) => string;
}

// Create the context with a default value of null
export const UserContext = createContext<UserContextType | null>(null);

/**
 * Custom hook to access the UserContext
 * Throws an error if used outside of a UserProvider
 */
export function useUserContext(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}

/**
 * Props for UserProvider component
 */
export interface UserProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
  refreshInterval?: number;
}

/**
 * Provider component for user management
 * Handles user data, caching, and status tracking
 */
export const UserProvider: React.FC<UserProviderProps> = ({
  children,
  services,
  refreshInterval = 300000, // 5 minutes
}) => {
  // Get connection state from ConnectionContext
  const connection = useConnection();

  // State for current user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCurrentUserLoading, setIsCurrentUserLoading] =
    useState<boolean>(false);
  const [currentUserError, setCurrentUserError] = useState<Error | null>(null);

  // State for user roster
  const [knownUsers, setKnownUsers] = useState<Record<string, User>>({});
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>(
    {},
  );

  // State for typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // Refs for caching and tracking
  const currentUserRef = useRef<User | null>(null);
  const lastUserRefreshRef = useRef<number>(0);
  const pendingUserRequestsRef = useRef<Record<string, Promise<User | null>>>(
    {},
  );
  const isLoadingRef = useRef<boolean>(false);

  /**
   * Load current user data
   */
  const loadCurrentUser = useCallback(async (): Promise<User | null> => {
    if (!services?.mattermostService) {
      setCurrentUserError(new Error("Mattermost service not available"));
      return null;
    }

    setIsCurrentUserLoading(true);
    setCurrentUserError(null);

    try {
      const user = await services.mattermostService.getCurrentUser();

      // Update state and ref
      setCurrentUser(user);
      currentUserRef.current = user;

      // Update the user service with current user ID
      if (services.userService && user.id) {
        if (typeof services.userService.setCurrentUserId === "function") {
          services.userService.setCurrentUserId(user.id);
        }

        // Add to known users
        services.userService.addUser(user);
        setKnownUsers((prev) => ({
          ...prev,
          [user.id]: user,
        }));
      }

      // Update notification service with current user ID
      if (services.notificationService && user.id) {
        services.notificationService.setCurrentUserId(user.id);
      }

      lastUserRefreshRef.current = Date.now();
      return user;
    } catch (error) {
      console.error("Error loading current user:", error);
      const typedError =
        error instanceof Error ? error : new Error(String(error));

      setCurrentUserError(typedError);
      return null;
    } finally {
      setIsCurrentUserLoading(false);
    }
  }, [services]);

  /**
   * Refresh current user data
   */
  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    if (!services?.mattermostService) {
      return null;
    }

    try {
      // Check if the service implements refreshCurrentUser
      if (typeof services.mattermostService.refreshCurrentUser === "function") {
        const user = await services.mattermostService.refreshCurrentUser();

        // Only update if there were changes
        if (JSON.stringify(currentUserRef.current) !== JSON.stringify(user)) {
          setCurrentUser(user);
          currentUserRef.current = user;

          // Add to known users
          if (services.userService) {
            services.userService.addUser(user);
            setKnownUsers((prev) => ({
              ...prev,
              [user.id]: user,
            }));
          }
        }

        lastUserRefreshRef.current = Date.now();
        return user;
      } else {
        // Fall back to reloading the user
        return loadCurrentUser();
      }
    } catch (error) {
      console.error("Error refreshing current user:", error);
      return null;
    }
  }, [services, loadCurrentUser]);

  /**
   * Get a user by ID (from cache or API)
   */
  const getUser = useCallback(
    async (userId: string): Promise<User | null> => {
      if (!userId || !services?.userService) {
        return null;
      }

      // Check if user is in local cache
      if (knownUsers[userId]) {
        return knownUsers[userId];
      }

      // Check if request is already pending
      if (userId in pendingUserRequestsRef.current) {
        return pendingUserRequestsRef.current[userId];
      }

      // Create a new request
      const userPromise = services.userService
        .getUser(userId)
        .then((user) => {
          if (user) {
            // Update state with the new user
            setKnownUsers((prev) => ({
              ...prev,
              [userId]: user,
            }));
          }
          // Remove from pending requests
          delete pendingUserRequestsRef.current[userId];
          return user;
        })
        .catch((error) => {
          console.error(`Error fetching user ${userId}:`, error);
          delete pendingUserRequestsRef.current[userId];
          return null;
        });

      // Store the pending request
      pendingUserRequestsRef.current[userId] = userPromise;
      return userPromise;
    },
    [services, knownUsers],
  );

  /**
   * Load multiple users at once
   */
  const loadUsers = useCallback(
    async (userIds: string[]): Promise<User[]> => {
      if (!userIds.length || !services?.userService) {
        return [];
      }

      try {
        const users = await services.userService.getUsers({ ids: userIds });

        // Update the known users cache
        const newUsersMap = users.reduce(
          (acc, user) => {
            acc[user.id] = user;
            return acc;
          },
          {} as Record<string, User>,
        );

        setKnownUsers((prev) => ({
          ...prev,
          ...newUsersMap,
        }));

        return users;
      } catch (error) {
        console.error("Error loading users:", error);
        return [];
      }
    },
    [services],
  );

  /**
   * Load all users in a team
   */
  const loadTeamUsers = useCallback(
    async (teamId: string): Promise<void> => {
      if (!teamId || !services?.userService || isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        // Check if the function exists
        if (typeof services.userService.loadTeamUsers === "function") {
          await services.userService.loadTeamUsers(teamId);

          // Update the known users from the service
          if (typeof services.userService.getAllUsers === "function") {
            const allUsers = services.userService.getAllUsers();
            setKnownUsers((prev) => ({
              ...prev,
              ...allUsers,
            }));
          }
        }
      } catch (error) {
        console.error(`Error loading team ${teamId} users:`, error);
      } finally {
        isLoadingRef.current = false;
      }
    },
    [services],
  );

  /**
   * Load users involved in direct message channels
   */
  const loadDirectMessageUsers = useCallback(
    async (channels: Channel[]): Promise<void> => {
      if (!channels.length || !services?.userService || isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        // Check if the function exists
        if (typeof services.userService.loadDirectMessageUsers === "function") {
          await services.userService.loadDirectMessageUsers(channels);

          // Update the known users from the service
          if (typeof services.userService.getAllUsers === "function") {
            const allUsers = services.userService.getAllUsers();
            setKnownUsers((prev) => ({
              ...prev,
              ...allUsers,
            }));
          }
        }
      } catch (error) {
        console.error("Error loading direct message users:", error);
      } finally {
        isLoadingRef.current = false;
      }
    },
    [services],
  );

  /**
   * Get user display name, formatted according to preferences
   */
  const getUserDisplayName = useCallback(
    (userId: string): string => {
      if (!userId) return "Unknown User";

      const user = knownUsers[userId];
      if (!user) {
        // Load the user in the background
        void getUser(userId);
        return "Loading...";
      }

      return formatUserDisplayName(user);
    },
    [knownUsers, getUser],
  );

  /**
   * Get user status
   */
  const getUserStatus = useCallback(
    async (userId: string): Promise<UserStatus | null> => {
      if (!userId || !services?.mattermostService) {
        return null;
      }

      try {
        const status = await services.mattermostService.getUserStatus(userId);

        // Update status cache
        setUserStatuses((prev) => ({
          ...prev,
          [userId]: status,
        }));

        return status;
      } catch (error) {
        console.error(`Error fetching status for user ${userId}:`, error);
        return null;
      }
    },
    [services],
  );

  /**
   * Check if a user ID matches the current user
   */
  const isCurrentUser = useCallback(
    (userId: string): boolean => {
      if (!userId || !currentUser) return false;
      return userId === currentUser.id;
    },
    [currentUser],
  );

  /**
   * Check if a user is typing in a specific channel
   */
  const isUserTyping = useCallback(
    (channelId: string, userId: string): boolean => {
      if (!channelId || !userId || !typingUsers[channelId]) return false;
      return typingUsers[channelId].includes(userId);
    },
    [typingUsers],
  );

  /**
   * Get list of users typing in a channel
   */
  const getTypingUsersForChannel = useCallback(
    (channelId: string): string[] => {
      if (!channelId || !typingUsers[channelId]) return [];
      return [...typingUsers[channelId]];
    },
    [typingUsers],
  );

  /**
   * Get formatted typing indicator text for a channel
   */
  const getTypingIndicatorText = useCallback(
    (channelId: string): string => {
      const typingUserIds = getTypingUsersForChannel(channelId);
      if (typingUserIds.length === 0) return "";

      // Format user names
      const typingUserNames = typingUserIds
        .map((userId) => getUserDisplayName(userId))
        .filter(Boolean);

      if (typingUserNames.length === 0) return "";

      if (typingUserNames.length === 1) {
        return `${typingUserNames[0]} is typing...`;
      }

      if (typingUserNames.length === 2) {
        return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
      }

      // More than 2 users
      const remaining = typingUserNames.length - 2;
      return `${typingUserNames[0]}, ${typingUserNames[1]} and ${remaining} other${
        remaining > 1 ? "s" : ""
      } are typing...`;
    },
    [getTypingUsersForChannel, getUserDisplayName],
  );

  // Load current user on init or when connection changes
  useEffect(() => {
    if (connection.isConnected && services?.mattermostService && !currentUser) {
      void loadCurrentUser();
    }
  }, [connection.isConnected, services, currentUser, loadCurrentUser]);

  // Set up periodic user refresh
  useEffect(() => {
    if (
      !refreshInterval ||
      !connection.isConnected ||
      !services?.mattermostService
    ) {
      return;
    }

    const checkRefresh = () => {
      const now = Date.now();
      if (now - lastUserRefreshRef.current >= refreshInterval) {
        void refreshCurrentUser();
      }
    };

    // Check immediately
    checkRefresh();

    // Set up interval
    const intervalId = setInterval(checkRefresh, refreshInterval);

    return () => clearInterval(intervalId);
  }, [connection.isConnected, services, refreshInterval, refreshCurrentUser]);

  // Listen for typing events
  useEffect(() => {
    if (!services?.notificationService) return;

    const handleTypingUpdated = (data: any) => {
      if (!data.channelId) return;

      setTypingUsers((prev) => {
        const newTypingUsers = { ...prev };

        if (data.typingUsers && data.typingUsers.length > 0) {
          newTypingUsers[data.channelId] = data.typingUsers;
        } else {
          delete newTypingUsers[data.channelId];
        }

        return newTypingUsers;
      });
    };

    // Subscribe to typing events
    return services.notificationService.addEventListener(
      "typing_updated",
      handleTypingUpdated,
    );
  }, [services]);

  // Sync with user service periodically
  useEffect(() => {
    if (!services?.userService) return;

    const syncKnownUsers = () => {
      if (typeof services.userService.getAllUsers === "function") {
        const allUsers = services.userService.getAllUsers();

        // Only update if there are changes
        const hasChanges = Object.keys(allUsers).some(
          (userId) =>
            !knownUsers[userId] ||
            JSON.stringify(knownUsers[userId]) !==
              JSON.stringify(allUsers[userId]),
        );

        if (hasChanges) {
          setKnownUsers(allUsers);
        }
      }
    };

    // Initial sync
    syncKnownUsers();

    // Set up interval for periodic sync
    const intervalId = setInterval(syncKnownUsers, 30000);

    return () => clearInterval(intervalId);
  }, [services, knownUsers]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<UserContextType>(
    () => ({
      // State
      currentUser,
      isCurrentUserLoading,
      currentUserError,
      knownUsers,
      userStatuses,
      typingUsers,

      // Methods
      refreshCurrentUser,
      getUser,
      getUserDisplayName,
      getUserStatus,
      isCurrentUser,
      loadUsers,
      loadTeamUsers,
      loadDirectMessageUsers,
      isUserTyping,
      getTypingUsersForChannel,
      getTypingIndicatorText,
    }),
    [
      currentUser,
      isCurrentUserLoading,
      currentUserError,
      knownUsers,
      userStatuses,
      typingUsers,
      refreshCurrentUser,
      getUser,
      getUserDisplayName,
      getUserStatus,
      isCurrentUser,
      loadUsers,
      loadTeamUsers,
      loadDirectMessageUsers,
      isUserTyping,
      getTypingUsersForChannel,
      getTypingIndicatorText,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
