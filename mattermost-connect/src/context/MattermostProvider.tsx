// src/context/MattermostProvider.tsx
import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { createServiceContainer, ServiceContainer } from "../services/factory";
import { ProviderConfig } from "../types";

// Import specialized context providers
import { ConnectionProvider, useConnection } from "./ConnectionContext";
import { UserProvider } from "./UserContext";
import { TeamProvider } from "./TeamContext";
import { ChannelProvider } from "./ChannelContext";
import { MessageProvider } from "./MessageContext";

/**
 * Interface for the MattermostContext
 * Acts as a gateway to the specialized contexts
 */
export interface MattermostContextType {
  /** Service container with all specialized services */
  services: ServiceContainer | null;
}

// Create the context with a default value of null
export const MattermostContext = createContext<MattermostContextType | null>(
  null,
);

/**
 * Hook to use the MattermostContext
 * Throws an error if used outside of MattermostProvider
 */
export const useMattermost = (): MattermostContextType & {
  // Re-export key properties from ConnectionContext
  // for backwards compatibility
  mode: "direct" | "proxy" | "custom" | null;
  isConnected: boolean;
  error: Error | null;
} => {
  const mattermostContext = useContext(MattermostContext);
  if (!mattermostContext) {
    throw new Error("useMattermost must be used within a MattermostProvider");
  }

  // Get connection context to re-export key properties
  const connectionContext = useConnection();

  // Combine contexts for backwards compatibility
  return {
    ...mattermostContext,
    mode: connectionContext.mode,
    isConnected: connectionContext.isConnected,
    error: connectionContext.error,
  };
};

/**
 * Props for the MattermostProvider component
 */
export interface MattermostProviderProps extends ProviderConfig {
  /** Child components */
  children: ReactNode;
}

/**
 * Main provider component for Mattermost integration
 * Serves as a composition of specialized context providers
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

  // Children
  children,
}) => {
  // Determine the connection mode based on provided props
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

  // Create service container based on configuration
  const services = useMemo<ServiceContainer | null>(() => {
    if (!mode) return null;

    try {
      return createServiceContainer({
        serverUrl,
        token,
        proxyUrl,
        clientId,
        userId,
        serviceProvider,
        enableWebsocket,
        refreshInterval,
      });
    } catch (error) {
      console.error("Error creating service container:", error);
      return null;
    }
  }, [
    mode,
    serverUrl,
    token,
    proxyUrl,
    clientId,
    userId,
    serviceProvider,
    enableWebsocket,
    refreshInterval,
  ]);

  // Handler for WebSocket messages
  const handleWebSocketMessage = useMemo(() => {
    return services?.notificationService
      ? (message: any) =>
          services.notificationService.processWebSocketEvent(message)
      : undefined;
  }, [services]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<MattermostContextType>(
    () => ({
      services,
    }),
    [services],
  );

  // If no valid configuration is provided, render error state
  if (!mode) {
    return (
      <MattermostContext.Provider value={contextValue}>
        <div className="mattermost-connect-error">
          <p>Invalid MattermostConnect configuration. You must provide:</p>
          <ul>
            <li>(serverUrl and token) OR</li>
            <li>(proxyUrl and clientId) OR</li>
            <li>serviceProvider</li>
          </ul>
        </div>
      </MattermostContext.Provider>
    );
  }

  // Compose the context providers in the correct order of dependencies
  return (
    <MattermostContext.Provider value={contextValue}>
      <ConnectionProvider
        serverUrl={serverUrl}
        token={token}
        proxyUrl={proxyUrl}
        clientId={clientId}
        userId={userId}
        enableWebsocket={enableWebsocket}
        notificationHandler={handleWebSocketMessage}
        mode={mode}
      >
        <UserProvider services={services} refreshInterval={refreshInterval}>
          <TeamProvider services={services} refreshInterval={refreshInterval}>
            <ChannelProvider
              services={services}
              refreshInterval={refreshInterval}
            >
              <MessageProvider services={services}>{children}</MessageProvider>
            </ChannelProvider>
          </TeamProvider>
        </UserProvider>
      </ConnectionProvider>
    </MattermostContext.Provider>
  );
};

export default MattermostProvider;
