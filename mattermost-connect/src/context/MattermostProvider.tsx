// src/context/MattermostProvider.tsx
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { createServiceContainer, ServiceContainer } from "../services";
import { ProviderConfig } from "../types";

// Import specialized context providers
import { ConnectionProvider } from "./ConnectionContext";
import { UserProvider } from "./UserContext";
import { TeamProvider } from "./TeamContext";
import { ChannelProvider } from "./ChannelContext";
import { MessageProvider } from "./MessageContext";
import { AuthProvider } from "./AuthContext";

/**
 * Interface for the MattermostContext
 * Acts as a gateway to the specialized contexts and services
 */
export interface MattermostContextType {
  /** Service container with all specialized services */
  services: ServiceContainer | null;

  /** Whether the service is fully configured for a specific connection mode */
  isServiceConfigured: boolean;

  /** Update service configuration */
  updateServiceConfig: (config: Partial<ProviderConfig>) => void;

  /** Current configuration */
  config: ProviderConfig;

  /** Current connection mode */
  mode: "direct" | "proxy" | "custom" | null;
}

// Create the context with a default value of null
export const MattermostContext = createContext<MattermostContextType | null>(
  null,
);

/**
 * Hook to use the MattermostContext
 * Throws an error if used outside of MattermostProvider
 */
export const useMattermost = (): MattermostContextType => {
  const mattermostContext = useContext(MattermostContext);
  if (!mattermostContext) {
    throw new Error("useMattermost must be used within a MattermostProvider");
  }
  return mattermostContext;
};

/**
 * Props for the MattermostProvider component
 */
export interface MattermostProviderProps {
  /** Child components */
  children: ReactNode;

  // Direct mode configuration
  serverUrl?: string;
  token?: string;

  // Proxy mode configuration
  proxyUrl?: string;
  clientId?: string;
  userId?: string;

  // Custom mode configuration
  serviceProvider?: any;

  // Common options
  enableWebsocket?: boolean;
  refreshInterval?: number;
  useLocalStorage?: boolean;
}

/**
 * Main provider component for Mattermost integration
 * Initializes and manages services
 */
export const MattermostProvider: React.FC<MattermostProviderProps> = ({
  // Direct mode configuration
  serverUrl,
  token,

  // Proxy mode configuration
  proxyUrl,
  clientId,
  userId,

  // Custom mode configuration
  serviceProvider,

  // Common options
  enableWebsocket = true,
  refreshInterval = 300000, // 5 minutes
  useLocalStorage = true,

  // Children
  children,
}) => {
  // State to store current configuration
  const [config, setConfig] = useState<ProviderConfig>({
    serverUrl,
    token,
    proxyUrl,
    clientId,
    userId,
    serviceProvider,
    enableWebsocket,
    refreshInterval,
    useLocalStorage,
  });

  // Determine the connection mode based on provided props
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (config.serviceProvider) return "custom";
    if (config.serverUrl) return "direct";
    if (config.proxyUrl) return "proxy";
    return null;
  }, [
    config.serviceProvider,
    config.serverUrl,
    config.token,
    config.proxyUrl,
    config.clientId,
  ]);

  // Track whether the service is fully configured
  const isServiceConfigured = useMemo(() => mode !== null, [mode]);
  console.debug("mode", mode);
  // Create service container based on configuration
  const services = useMemo<ServiceContainer | null>(() => {
    if (!mode) return null;

    try {
      return createServiceContainer({
        serverUrl: config.serverUrl,
        token: config.token,
        proxyUrl: config.proxyUrl,
        clientId: config.clientId,
        userId: config.userId,
        serviceProvider: config.serviceProvider,
        enableWebsocket: config.enableWebsocket,
        refreshInterval: config.refreshInterval,
      });
    } catch (error) {
      console.error("Error creating service container:", error);
      return null;
    }
  }, [
    mode,
    config.serverUrl,
    config.token,
    config.proxyUrl,
    config.clientId,
    config.userId,
    config.serviceProvider,
    config.enableWebsocket,
    config.refreshInterval,
  ]);

  // Handler for WebSocket messages
  const handleWebSocketMessage = useMemo(() => {
    return services?.notificationService
      ? (message: any) =>
          services.notificationService.processWebSocketEvent(message)
      : undefined;
  }, [services]);

  // Method to update service configuration
  const updateServiceConfig = useCallback(
    (newConfig: Partial<ProviderConfig>) => {
      console.debug("newConfig", newConfig);
      setConfig((prevConfig) => ({
        ...prevConfig,
        ...newConfig,
      }));
    },
    [],
  );

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<MattermostContextType>(
    () => ({
      services,
      isServiceConfigured,
      updateServiceConfig,
      config,
      mode,
    }),
    [services, isServiceConfigured, updateServiceConfig, config, mode],
  );

  return (
    <MattermostContext.Provider value={contextValue}>
      <AuthProvider storeToken={config.useLocalStorage}>
        <ConnectionProvider
          enableWebsocket={config.enableWebsocket}
          notificationHandler={handleWebSocketMessage}
        >
          <UserProvider
            services={services}
            refreshInterval={config.refreshInterval}
          >
            <TeamProvider
              services={services}
              refreshInterval={config.refreshInterval}
            >
              <ChannelProvider
                services={services}
                refreshInterval={config.refreshInterval}
              >
                <MessageProvider services={services}>
                  {children}
                </MessageProvider>
              </ChannelProvider>
            </TeamProvider>
          </UserProvider>
        </ConnectionProvider>
      </AuthProvider>
    </MattermostContext.Provider>
  );
};

export default MattermostProvider;
