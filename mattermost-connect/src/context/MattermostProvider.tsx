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

/**
 * Type du contexte Mattermost qui fournit l'accès à
 * toutes les fonctionnalités et états Mattermost
 */
export interface MattermostContextType {
  /** Mode de connexion actuel (direct, proxy, custom) */
  mode: "direct" | "proxy" | "custom" | null;

  /** Si connecté à Mattermost */
  isConnected: boolean;

  /** Erreur si la connexion a échoué */
  error: Error | null;

  /** Informations sur l'utilisateur actuel */
  currentUser: User | null;

  /** L'instance du service */
  service: MattermostService;

  /** Instance de connexion WebSocket */
  websocket: WebSocketConnection | null;

  /** Message en cours de réponse (null si aucun) */
  replyTo: Message | null;

  /** Fonction pour définir le message en cours de réponse */
  setReplyTo: (message: Message | null) => void;

  /** Fonction pour effacer la réponse en cours */
  clearReply: () => void;

  /** Si l'utilisateur est en train de répondre à un message */
  isReplying: boolean;
}

// Créer le contexte
const MattermostContext = createContext<MattermostContextType | null>(null);

/**
 * Hook pour utiliser le contexte Mattermost
 * @returns Le contexte Mattermost
 * @throws Error si utilisé en dehors de MattermostProvider
 */
export const useMattermost = (): MattermostContextType => {
  const context = useContext(MattermostContext);
  if (!context) {
    throw new Error("useMattermost must be used within a MattermostProvider");
  }
  return context;
};

/**
 * Props pour le composant MattermostProvider
 */
interface MattermostProviderProps extends ProviderConfig {
  /** Composants enfants */
  children: ReactNode;
}

/**
 * Composant Provider pour configurer l'accès à Mattermost
 * Prend en charge trois modes : Direct, Proxy et Custom
 */
export const MattermostProvider: React.FC<MattermostProviderProps> = ({
  // Configuration du mode Direct
  serverUrl,
  token,

  // Configuration du mode Proxy
  proxyUrl,
  clientId,
  userId,

  // Fournisseur de service personnalisé pour les tests/démos
  serviceProvider,

  // Options communes
  enableWebsocket = true,
  refreshInterval = 30000,

  // Composants enfants
  children,
}) => {
  // État du Provider
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [websocket, setWebsocket] = useState<WebSocketConnection | null>(null);
  const [service, setService] = useState<MattermostService | null>(null);

  // État pour la fonctionnalité de réponse
  const [replyTo, setReplyToState] = useState<Message | null>(null);

  // Déterminer le mode en fonction des props fournies
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

  // Fonction pour définir le message en cours de réponse
  const setReplyTo = useCallback((message: Message | null) => {
    setReplyToState(message);
  }, []);

  // Fonction pour effacer la réponse en cours
  const clearReply = useCallback(() => {
    setReplyToState(null);
  }, []);

  // Si l'utilisateur est en train de répondre
  const isReplying = replyTo !== null;

  // Initialiser le service approprié en fonction du mode
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
        // Créer l'instance de service avec notre factory centralisée
        const serviceInstance = createMattermostService({
          serverUrl,
          token,
          proxyUrl,
          clientId,
          userId,
          serviceProvider,
        });

        setService(serviceInstance);

        // Tester la connexion (sauf pour les services personnalisés qui spécifient de sauter le test)
        if (mode !== "custom" || !serviceProvider?.skipConnectionTest) {
          try {
            // Récupérer l'utilisateur courant - exploite maintenant le cache
            const user = await serviceInstance.getCurrentUser();
            setCurrentUser(user);
            setIsConnected(true);
            setError(null);

            // Si le WebSocket est activé, l'initialiser
            if (enableWebsocket) {
              try {
                // Obtenir l'URL WebSocket et le token
                const wsUrl = serviceInstance.getWebsocketUrl();
                const wsToken = await serviceInstance.getWebsocketToken();

                // Configurer la connexion WebSocket
                const ws = await setupWebsocket({
                  mode: mode as "direct" | "proxy" | "custom",
                  serverUrl: wsUrl,
                  token: wsToken,
                  onMessage: (msg) => {
                    console.log("WebSocket message:", msg);
                    // Traiter les messages WebSocket selon les besoins
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
                // Considérer cela comme un avertissement, pas une erreur fatale
              }
            }
          } catch (connErr) {
            console.error("Erreur de connexion :", connErr);
            const errorMessage =
              connErr instanceof Error
                ? connErr.message
                : "Impossible de se connecter au serveur Mattermost";

            setError(new Error(errorMessage));
            setIsConnected(false);
            setCurrentUser(null);
          }
        } else if (mode === "custom" && serviceProvider?.currentUser) {
          // Pour les services personnalisés qui fournissent un utilisateur actuel
          setCurrentUser(serviceProvider.currentUser);
          setIsConnected(true);

          // Si le service personnalisé fournit un cache d'utilisateur
          if ((serviceInstance as any)._currentUser) {
            setCurrentUser((serviceInstance as any)._currentUser);
          }
        }

        // Configurer un intervalle pour rafraîchir l'utilisateur courant si nécessaire
        // Cela est utile pour maintenir à jour le statut, les permissions, etc.
        if (refreshInterval > 0 && serviceInstance) {
          const intervalId = setInterval(async () => {
            try {
              // Si le service implémente refreshCurrentUser, l'utiliser
              if (
                (serviceInstance instanceof DirectService ||
                  serviceInstance instanceof ProxyService) &&
                isConnected
              ) {
                const freshUser = await serviceInstance.refreshCurrentUser();
                setCurrentUser(freshUser);
              }
            } catch (refreshError) {
              console.warn(
                "Erreur lors du rafraîchissement de l'utilisateur:",
                refreshError,
              );
            }
          }, refreshInterval);

          // Nettoyer l'intervalle lors du démontage
          return () => clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Erreur d'initialisation du service :", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Impossible d'initialiser le service Mattermost";

        setError(new Error(errorMessage));
        setIsConnected(false);
        setCurrentUser(null);
      }
    };

    void initService();

    // Nettoyage lors du démontage
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

  if (!service) return null;

  // Valeur du contexte à partager avec les composants enfants
  const contextValue: MattermostContextType = {
    // État
    mode,
    isConnected,
    error,
    currentUser,
    service,
    websocket,

    // Fonctionnalités de réponse
    replyTo,
    setReplyTo,
    clearReply,
    isReplying,
  };

  return (
    <MattermostContext.Provider value={contextValue}>
      {children}
    </MattermostContext.Provider>
  );
};

// Exporter le contexte pour permettre l'utilisation directe si nécessaire
export { MattermostContext };

export default MattermostProvider;
