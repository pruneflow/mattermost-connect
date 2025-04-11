// src/context/MattermostProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { createMattermostService } from "../services";
import { createFileService } from "../services/file.service";
import { createEmojiService } from "../services/emoji.service";
import type {
  User,
  ProviderConfig,
  MattermostService,
  WebSocketConnection,
  Message,
} from "../types";
import { setupWebsocket } from "../services/websocket.service";
import { DirectService } from "../services/direct.service";
import { ProxyService } from "../services/proxy.service";
import { FileService } from "../services/file.service";
import { EmojiServiceInterface } from "../services/emoji.service";

/**
 * Type of the Mattermost context that provides access to
 * all Mattermost features and states
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

  /** The service instance */
  service: MattermostService;

  /** WebSocket connection instance */
  websocket: WebSocketConnection | null;

  /** Message being replied to (null if none) */
  replyTo: Message | null;

  /** Function to set the message being replied to */
  setReplyTo: (message: Message | null) => void;

  /** Function to clear the current reply */
  clearReply: () => void;

  /** Whether the user is replying to a message */
  isReplying: boolean;

  /** File service for file operations */
  fileService: FileService;

  /** Emoji service for emoji/GIF operations */
  emojiService: EmojiServiceInterface;
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
  /** Child components */
  children: ReactNode;
}

/**
 * Provider component to configure Mattermost access
 * Supports three modes: Direct, Proxy, and Custom
 */
export const MattermostProvider: React.FC<MattermostProviderProps> = ({
  // Direct mode configuration
  serverUrl,
  token,

  // Proxy mode configuration
  proxyUrl,
  clientId,
  userId,

  // Custom service provider for testing/demos
  serviceProvider,

  // Common options
  enableWebsocket = true,
  refreshInterval = 30000,

  // Child components
  children,
}) => {
  // Provider state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [websocket, setWebsocket] = useState<WebSocketConnection | null>(null);
  const [service, setService] = useState<MattermostService | null>(null);

  // Secondary services
  const [fileService, setFileService] = useState<FileService | null>(null);
  const [emojiService, setEmojiService] =
    useState<EmojiServiceInterface | null>(null);

  // State for reply functionality
  const [replyTo, setReplyToState] = useState<Message | null>(null);

  // Determine mode based on provided props
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

  // Function to set the message being replied to
  const setReplyTo = useCallback((message: Message | null) => {
    setReplyToState(message);
  }, []);

  // Function to clear the current reply
  const clearReply = useCallback(() => {
    setReplyToState(null);
  }, []);

  // Whether the user is replying
  const isReplying = replyTo !== null;

  // Initialize the appropriate service based on mode
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
        // Create service instance with our centralized factory
        const serviceInstance = createMattermostService({
          serverUrl,
          token,
          proxyUrl,
          clientId,
          userId,
          serviceProvider,
        });

        setService(serviceInstance);

        // Initialize auxiliary services with the main service
        const fileServiceInstance = createFileService(serviceInstance);
        const emojiServiceInstance = createEmojiService(serviceInstance);

        setFileService(fileServiceInstance);
        setEmojiService(emojiServiceInstance);

        // Test connection (except for custom services that specify to skip the test)
        if (mode !== "custom" || !serviceProvider?.skipConnectionTest) {
          try {
            // Get current user - now uses caching
            const user = await serviceInstance.getCurrentUser();
            setCurrentUser(user);
            setIsConnected(true);
            setError(null);

            // If WebSocket is enabled, initialize it
            if (enableWebsocket) {
              try {
                // Get WebSocket URL and token
                const wsUrl = serviceInstance.getWebsocketUrl();
                const wsToken = await serviceInstance.getWebsocketToken();

                // Set up WebSocket connection
                const ws = await setupWebsocket({
                  mode: mode as "direct" | "proxy" | "custom",
                  serverUrl: wsUrl,
                  token: wsToken,
                  onMessage: (msg) => {
                    console.log("WebSocket message:", msg);
                    // Process WebSocket messages as needed
                  },
                  onError: (err) => {
                    console.error("WebSocket error:", err);
                  },
                  onClose: (closeEvent) => {
                    console.log("WebSocket closed:", closeEvent);
                    setWebsocket(null);
                  },
                });

                setWebsocket(ws);
              } catch (wsError) {
                console.error("Failed to initialize WebSocket:", wsError);
                // Consider this a warning, not a fatal error
              }
            }
          } catch (connErr) {
            console.error("Connection error:", connErr);
            const errorMessage =
              connErr instanceof Error
                ? connErr.message
                : "Unable to connect to Mattermost server";

            setError(new Error(errorMessage));
            setIsConnected(false);
            setCurrentUser(null);
          }
        } else if (mode === "custom" && serviceProvider?.currentUser) {
          // For custom services that provide a current user
          setCurrentUser(serviceProvider.currentUser);
          setIsConnected(true);

          // If the custom service provides a user cache
          if ((serviceInstance as any)._currentUser) {
            setCurrentUser((serviceInstance as any)._currentUser);
          }
        }

        // Set up an interval to refresh the current user if needed
        // This is useful for keeping status, permissions, etc. up to date
        if (refreshInterval > 0 && serviceInstance) {
          const intervalId = setInterval(async () => {
            try {
              // If the service implements refreshCurrentUser, use it
              if (
                (serviceInstance instanceof DirectService ||
                  serviceInstance instanceof ProxyService) &&
                isConnected
              ) {
                const freshUser = await serviceInstance.refreshCurrentUser();
                setCurrentUser(freshUser);
              }
            } catch (refreshError) {
              console.warn("Error refreshing user:", refreshError);
            }
          }, refreshInterval);

          // Clean up interval on unmount
          return () => clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Service initialization error:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unable to initialize Mattermost service";

        setError(new Error(errorMessage));
        setIsConnected(false);
        setCurrentUser(null);
      }
    };

    void initService();

    // Cleanup on unmount
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
    refreshInterval,
  ]);

  if (!service || !fileService || !emojiService) return null;

  // Context value to share with child components
  const contextValue: MattermostContextType = {
    // State
    mode,
    isConnected,
    error,
    currentUser,
    service,
    websocket,

    // Reply functionality
    replyTo,
    setReplyTo,
    clearReply,
    isReplying,

    // Additional services
    fileService,
    emojiService,
  };

  return (
    <MattermostContext.Provider value={contextValue}>
      {children}
    </MattermostContext.Provider>
  );
};

// Export the context for direct use if needed
export { MattermostContext };

export default MattermostProvider;
