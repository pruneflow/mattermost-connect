// src/context/MattermostProvider.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { createDirectService } from "../services/directService";
import { createProxyService } from "../services/proxyService";
import { setupWebsocket } from "../services/websocket";

// Création du contexte
export const MattermostContext = createContext(null);

/**
 * Hook pour utiliser le contexte Mattermost
 * @returns {Object} Contexte Mattermost
 */
export const useMattermost = () => {
  const context = useContext(MattermostContext);
  if (!context) {
    throw new Error(
      "useMattermost doit être utilisé à l'intérieur d'un MattermostProvider",
    );
  }
  return context;
};

/**
 * Provider pour configurer l'accès à Mattermost
 * Supporte trois modes: Direct, Proxy et Custom (pour tests/démos)
 */
export const MattermostProvider = ({
  // Mode Direct config
  serverUrl,
  token,

  // Mode Proxy config
  proxyUrl,
  clientId,
  userId,

  // Service Provider personnalisé pour les tests/démos
  serviceProvider,

  // Options communes
  enableWebsocket = true,
  refreshInterval = 30000,

  children,
}) => {
  // État du provider
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [service, setService] = useState(null);

  // Déterminer le mode en fonction des props fournies
  const mode = useMemo(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

  // Initialisation du service approprié selon le mode
  useEffect(() => {
    if (!mode) {
      setError(
        new Error(
          "Configuration invalide. Vous devez fournir (serverUrl et token) OU (proxyUrl et clientId) OU serviceProvider.",
        ),
      );
      return;
    }

    const initService = async () => {
      try {
        let serviceInstance;

        if (mode === "custom" && serviceProvider) {
          // Utiliser le service provider personnalisé
          serviceInstance = serviceProvider.setupService();
          setIsConnected(serviceProvider.isConnected !== false);
        } else if (mode === "direct") {
          // Mode direct avec token utilisateur
          serviceInstance = createDirectService({ serverUrl, token });
        } else {
          // Mode proxy via notre service
          serviceInstance = createProxyService({ proxyUrl, clientId, userId });
        }

        setService(serviceInstance);

        // Tester la connexion (sauf pour les services personnalisés qui spécifient de sauter ce test)
        if (mode !== "custom" || !serviceProvider?.skipConnectionTest) {
          try {
            const user = await serviceInstance.getCurrentUser();
            setCurrentUser(user);
            setIsConnected(true);
            setError(null);
          } catch (connErr) {
            console.error("Erreur lors de la connexion:", connErr);
            setError(connErr);
            setIsConnected(false);
          }
        } else if (mode === "custom" && serviceProvider?.currentUser) {
          // Pour les services personnalisés qui spécifient un utilisateur courant
          setCurrentUser(serviceProvider.currentUser);
        }

        // Initialiser WebSocket si activé et si ce n'est pas un service personnalisé
        // ou si le service personnalisé ne désactive pas explicitement les websockets
        if (
          enableWebsocket &&
          (mode !== "custom" || serviceProvider?.enableWebsocket !== false)
        ) {
          try {
            const wsUrl = mode === "direct" ? serverUrl : proxyUrl;
            const wsToken =
              mode === "direct"
                ? token
                : await serviceInstance.getWebsocketToken();

            const ws = await setupWebsocket({
              mode,
              serverUrl: wsUrl,
              token: wsToken,
              onMessage: (msg) => {
                // Traitement des messages WebSocket
                console.debug("WebSocket message:", msg);

                // Traiter les différents types d'événements
                if (msg.event === "posted") {
                  // Un nouveau message a été posté
                  // Implémenter la logique pour mettre à jour l'interface
                } else if (msg.event === "status_change") {
                  // Le statut d'un utilisateur a changé
                } else if (msg.event === "typing") {
                  // Un utilisateur est en train d'écrire
                }
              },
              onError: (err) => {
                console.error("WebSocket error:", err);
                // Ne pas définir d'erreur ici pour ne pas bloquer l'UI
              },
              onClose: () => {
                console.debug("WebSocket closed");
                setWebsocket(null);
              },
            });

            setWebsocket(ws);
          } catch (wsError) {
            console.warn(
              "Impossible d'établir la connexion WebSocket:",
              wsError,
            );
            // Continuer sans WebSocket
          }
        }
      } catch (err) {
        console.error(
          "Erreur lors de l'initialisation du service Mattermost:",
          err,
        );
        setError(err);
        setIsConnected(false);
      }
    };

    initService();

    // Nettoyage lors du démontage du composant
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

  // Contexte à partager avec les composants enfants
  const contextValue = {
    // État
    mode,
    isConnected,
    error,
    currentUser,

    // Service API
    service,

    // Raccourcis de méthodes communes
    getChannel: async (channelId) => {
      if (!service) throw new Error("Service non initialisé");
      return service.getChannel(channelId);
    },
    getChannelMessages: async (channelId, options = {}) => {
      if (!service) throw new Error("Service non initialisé");
      return service.getChannelMessages(channelId, options);
    },
    postMessage: async (channelId, message) => {
      if (!service) throw new Error("Service non initialisé");
      return service.postMessage(channelId, message);
    },
    getChannels: async (teamId) => {
      if (!service) throw new Error("Service non initialisé");
      return service.getChannels(teamId);
    },
    getTeams: async () => {
      if (!service) throw new Error("Service non initialisé");
      return service.getTeams();
    },
    getUsers: async (options = {}) => {
      if (!service) throw new Error("Service non initialisé");
      return service.getUsers(options);
    },
    getUserStatus: async (userId) => {
      if (!service) throw new Error("Service non initialisé");
      return service.getUserStatus(userId);
    },
  };

  return (
    <MattermostContext.Provider value={contextValue}>
      {children}
    </MattermostContext.Provider>
  );
};

export default MattermostProvider;
