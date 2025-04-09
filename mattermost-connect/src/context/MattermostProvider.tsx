// src/context/MattermostProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { createMattermostService } from "../services";
import type {
  User,
  ProviderConfig,
  MattermostService,
  WebSocketConnection,
} from "../types";
import { setupWebsocket } from "../services/websocket.service";

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
  service: MattermostService | null;

  /** Instance de connexion WebSocket */
  websocket: WebSocketConnection | null;
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

  // Déterminer le mode en fonction des props fournies
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

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

    // Modifications à apporter dans la méthode initService

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
            const user = await serviceInstance.getCurrentUser();
            setCurrentUser(user);
            setIsConnected(true);
            setError(null);
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
        }

        // Reste du code d'initialisation WebSocket...
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

    initService();

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
