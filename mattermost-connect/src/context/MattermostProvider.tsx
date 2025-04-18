// src/context/MattermostContext.tsx
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
import { createServiceContainer, ServiceContainer } from "../services";

import {
  Channel,
  Message,
  ProviderConfig,
  Team,
  User,
  WebSocketConnection,
} from "../types";
import { Notification } from "../services";
import { releaseWebsocket, setupWebsocket } from "../services";
import { formatUserDisplayName } from "../utils";

/**
 * Type du contexte Mattermost qui fournit un accès
 * à toutes les fonctionnalités et états Mattermost
 */
export interface MattermostContextType {
  /** Mode de connexion actuel (direct, proxy, custom) */
  mode: "direct" | "proxy" | "custom" | null;

  /** Indique si connecté à Mattermost */
  isConnected: boolean;

  /** Erreur si la connexion a échoué */
  error: Error | null;

  /** Informations sur l'utilisateur courant */
  currentUser: User | null;

  /** Instance de service Mattermost */
  services: ServiceContainer | null;

  /** Instance de connexion WebSocket */
  websocket: WebSocketConnection | null;

  /** Message auquel on répond (null si aucun) */
  replyTo: Message | null;

  /** Fonction pour définir le message auquel on répond */
  setReplyTo: (message: Message | null) => void;

  /** Fonction pour effacer la réponse courante */
  clearReply: () => void;

  /** Indique si l'utilisateur répond à un message */
  isReplying: boolean;

  /** Navigue vers un canal et optionnellement vers un message spécifique */
  navigateToMessage: (notification: Notification) => void;

  /** Canal actif/sélectionné */
  activeChannel: Channel | null;

  /** Définit le canal actif */
  setActiveChannel: (channel: Channel | null) => void;

  /** Statut de frappe par canal */
  typingUsers: Record<string, string[]>;

  /** Équipe actuellement sélectionnée */
  activeTeam: Team | null;

  /** Définit l'équipe active */
  setActiveTeam: (team: Team | null) => void;

  /** Tous les utilisateurs connus (de toutes les équipes et messages directs) */
  knownUsers: Record<string, User>;

  /** Récupère un utilisateur par son ID - charge depuis l'API si non présent en cache */
  getUser: (userId: string) => Promise<User | null>;

  /** Récupère un nom d'affichage formaté pour un utilisateur par son ID */
  getUserDisplayName: (userId: string) => string;

  /** Vérifie si un utilisateur est en train de taper dans un canal spécifique */
  isUserTyping: (channelId: string, userId: string) => boolean;

  /** Récupère les utilisateurs en train de taper pour un canal spécifique */
  getTypingUsersForChannel: (channelId: string) => string[];

  /** Récupère le texte formaté de l'indicateur de frappe pour un canal */
  getTypingIndicatorText: (channelId: string) => string;

  /** Récupère l'état des messages non lus pour un canal spécifique */
  getChannelUnreadState: (channelId: string) => {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };

  /** Initialise les états non lus pour tous les canaux d'une équipe */
  initializeTeamUnreadStates: (
    teamId: string,
    channels: Channel[],
  ) => Promise<void>;

  /**
   * Marque un canal comme lu, à la fois sur le serveur et localement
   * @param channelId ID du canal à marquer comme lu
   */
  markChannelAsRead: (channelId: string) => Promise<void>;

  /** ID du message à mettre en évidence */
  highlightMessageId?: string;

  /** Définit l'ID du message à mettre en évidence */
  setHighlightMessageId: (messageId: string | undefined) => void;

  /** Vérifie si un ID utilisateur correspond à l'utilisateur courant */
  isCurrentUser: (userId: string) => boolean;
}

// Création du contexte
const MattermostContext = createContext<MattermostContextType | null>(null);

/**
 * Hook pour utiliser le contexte Mattermost
 * @returns Le contexte Mattermost
 * @throws Erreur si utilisé en dehors de MattermostProvider
 */
