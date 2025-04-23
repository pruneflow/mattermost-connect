// src/context/UserContext.tsx
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { User } from "../types";
import { ServiceContainer } from "../services";
import { formatUserDisplayName } from "../utils";
import { useConnection } from "./ConnectionContext";

/**
 * Interface for the UserContext
 * Provides user management functionality
 */
export interface UserContextType {
  // Current user state
  currentUser: User | null;

  // Methods for user management
  getUser: (userId: string) => Promise<User | null>;
  getUserDisplayName: (userId: string) => string;

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
  console.debug("UserProvider ");
  // Get connection state from ConnectionContext
  const connection = useConnection();

  // State for current user
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // State for user roster
  const [knownUsers, setKnownUsers] = useState<Record<string, User>>({});

  // State for typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // Refs for caching and tracking
  const currentUserRef = useRef<User | null>(null);
  const lastUserRefreshRef = useRef<number>(0);
  const pendingUserRequestsRef = useRef<Record<string, Promise<User | null>>>(
    {},
  );

  /**
   * Load current user data
   */
  const loadCurrentUser = useCallback(async (): Promise<User | null> => {
    if (!services?.mattermostService) {
      return null;
    }

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
      return null;
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

      // Methods
      getTypingUsersForChannel,
      getTypingIndicatorText,
      getUserDisplayName,
      getUser,
    }),
    [
      currentUser,

      // Methods
      getTypingUsersForChannel,
      getTypingIndicatorText,
      getUserDisplayName,
      getUser,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
