// src/context/MattermostProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import {
  createDirectService,
  createProxyService,
  setupWebsocket,
} from "../services";
import type {
  User,
  ProviderConfig,
  MattermostService,
  Team,
  Channel,
  Message,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
  UserStatus,
  WebSocketConnection,
} from "../types";

/**
 * Mattermost context interface that provides access to
 * all Mattermost functionality and state
 */
export interface MattermostContextType {
  /** Current connection mode (direct, proxy, custom) */
  mode: "direct" | "proxy" | "custom" | null;

  /** Whether connected to Mattermost */
  isConnected: boolean;

  /** Error if connection failed */
  error: Error | null;

  /** Current user information */
  currentUser: User | null;

  /** The underlying service instance */
  service: MattermostService | null;

  /** WebSocket connection instance */
  websocket: WebSocketConnection | null;

  /** Get channel information */
  getChannel: (channelId: string) => Promise<Channel>;

  /** Get channel messages */
  getChannelMessages: (
    channelId: string,
    options?: GetMessagesOptions,
  ) => Promise<MessagesResponse>;

  /** Post a message to a channel */
  postMessage: (channelId: string, message: string) => Promise<Message>;

  /** Get all channels in a team */
  getChannels: (teamId: string) => Promise<Channel[]>;

  /** Get all teams the user belongs to */
  getTeams: () => Promise<Team[]>;

  /** Get users based on options */
  getUsers: (options?: GetUsersOptions) => Promise<User[]>;

  /** Get a user's status */
  getUserStatus: (userId: string) => Promise<UserStatus>;
}

// Create the context
const MattermostContext = createContext<MattermostContextType | null>(null);

/**
 * Hook to use the Mattermost context
 * @returns The Mattermost context
 * @throws Error if used outside of MattermostProvider
 */
export const useMattermost = (): MattermostContextType => {
  const context = useContext(MattermostContext);
  if (!context) {
    throw new Error("useMattermost must be used within a MattermostProvider");
  }
  return context;
};

/**
 * Props for the MattermostProvider component
 */
interface MattermostProviderProps extends ProviderConfig {
  /** Children components */
  children: ReactNode;
}

/**
 * Provider component for configuring Mattermost access
 * Supports three modes: Direct, Proxy, and Custom
 */
export const MattermostProvider: React.FC<MattermostProviderProps> = ({
  // Direct mode config
  serverUrl,
  token,

  // Proxy mode config
  proxyUrl,
  clientId,
  userId,

  // Custom service provider for tests/demos
  serviceProvider,

  // Common options
  enableWebsocket = true,
  refreshInterval = 30000,

  // Children components
  children,
}) => {
  // Provider state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [websocket, setWebsocket] = useState<WebSocketConnection | null>(null);
  const [service, setService] = useState<MattermostService | null>(null);

  // Determine the mode based on provided props
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

  // Initialize the appropriate service based on the mode
  useEffect(() => {
    if (!mode) {
      setError(
        new Error(
          "Invalid configuration. You must provide (serverUrl and token) OR (proxyUrl and clientId) OR serviceProvider.",
        ),
      );
      return;
    }

    const initService = async () => {
      try {
        let serviceInstance: MattermostService;

        if (mode === "custom" && serviceProvider) {
          // Use the custom service provider
          serviceInstance = serviceProvider.setupService();
          setIsConnected(serviceProvider.isConnected !== false);
        } else if (mode === "direct" && serverUrl && token) {
          // Direct mode with user token
          serviceInstance = createDirectService({ serverUrl, token });
        } else if (mode === "proxy" && proxyUrl && clientId) {
          // Proxy mode via our service
          serviceInstance = createProxyService({ proxyUrl, clientId, userId });
        } else {
          throw new Error("Invalid configuration");
        }

        setService(serviceInstance);

        // Test the connection (except for custom services that specify to skip it)
        if (mode !== "custom" || !serviceProvider?.skipConnectionTest) {
          try {
            const user = await serviceInstance.getCurrentUser();
            setCurrentUser(user);
            setIsConnected(true);
            setError(null);
          } catch (connErr) {
            console.error("Error connecting:", connErr);
            setError(
              connErr instanceof Error ? connErr : new Error(String(connErr)),
            );
            setIsConnected(false);
          }
        } else if (mode === "custom" && serviceProvider?.currentUser) {
          // For custom services that provide a current user
          setCurrentUser(serviceProvider.currentUser);
        }

        // Initialize WebSocket if enabled
        if (
          enableWebsocket &&
          (mode !== "custom" || serviceProvider?.enableWebsocket !== false)
        ) {
          try {
            const wsUrl = mode === "direct" ? serverUrl || "" : proxyUrl || "";
            const wsToken =
              mode === "direct"
                ? token || ""
                : await serviceInstance.getWebsocketToken();

            const ws = await setupWebsocket({
              mode,
              serverUrl: wsUrl,
              token: wsToken,
              onMessage: (msg) => {
                // Process WebSocket messages
                console.debug("WebSocket message:", msg);

                // Handle different event types
                if (msg.event === "posted") {
                  // New message posted
                  // Implement logic to update the UI
                } else if (msg.event === "status_change") {
                  // User status changed
                } else if (msg.event === "typing") {
                  // User is typing
                }
              },
              onError: (err) => {
                console.error("WebSocket error:", err);
                // Don't set error here to avoid blocking the UI
              },
              onClose: () => {
                console.debug("WebSocket closed");
                setWebsocket(null);
              },
            });

            setWebsocket(ws);
          } catch (wsError) {
            console.warn("Failed to establish WebSocket connection:", wsError);
            // Continue without WebSocket
          }
        }
      } catch (err) {
        console.error("Error initializing Mattermost service:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsConnected(false);
      }
    };

    initService();

    // Cleanup when unmounting
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [
    mode,
    serverUrl,
    token,
    proxyUrl,
    clientId,
    userId,
    enableWebsocket,
    serviceProvider,
  ]);

  // Context value to share with child components
  const contextValue: MattermostContextType = {
    // State
    mode,
    isConnected,
    error,
    currentUser,
    service,
    websocket,

    // Common method shortcuts with error handling
    getChannel: async (channelId) => {
      if (!service) throw new Error("Service not initialized");
      return service.getChannel(channelId);
    },

    getChannelMessages: async (channelId, options = {}) => {
      if (!service) throw new Error("Service not initialized");
      return service.getChannelMessages(channelId, options);
    },

    postMessage: async (channelId, message) => {
      if (!service) throw new Error("Service not initialized");
      return service.postMessage(channelId, message);
    },

    getChannels: async (teamId) => {
      if (!service) throw new Error("Service not initialized");
      return service.getChannels(teamId);
    },

    getTeams: async () => {
      if (!service) throw new Error("Service not initialized");
      return service.getTeams();
    },

    getUsers: async (options = {}) => {
      if (!service) throw new Error("Service not initialized");
      return service.getUsers(options);
    },

    getUserStatus: async (userId) => {
      if (!service) throw new Error("Service not initialized");
      return service.getUserStatus(userId);
    },
  };

  return (
    <MattermostContext.Provider value={contextValue}>
      {children}
    </MattermostContext.Provider>
  );
};

// Export the context to allow direct usage if needed
export { MattermostContext };

export default MattermostProvider;