export const useMattermost = (): MattermostContextType => {
  const context = useContext(MattermostContext);
  if (!context) {
    throw new Error(
      "useMattermost doit être utilisé au sein d'un MattermostProvider",
    );
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
  // Configuration du mode direct
  serverUrl,
  token,

  // Configuration du mode proxy
  proxyUrl,
  clientId,
  userId,

  // Fournisseur de service personnalisé pour les tests/démos
  serviceProvider,

  // Options communes
  enableWebsocket = true,
  refreshInterval = 300000, // 5 minutes

  // Composants enfants
  children,
}) => {
  // État du Provider
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [websocket, setWebsocket] = useState<WebSocketConnection | null>(null);
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [knownUsers, setKnownUsers] = useState<Record<string, User>>({});
  const [highlightMessageId, setHighlightMessageId] = useState<
    string | undefined
  >(undefined);

  // Références pour éviter les re-renders inutiles
  const serviceInitializedRef = useRef<boolean>(false);
  const socketInitializedRef = useRef<boolean>(false);
  const currentServicesRef = useRef<ServiceContainer | null>(null);
  const currentSocketRef = useRef<WebSocketConnection | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const lastUserRefreshRef = useRef<number>(0);

  // État pour la fonctionnalité de réponse
  const [replyTo, setReplyToState] = useState<Message | null>(null);

  // Déterminer le mode basé sur les props fournies
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (serviceProvider) return "custom";
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [serviceProvider, serverUrl, token, proxyUrl, clientId]);

  // Fonction pour définir le message auquel on répond
  const setReplyTo = useCallback((message: Message | null) => {
    setReplyToState(message);
  }, []);

  // Fonction pour effacer la réponse courante
  const clearReply = useCallback(() => {
    setReplyToState(null);
  }, []);

  // Indique si l'utilisateur répond
  const isReplying = replyTo !== null;

  /**
   * Obtenir un utilisateur par son ID - utilise le UserService
   */
  const getUser = useCallback(
    async (userId: string): Promise<User | null> => {
      if (!userId || !services || !services.userService) return null;
      return services.userService.getUser(userId);
    },
    [services],
  );

  /**
   * Obtenir le nom formaté d'un utilisateur par son ID - utilise le UserService
   */
  const getUserDisplayName = useCallback(
    (userId: string): string => {
      if (!userId || !services || !services.userService)
        return "Utilisateur inconnu";
      if (knownUsers[userId]) {
        const user = knownUsers[userId];
        return formatUserDisplayName(user);
      }
      if (services.userService) {
        const displayName = services.userService.getUserDisplayName(userId);
        // Si le résultat est différent de "Chargement...", le retourner
        if (displayName !== "Chargement...") {
          return displayName;
        }

        // Déclencher le chargement de l'utilisateur en arrière-plan (si pas déjà fait)
        void services.userService.getUser(userId);
      }

      // Valeur par défaut
      return "Chargement...";
    },
    [services, knownUsers],
  );

  /**
   * Vérifier si un utilisateur est en train de taper dans un canal spécifique
   */
  const isUserTyping = useCallback(
    (channelId: string, userId: string): boolean => {
      if (!channelId || !userId || !typingUsers[channelId]) return false;
      return typingUsers[channelId].includes(userId);
    },
    [typingUsers],
  );

  /**
   * Obtenir la liste des utilisateurs qui tapent dans un canal spécifique
   */
  const getTypingUsersForChannel = useCallback(
    (channelId: string): string[] => {
      if (!channelId || !typingUsers[channelId]) return [];
      return [...typingUsers[channelId]];
    },
    [typingUsers],
  );

  /**
   * Obtenir le texte formaté pour l'indicateur de frappe
   */
  const getTypingIndicatorText = useCallback(
    (channelId: string): string => {
      const typingUserIds = getTypingUsersForChannel(channelId);
      if (typingUserIds.length === 0) return "";

      // Formater les noms des utilisateurs
      const typingUserNames = typingUserIds
        .map((userId) => getUserDisplayName(userId))
        .filter(Boolean);

      if (typingUserNames.length === 0) return "";

      if (typingUserNames.length === 1) {
        return `${typingUserNames[0]} est en train d'écrire...`;
      }

      if (typingUserNames.length === 2) {
        return `${typingUserNames[0]} et ${typingUserNames[1]} sont en train d'écrire...`;
      }

      // Plus de 2 utilisateurs
      const remaining = typingUserNames.length - 2;
      return `${typingUserNames[0]}, ${typingUserNames[1]} et ${remaining} autre${
        remaining > 1 ? "s" : ""
      } sont en train d'écrire...`;
    },
    [getTypingUsersForChannel, getUserDisplayName],
  );

  // Initialisation du service et du websocket
  useEffect(() => {
    if (!mode) {
      setError(
        new Error(
          "Configuration invalide. Vous devez fournir (serverUrl et token) OU (proxyUrl et clientId) OU serviceProvider.",
        ),
      );
      return;
    }

    // Référence pour suivre si le composant est toujours monté
    let isMounted = true;

    const initService = async () => {
      try {
        console.debug("Initialisation du service Mattermost...");

        // Si un service existe déjà et que les paramètres ont changé, on nettoie l'ancien service
        if (currentServicesRef.current) {
          console.debug("Nettoyage du service existant avant initialisation");
          // Fermer la connexion WebSocket si elle existe
          if (currentSocketRef.current) {
            console.debug("Fermeture de la connexion WebSocket existante");
            currentSocketRef.current.close();
            currentSocketRef.current = null;
            socketInitializedRef.current = false;
            if (isMounted) {
              setWebsocket(null);
            }
          }
        }

        // Créer l'instance du service seulement si elle n'existe pas déjà
        // ou si les paramètres de configuration ont changé
        if (!serviceInitializedRef.current || !currentServicesRef.current) {
          console.debug("Création d'une nouvelle instance de service");

          // Créer le conteneur de services avec notre factory centralisée
          const serviceContainer = createServiceContainer({
            serverUrl,
            token,
            proxyUrl,
            clientId,
            userId,
            serviceProvider,
          });

          // Stocker la référence au service
          currentServicesRef.current = serviceContainer;
          serviceInitializedRef.current = true;

          if (isMounted) {
            setServices(serviceContainer);
          }
        } else {
          console.debug("Utilisation de l'instance de service existante");
        }

        // Tester la connexion (sauf pour les services personnalisés qui spécifient de sauter le test)
        if (mode !== "custom" || !serviceProvider?.skipConnectionTest) {
          try {
            // Récupérer l'utilisateur courant - utilise maintenant le cache
            const mattermostService =
              currentServicesRef.current.mattermostService;
            const user = await mattermostService.getCurrentUser();

            // Mettre à jour l'état utilisateur uniquement s'il a changé pour éviter les re-renders
            if (
              !currentUserRef.current ||
              JSON.stringify(currentUserRef.current) !== JSON.stringify(user)
            ) {
              currentUserRef.current = user;
              if (isMounted) {
                setCurrentUser(user);
              }
            }

            if (isMounted) {
              setIsConnected(true);
              setError(null);
            }

            // Enregistrer le moment du dernier rafraîchissement
            lastUserRefreshRef.current = Date.now();

            // Initialiser les services avec l'ID utilisateur
            if (currentServicesRef.current.notificationService) {
              currentServicesRef.current.notificationService.setCurrentUserId(
                user.id,
              );
            }

            if (currentServicesRef.current.userService) {
              currentServicesRef.current.userService.setCurrentUserId(user.id);
              currentServicesRef.current.userService.addUser(user);
            }

            // Mettre à jour la liste des utilisateurs connus
            if (isMounted && user) {
              setKnownUsers((prev) => ({
                ...prev,
                [user.id]: user,
              }));
            }

            // Si WebSocket est activé, l'initialiser uniquement s'il n'existe pas
            if (enableWebsocket && !socketInitializedRef.current) {
              await initializeWebSocket(
                mattermostService,
                mode,
                currentServicesRef.current.notificationService,
              );
            }
          } catch (connErr) {
            console.error("Erreur de connexion:", connErr);
            const errorMessage =
              connErr instanceof Error
                ? connErr.message
                : "Impossible de se connecter au serveur Mattermost";

            if (isMounted) {
              setError(new Error(errorMessage));
              setIsConnected(false);
              setCurrentUser(null);
            }
          }
        } else if (mode === "custom" && serviceProvider?.currentUser) {
          // Pour les services personnalisés qui fournissent un utilisateur courant
          currentUserRef.current = serviceProvider.currentUser;
          if (isMounted) {
            setCurrentUser(serviceProvider.currentUser);
            setIsConnected(true);
          }

          // Initialiser les services avec l'ID utilisateur
          if (serviceProvider.currentUser.id) {
            if (currentServicesRef.current.notificationService) {
              currentServicesRef.current.notificationService.setCurrentUserId(
                serviceProvider.currentUser.id,
              );
            }

            if (currentServicesRef.current.userService) {
              currentServicesRef.current.userService.setCurrentUserId(
                serviceProvider.currentUser.id,
              );
              currentServicesRef.current.userService.addUser(
                serviceProvider.currentUser,
              );
            }

            // Mettre à jour la liste des utilisateurs connus
            if (serviceProvider.currentUser && isMounted) {
              setKnownUsers((prev) => ({
                ...prev,
                [serviceProvider.currentUser!.id]:
                  serviceProvider.currentUser as User,
              }));
            }
          }

          // Si le service personnalisé fournit un cache utilisateur
          if (
            (currentServicesRef.current.mattermostService as any)
              ._currentUser &&
            isMounted
          ) {
            const customUser = (
              currentServicesRef.current.mattermostService as any
            )._currentUser;

            // Mettre à jour uniquement si différent
            if (
              JSON.stringify(currentUserRef.current) !==
              JSON.stringify(customUser)
            ) {
              currentUserRef.current = customUser;
              setCurrentUser(customUser);
            }
          }
        }
      } catch (err) {
        console.error("Erreur d'initialisation du service:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Impossible d'initialiser le service Mattermost";

        if (isMounted) {
          setError(new Error(errorMessage));
          setIsConnected(false);
          setCurrentUser(null);
        }
      }
    };

    console.debug("initService");
    void initService();

    // Fonction pour initialiser WebSocket
    async function initializeWebSocket(
      service: any,
      mode: string,
      notificationSvc: any,
    ) {
      try {
        console.debug("Initialisation de la connexion WebSocket...");
        // Récupérer l'URL WebSocket et le token
        const wsUrl = service.getWebsocketUrl();
        const wsToken = await service.getWebsocketToken();

        // Configurer la connexion WebSocket
        const ws = await setupWebsocket({
          mode: mode as "direct" | "proxy" | "custom",
          serverUrl: wsUrl,
          token: wsToken,
          onMessage: (msg) => {
            // Vérifier si le message concerne une mise à jour utilisateur
            if (msg.event === "user_updated") {
              handleUserUpdatedEvent(msg);
            }

            // Traiter normalement le message
            if (notificationSvc) {
              notificationSvc.processWebSocketEvent(msg);
            }
          },
          onError: (err) => {
            console.error("Erreur WebSocket:", err);
          },
          onClose: (closeEvent) => {
            console.log("WebSocket fermé:", closeEvent);
            if (isMounted) {
              setWebsocket(null);
            }
            socketInitializedRef.current = false;
            currentSocketRef.current = null;
          },
        });

        currentSocketRef.current = ws;
        socketInitializedRef.current = true;
        if (isMounted) {
          setWebsocket(ws);
        }
        console.debug("Connexion WebSocket établie avec succès");
      } catch (wsError) {
        console.error("Échec de l'initialisation WebSocket:", wsError);
        // Considérer cela comme un avertissement, pas une erreur fatale
        socketInitializedRef.current = false;
        currentSocketRef.current = null;
      }
    }

    // Fonction pour gérer les mises à jour d'utilisateur via WebSocket
    const handleUserUpdatedEvent = (event: any) => {
      if (event.data && event.data.user && currentUserRef.current) {
        try {
          const updatedUser =
            typeof event.data.user === "string"
              ? JSON.parse(event.data.user)
              : event.data.user;
          // Vérifier si c'est l'utilisateur courant
          if (updatedUser.id === currentUserRef.current.id) {
            console.debug(
              "Utilisateur mis à jour via événement WebSocket:",
              updatedUser.id,
            );
            currentUserRef.current = updatedUser;
            setCurrentUser(updatedUser); // Ne pas sauter cette étape!

            // Mettre à jour l'utilisateur dans le service utilisateur
            if (currentServicesRef.current?.userService) {
              currentServicesRef.current.userService.addUser(updatedUser);
            }

            // Mettre à jour la liste des utilisateurs connus
            setKnownUsers((prev) => ({
              ...prev,
              [updatedUser.id]: updatedUser,
            }));

            // Mettre à jour le timestamp du dernier rafraîchissement
            lastUserRefreshRef.current = Date.now();
          } else if (currentServicesRef.current?.userService) {
            // Si c'est un autre utilisateur, juste le mettre à jour dans le service
            currentServicesRef.current.userService.addUser(updatedUser);

            // Et dans la liste des utilisateurs connus
            setKnownUsers((prev) => ({
              ...prev,
              [updatedUser.id]: updatedUser,
            }));
          }
        } catch (error) {
          console.error(
            "Erreur lors du traitement de l'événement utilisateur:",
            error,
          );
        }
      }
    };

    // Nettoyage lors du démontage
    return () => {
      isMounted = false;
      console.debug("Nettoyage MattermostProvider");

      if (currentSocketRef.current) {
        console.debug("Libération de la connexion WebSocket");

        // Récupérer les informations nécessaires pour libérer la connexion
        if (currentServicesRef.current?.mattermostService) {
          const service = currentServicesRef.current.mattermostService;
          const wsUrl = service.getWebsocketUrl();

          // Pour le token, nous utilisons celui en cache ou celui fourni dans les props
          const wsToken = token || "";

          // Libérer la connexion du singleton
          releaseWebsocket(wsUrl, wsToken);
        }

        // Réinitialiser les variables locales
        currentSocketRef.current = null;
        socketInitializedRef.current = false;
        setWebsocket(null);
      }
    };
  }, [
    mode,
    serverUrl,
    token,
    proxyUrl,
    clientId,
    userId,
    serviceProvider,
    enableWebsocket,
  ]);

  // Effet périodique de rafraîchissement utilisateur
  useEffect(() => {
    // Ne pas configurer l'intervalle si refreshInterval est désactivé
    if (
      refreshInterval <= 0 ||
      !currentServicesRef.current?.mattermostService ||
      !isConnected
    ) {
      return;
    }

    console.debug(
      `Configuration de l'intervalle de rafraîchissement (${refreshInterval}ms)`,
    );

    // Fonction pour rafraîchir l'utilisateur
    const refreshUser = async () => {
      // Vérifier si suffisamment de temps s'est écoulé depuis le dernier rafraîchissement
      const now = Date.now();
      if (now - lastUserRefreshRef.current < refreshInterval) {
        return;
      }

      try {
        const mattermostService = currentServicesRef.current?.mattermostService;
        // Si le service implémente refreshCurrentUser, l'utiliser
        if (
          mattermostService &&
          typeof (mattermostService as any).refreshCurrentUser === "function" &&
          isConnected
        ) {
          console.debug("Rafraîchissement de l'utilisateur courant...");
          const freshUser = await (
            mattermostService as any
          ).refreshCurrentUser();
          // Mettre à jour seulement si l'utilisateur a changé
          if (
            JSON.stringify(currentUserRef.current) !== JSON.stringify(freshUser)
          ) {
            console.debug("Utilisateur rafraîchi avec changements détectés");
            currentUserRef.current = freshUser;
            setCurrentUser(freshUser);

            // Mettre à jour l'utilisateur dans le service utilisateur
            if (currentServicesRef.current?.userService) {
              currentServicesRef.current.userService.addUser(freshUser);
            }

            // Mettre à jour la liste des utilisateurs connus
            setKnownUsers((prev) => ({
              ...prev,
              [freshUser.id]: freshUser,
            }));
          } else {
            console.debug("Utilisateur rafraîchi, aucun changement détecté");
          }

          // Mettre à jour le timestamp même si aucun changement
          lastUserRefreshRef.current = now;
        }
      } catch (refreshError) {
        console.warn(
          "Erreur lors du rafraîchissement de l'utilisateur:",
          refreshError,
        );
      }
    };

    // Exécuter le rafraîchissement immédiatement si nécessaire
    void refreshUser();

    // Configurer l'intervalle pour les rafraîchissements périodiques
    const intervalId = setInterval(refreshUser, refreshInterval);

    // Nettoyer l'intervalle lors du démontage
    return () => {
      clearInterval(intervalId);
      console.debug("Intervalle de rafraîchissement utilisateur supprimé");
    };
  }, [refreshInterval, isConnected]);

  // Synchroniser knownUsers avec userService
  useEffect(() => {
    if (!currentServicesRef.current?.userService) return;

    const updateKnownUsers = () => {
      const userService = currentServicesRef.current?.userService;
      if (!userService) return;

      // Cette fonction sera appelée moins fréquemment que les appels à getUser
      const allUsers = userService.getAllUsers();

      // Ne mettre à jour que si nécessaire (comparaison profonde)
      const hasChanges = Object.keys(allUsers).some(
        (userId) =>
          !knownUsers[userId] ||
          JSON.stringify(knownUsers[userId]) !==
            JSON.stringify(allUsers[userId]),
      );

      if (hasChanges) {
        setKnownUsers(allUsers);
      }
    };

    // Mettre à jour au démarrage
    updateKnownUsers();

    // Configurer un intervalle pour mettre à jour périodiquement
    const interval = setInterval(updateKnownUsers, 30000);

    return () => clearInterval(interval);
  }, [knownUsers]);

  // AJOUT IMPORTANT: Écouter les événements de frappe depuis le service de notification
  useEffect(() => {
    if (!services || !services.notificationService) return;

    // Fonction pour traiter les mises à jour de frappe
    const handleTypingUpdated = (data: any) => {
      if (!data.channelId) return;

      // Mettre à jour l'état des utilisateurs qui tapent
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

    // S'abonner à l'événement de mise à jour de frappe
    // Nettoyage lors du démontage
    return services.notificationService.addEventListener(
      "typing_updated",
      handleTypingUpdated,
    );
  }, [services]);

  // Fonction pour naviguer vers un message - Optimisée avec useCallback
  const navigateToMessage = useCallback(async (notification: Notification) => {
    if (
      !currentServicesRef.current?.mattermostService ||
      !notification.channelId
    )
      return;

    try {
      const mattermostService = currentServicesRef.current.mattermostService;
      const notificationService =
        currentServicesRef.current.notificationService;
      const userService = currentServicesRef.current.userService;

      // Récupérer les informations du canal
      const channel = await mattermostService.getChannel(
        notification.channelId,
      );

      const { team_id } = channel;

      const team = await mattermostService.getTeam(team_id);
      setActiveTeam(team);

      // Signaler que nous visualisons maintenant ce canal
      if (notificationService) {
        notificationService.setCurrentChannelId(notification.channelId);
      }

      // Si c'est un canal direct, charger les informations des utilisateurs impliqués
      if ((channel.type === "D" || channel.type === "G") && userService) {
        // Utiliser le service utilisateur pour charger les utilisateurs impliqués
        await userService.loadDirectMessageUsers([channel]);
      }

      if (notification.messageId) setHighlightMessageId(notification.messageId);

      setActiveChannel(channel);
    } catch (error) {
      console.error(
        `Erreur lors de la navigation vers le canal ${notification.channelId}:`,
        error,
      );
    }
  }, []);

  // Helper pour récupérer l'état non lu d'un canal
  const getChannelUnreadState = useCallback((channelId: string) => {
    const notificationService = currentServicesRef.current?.notificationService;
    return (
      notificationService?.getChannelUnreadState(channelId) || {
        msg_count: 0,
        mention_count: 0,
      }
    );
  }, []);

  // Méthode pour initialiser les états non lus d'une équipe
  const initializeTeamUnreadStates = useCallback(
    async (teamId: string, channels: Channel[]) => {
      if (
        !isConnected ||
        !currentServicesRef.current?.mattermostService ||
        !currentServicesRef.current?.notificationService ||
        !teamId ||
        !channels ||
        channels.length === 0
      )
        return;

      try {
        const mattermostService = currentServicesRef.current.mattermostService;
        const notificationService =
          currentServicesRef.current.notificationService;

        // Pour chaque canal, récupérer l'état non lu individuellement
        for (const channel of channels) {
          if (channel.id) {
            try {
              // Vérifier si la méthode est disponible
              if (
                typeof (mattermostService as any).getChannelUnreadCount ===
                "function"
              ) {
                const unreadState = await (
                  mattermostService as any
                ).getChannelUnreadCount(channel.id);

                // Mettre à jour l'état non lu dans le service de notification
                notificationService.setChannelUnreadState(channel.id, {
                  msg_count: unreadState.msg_count || 0,
                  mention_count: unreadState.mention_count || 0,
                  lastViewedAt: Date.now(),
                });
              }
            } catch (channelError) {
              // Continuer avec le canal suivant en cas d'erreur
              console.warn(
                `Impossible de récupérer l'état non lu pour le canal ${channel.id}:`,
                channelError,
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de l'initialisation des états non lus:",
          error,
        );
      }
    },
    [isConnected],
  );

  // Marquer un canal comme lu
  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      if (
        !isConnected ||
        !currentServicesRef.current?.mattermostService ||
        !channelId ||
        !currentServicesRef.current?.notificationService
      )
        return;

      try {
        const mattermostService = currentServicesRef.current.mattermostService;
        const notificationService =
          currentServicesRef.current.notificationService;

        // Appeler le serveur via la méthode viewChannel
        if (typeof (mattermostService as any).viewChannel === "function") {
          await (mattermostService as any).viewChannel(channelId);
        }

        // Réinitialiser l'état local des non-lus
        notificationService.resetChannelUnreadState(channelId);
      } catch (error) {
        console.error(
          `Erreur lors du marquage du canal ${channelId} comme lu:`,
          error,
        );
      }
    },
    [isConnected],
  );

  // Création de versions stables des fonctions pour éviter les re-renders inutiles
  const stableSetActiveChannel = useCallback((channel: Channel | null) => {
    setActiveChannel(channel);
  }, []);

  const stableSetActiveTeam = useCallback((team: Team | null) => {
    setActiveTeam(team);
  }, []);

  const stableSetHighlightMessageId = useCallback(
    (messageId: string | undefined) => {
      setHighlightMessageId(messageId);
    },
    [],
  );

  // Vérifier si un utilisateur est l'utilisateur courant
  const isCurrentUser = useCallback(
    (userId: string): boolean => {
      return !!currentUser && currentUser.id === userId;
    },
    [currentUser],
  );

  // Mémoriser la valeur du contexte pour éviter les re-renders inutiles
  const contextValue = useMemo<MattermostContextType>(
    () => ({
      // État
      mode,
      isConnected,
      error,
      currentUser: currentUserRef.current,
      services: currentServicesRef.current,
      websocket,

      // Fonctionnalité de réponse
      replyTo,
      setReplyTo,
      clearReply,
      isReplying,

      // Navigation
      navigateToMessage,
      activeChannel,
      setActiveChannel: stableSetActiveChannel,

      // Gestion des équipes
      activeTeam,
      setActiveTeam: stableSetActiveTeam,

      // Gestion des utilisateurs
      knownUsers,
      getUser,
      getUserDisplayName,

      // Statut de frappe
      typingUsers,
      isUserTyping,
      getTypingUsersForChannel,
      getTypingIndicatorText,

      // État des non-lus
      getChannelUnreadState,
      initializeTeamUnreadStates,
      markChannelAsRead,

      highlightMessageId,
      setHighlightMessageId: stableSetHighlightMessageId,

      isCurrentUser,
    }),
    [
      // Dépendances explicites pour éviter les rendus inutiles
      mode,
      isConnected,
      error,
      currentUser,
      services,
      websocket,
      replyTo,
      setReplyTo,
      clearReply,
      isReplying,
      navigateToMessage,
      activeChannel,
      stableSetActiveChannel,
      activeTeam,
      stableSetActiveTeam,
      knownUsers,
      getUser,
      getUserDisplayName,
      typingUsers,
      isUserTyping,
      getTypingUsersForChannel,
      getTypingIndicatorText,
      getChannelUnreadState,
      initializeTeamUnreadStates,
      markChannelAsRead,
      highlightMessageId,
      stableSetHighlightMessageId,
      isCurrentUser,
    ],
  );

  if (!currentServicesRef.current) return null;

  return (
    <MattermostContext.Provider value={contextValue}>
      {children}
    </MattermostContext.Provider>
  );
};

// Exporter le contexte pour une utilisation directe si nécessaire
export { MattermostContext };

export default MattermostProvider;
