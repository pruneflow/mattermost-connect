// src/providers/MattermostProvider.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react";
import { ApiClient, createApiClient } from "../core/api/client";
import { AuthService } from "../core/services/auth.service";
import { CacheService } from "../core/services/cache.service";
import { WebSocketService } from "../core/services/ws.service";
import { AppStore, configureStore } from "../core/store/store.config";
import { initializeAuth } from "../core/store/thunks/auth.thunks";

// Context pour exposer les services et le store
interface MattermostContextValue {
  apiClient: ApiClient;
  authService: AuthService;
  cacheService: CacheService;
  webSocketService: WebSocketService;
  store: AppStore;
  isInitialized: boolean;
}

const MattermostContext = createContext<MattermostContextValue | null>(null);

// Hook pour accéder au contexte
export function useMattermostContext() {
  const context = useContext(MattermostContext);
  if (!context) {
    throw new Error(
      "useMattermostContext must be used within a MattermostProvider",
    );
  }
  return context;
}

// Propriétés de configuration pour le provider
export interface MattermostProviderProps {
  children: React.ReactNode;

  // Mode direct
  serverUrl?: string;
  token?: string;

  // Mode proxy
  proxyUrl?: string;
  clientId?: string;
  userId?: string;

  // Options communes
  enableWebSocket?: boolean;
  useLocalStorage?: boolean;
  storageKey?: string;
  serverStorageKey?: string;
}

// Composant Provider principal
export function MattermostProvider({
  children,
  serverUrl,
  token,
  proxyUrl,
  clientId,
  userId,
  enableWebSocket = true,
  useLocalStorage = true,
  storageKey = "mattermost_token",
  serverStorageKey = "mattermost_server",
}: MattermostProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Déterminer le mode basé sur les props
  const mode = useMemo<"direct" | "proxy" | "custom">(() => {
    if (serverUrl) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return "direct"; // Mode par défaut
  }, [serverUrl, proxyUrl, clientId]);

  // Créer les services
  const services = useMemo(() => {
    // Créer le client API
    const apiClient = createApiClient({
      mode,
      serverUrl,
      token,
      proxyUrl,
      clientId,
      userId,
    });

    // Créer le service de cache
    const cacheService = new CacheService({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 200,
    });

    // Créer le store
    const store = configureStore(apiClient, null as any); // Temporairement null pour le service WebSocket

    // Créer le service d'authentification
    const authService = new AuthService(apiClient, store, {
      useLocalStorage,
      storageKey,
      serverStorageKey,
    });

    // Créer le service WebSocket
    const webSocketService = new WebSocketService(store);

    // Mettre à jour le store avec le service WebSocket
    store.replaceReducer((s, a) => s); // Force un re-render

    return {
      apiClient,
      authService,
      cacheService,
      webSocketService,
      store,
    };
  }, [
    mode,
    serverUrl,
    token,
    proxyUrl,
    clientId,
    userId,
    useLocalStorage,
    storageKey,
    serverStorageKey,
  ]);

  // Initialiser l'authentification au montage
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialiser l'authentification si un token est stocké
        if (useLocalStorage) {
          await services.store.dispatch(initializeAuth(services.authService));
        } else if (token) {
          // Si un token est fourni directement, l'utiliser
          services.apiClient.setToken(token);
        }
      } catch (error) {
        console.error("Error initializing authentication:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, [services, useLocalStorage, token]);

  // Initialiser WebSocket si activé
  useEffect(() => {
    if (!enableWebSocket || !isInitialized) return;

    const initWebSocket = async () => {
      const authState = services.store.getState().auth;

      if (authState.isAuthenticated && authState.token) {
        // Déterminer l'URL WebSocket
        let wsUrl = "";
        if (mode === "direct") {
          wsUrl = `${serverUrl?.replace(/^http/, "ws")}/api/v4/websocket`;
        } else if (mode === "proxy") {
          wsUrl = `${proxyUrl?.replace(/^http/, "ws")}/websocket`;
        }

        if (wsUrl) {
          try {
            await services.webSocketService.connect(wsUrl, authState.token);
          } catch (error) {
            console.error("WebSocket connection error:", error);
          }
        }
      }
    };

    initWebSocket();

    // Nettoyer la connexion WebSocket au démontage
    return () => {
      services.webSocketService.disconnect();
    };
  }, [services, enableWebSocket, isInitialized, mode, serverUrl, proxyUrl]);

  // Valeur du contexte
  const contextValue = useMemo(
    () => ({
      ...services,
      isInitialized,
    }),
    [services, isInitialized],
  );

  // Créer un StoreProvider pour le store Redux
  const StoreProvider = useMemo(() => {
    return function StoreProvider({ children }: { children: React.ReactNode }) {
      // État local qui sera mis à jour quand le store change
      const [, forceUpdate] = useState(0);

      useEffect(() => {
        // S'abonner aux changements du store
        return services.store.subscribe(() => {
          forceUpdate((prev) => prev + 1);
        });
      }, []);

      return children;
    };
  }, [services.store]);

  return (
    <MattermostContext.Provider value={contextValue}>
      <StoreProvider>{children}</StoreProvider>
    </MattermostContext.Provider>
  );
}
