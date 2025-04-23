// src/context/MattermostProvider.tsx
import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { createServiceContainer, ServiceContainer } from "../services";
import { ProviderConfig } from "../types";

// Import specialized context providers
import { AuthProvider } from "./AuthContext";
import { ConnectionProvider } from "./ConnectionContext";
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
  mode: "direct" | "proxy" | "custom" | undefined;
  hasCompleteConfig?: boolean;
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
export interface MattermostProviderProps extends ProviderConfig {
  /** Child components */
  children: ReactNode;
  /** Initial token for authentication */
  initialToken?: string;
  /** Store token in localStorage */
  useLocalStorage?: boolean;
  /** Authentication success callback */
  onAuthSuccess?: (user: any) => void;
  /** Authentication error callback */
  onAuthError?: (error: Error) => void;
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

  // Auth options
  initialToken,
  useLocalStorage = false,
  onAuthSuccess,
  onAuthError,

  // Children
  children,
}) => {
  console.debug("MattermostProvider");

  const mode = useMemo<"direct" | "proxy" | "custom" | undefined>(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";

    // Nouveau: même si le mode ne peut pas être déterminé maintenant,
    // on continue à créer les services avec une configuration partielle
    if (serverUrl) return "direct"; // Mode direct en attente d'un token
    if (proxyUrl) return "proxy"; // Mode proxy en attente de credentials

    return;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

  // Create service container based on configuration
  const services = useMemo<ServiceContainer | null>(() => {
    // Même avec une configuration partielle, créer un service minimal
    try {
      return createServiceContainer({
        serverUrl,
        token: token || initialToken,
        proxyUrl,
        clientId,
        userId,
        serviceProvider,
        enableWebsocket: mode !== null && enableWebsocket,
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
    initialToken,
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
      mode,
      hasCompleteConfig: mode !== null,
    }),
    [services, mode],
  );

  // Compose the context providers in the correct order of dependencies
  return (
    <MattermostContext.Provider value={contextValue}>
      <AuthProvider
        services={services}
        initialToken={token || initialToken}
        useLocalStorage={useLocalStorage}
        onAuthSuccess={onAuthSuccess}
        onAuthError={onAuthError}
      >
        <ConnectionProvider mode={mode} enableWebsocket={enableWebsocket}>
          <UserProvider services={services} refreshInterval={refreshInterval}>
            <TeamProvider services={services} refreshInterval={refreshInterval}>
              <ChannelProvider
                services={services}
                refreshInterval={refreshInterval}
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
