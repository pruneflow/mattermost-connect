// src/context/MattermostProvider.tsx
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
import {
  createMattermostService,
  DirectService,
  ProxyService,
} from "../services";
import { createFileService, FileService } from "../services/file.service";
import {
  createEmojiService,
  EmojiServiceInterface,
} from "../services/emoji.service";
import { createUserService, UserService } from "../services/user.service";
import type {
  Channel,
  MattermostService,
  Message,
  ProviderConfig,
  Team,
  User,
  WebSocketConnection,
} from "../types";
import {
  releaseWebsocket,
  setupWebsocket,
} from "../services/websocket.service";
import {
  Notification,
  NotificationService,
  WebSocketEvent,
  WebSocketEventType,
} from "../services/notification.service";
import { NotificationSnackbar } from "../components/notification";
import { formatUserDisplayName } from "../utils";

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

  /** User service for user operations */
  userService: UserService;

  /** Navigate to a specific channel and optionally to a specific message */
  navigateToMessage: (notification: Notification) => void;

  /** The currently active/selected channel */
  activeChannel: Channel | null;

  /** Set the active channel */
  setActiveChannel: (channel: Channel | null) => void;

  /** Typing status by channel */
  typingUsers: Record<string, string[]>;

  /** Currently selected team */
  activeTeam: Team | null;

  /** Set the active team */
  setActiveTeam: (team: Team | null) => void;

  /** All known users (from all teams and direct messages) */
  knownUsers: Record<string, User>;

  /** Get a user by their ID - loads from API if not in cache */
  getUser: (userId: string) => Promise<User | null>;

  /** Get a formatted display name for a user by their ID */
  getUserDisplayName: (userId: string) => string;

  /** Check if a user is typing in a specific channel */
  isUserTyping: (channelId: string, userId: string) => boolean;

  /** Get typing users for a specific channel */
  getTypingUsersForChannel: (channelId: string) => string[];

  /** Get formatted typing indicator text for a channel */
  getTypingIndicatorText: (channelId: string) => string;

  /** Récupère l'état non lu pour un canal spécifique */
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

  notificationService: NotificationService;

  highlightMessageId?: string;

  setHighlightMessageId: (messageId: string | undefined) => void;
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
 * Sépare l'état de l'utilisateur courant de l'état principal pour éviter les re-renders
 */
const CurrentUserProvider = ({ children }: { children: ReactNode }) => {
  const context = useContext(MattermostContext);
  if (!context) {
    throw new Error(
      "CurrentUserProvider must be used within a MattermostProvider",
    );
  }

  return <>{children}</>;
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
  refreshInterval = 300000, // Augmenté à 5 minutes au lieu de 30 secondes

  // Child components
  children,
}) => {
  // Provider state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [websocket, setWebsocket] = useState<WebSocketConnection | null>(null);
  const [service, setService] = useState<MattermostService | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [notificationService, setNotificationService] =
    useState<NotificationService | null>(null);
  const [userService, setUserService] = useState<UserService | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<
    string | undefined
  >(undefined);

  // État pour stocker tous les utilisateurs connus (pas seulement ceux de l'équipe)
  const [knownUsers, setKnownUsers] = useState<Record<string, User>>({});

  // Références pour éviter les re-renders inutiles
  const serviceInitializedRef = useRef<boolean>(false);
  const socketInitializedRef = useRef<boolean>(false);
  const currentServiceRef = useRef<MattermostService | null>(null);
  const currentSocketRef = useRef<WebSocketConnection | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const lastUserRefreshRef = useRef<number>(0);

  // Secondary services
  const [fileService, setFileService] = useState<FileService | null>(null);
  const [emojiService, setEmojiService] =
    useState<EmojiServiceInterface | null>(null);

  // State for reply functionality
  const [replyTo, setReplyToState] = useState<Message | null>(null);

  // State for notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotification, setCurrentNotification] =
    useState<Notification | null>(null);

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

  /**
   * Obtenir un utilisateur par son ID - utilise le UserService
   */
  const getUser = useCallback(
    async (userId: string): Promise<User | null> => {
      if (!userId || !userService) return null;
      return userService.getUser(userId);
    },
    [userService],
  );

  /**
   * Obtenir le nom formaté d'un utilisateur par son ID - utilise le UserService
   */
  const getUserDisplayName = useCallback(
    (userId: string): string => {
      if (!userId || !userService) return "Utilisateur inconnu";
      if (knownUsers[userId]) {
        const user = knownUsers[userId];
        return formatUserDisplayName(user);
      }
      if (userService) {
        const displayName = userService.getUserDisplayName(userId);
        // Si le résultat est différent de "Chargement...", le retourner
        if (displayName !== "Chargement...") {
          return displayName;
        }

        // Déclencher le chargement de l'utilisateur en arrière-plan (si pas déjà fait)
        void userService.getUser(userId);
      }

      // Valeur par défaut
      return "Chargement...";
    },
    [userService],
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
          "Invalid configuration. You must provide (serverUrl and token) OR (proxyUrl and clientId) OR serviceProvider.",
        ),
      );
      return;
    }

    // Référence pour suivre si le composant est toujours monté
    let isMounted = true;

    const initService = async () => {
      try {
        console.debug("Initializing Mattermost service...");
        let localNotificationService = null;

        // Si un service existe déjà et que les paramètres ont changé, on nettoie l'ancien service
        if (currentServiceRef.current) {
          console.debug("Cleaning up existing service before initialization");
          // Fermer la connexion WebSocket si elle existe
          if (currentSocketRef.current) {
            console.debug("Closing existing WebSocket connection");
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
        if (!serviceInitializedRef.current || !currentServiceRef.current) {
          console.debug("Creating new service instance");

          // Create service instance with our centralized factory
          const serviceInstance = createMattermostService({
            serverUrl,
            token,
            proxyUrl,
            clientId,
            userId,
            serviceProvider,
          });

          // Stocker la référence au service
          currentServiceRef.current = serviceInstance;
          serviceInitializedRef.current = true;

          if (isMounted) {
            setService(serviceInstance);
          }

          // Initialize auxiliary services with the main service
          const fileServiceInstance = createFileService(serviceInstance);
          const emojiServiceInstance = createEmojiService(serviceInstance);
          const userServiceInstance = createUserService(serviceInstance);
          localNotificationService = new NotificationService(serviceInstance);

          if (isMounted) {
            setNotificationService(localNotificationService);
            setFileService(fileServiceInstance);
            setEmojiService(emojiServiceInstance);
            setUserService(userServiceInstance);
          }
        } else {
          console.debug("Using existing service instance");
          if (notificationService) {
            localNotificationService = notificationService;
          } else {
            localNotificationService = new NotificationService(
              currentServiceRef.current,
            );
            if (isMounted) {
              setNotificationService(localNotificationService);
            }
          }
        }

        // Test connection (except for custom services that specify to skip the test)
        if (mode !== "custom" || !serviceProvider?.skipConnectionTest) {
          try {
            // Get current user - now uses caching
            const user = await currentServiceRef.current.getCurrentUser();

            // Only update the user state if it has actually changed to avoid re-renders
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

            // Record last refresh time
            lastUserRefreshRef.current = Date.now();

            // Initialiser les services avec l'ID utilisateur
            if (notificationService) {
              notificationService.setCurrentUserId(user.id);
            } else if (localNotificationService) {
              localNotificationService.setCurrentUserId(user.id);
            }

            if (userService) {
              userService.setCurrentUserId(user.id);
              userService.addUser(user);
            }

            // Mettre à jour la liste des utilisateurs connus
            if (isMounted && user) {
              setKnownUsers((prev) => ({
                ...prev,
                [user.id]: user,
              }));
            }

            // If WebSocket is enabled, initialize it only if it doesn't exist
            if (enableWebsocket && !socketInitializedRef.current) {
              await initializeWebSocket(
                currentServiceRef.current,
                mode,
                localNotificationService,
              );
            }
          } catch (connErr) {
            console.error("Connection error:", connErr);
            const errorMessage =
              connErr instanceof Error
                ? connErr.message
                : "Unable to connect to Mattermost server";

            if (isMounted) {
              setError(new Error(errorMessage));
              setIsConnected(false);
              setCurrentUser(null);
            }
          }
        } else if (mode === "custom" && serviceProvider?.currentUser) {
          // For custom services that provide a current user
          currentUserRef.current = serviceProvider.currentUser;
          if (isMounted) {
            setCurrentUser(serviceProvider.currentUser);
            setIsConnected(true);
          }

          // Initialiser les services avec l'ID utilisateur
          if (serviceProvider.currentUser.id) {
            if (notificationService) {
              notificationService.setCurrentUserId(
                serviceProvider.currentUser.id,
              );
            } else if (localNotificationService) {
              localNotificationService.setCurrentUserId(
                serviceProvider.currentUser.id,
              );
            }

            if (userService) {
              userService.setCurrentUserId(serviceProvider.currentUser.id);
              userService.addUser(serviceProvider.currentUser);
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

          // If the custom service provides a user cache
          if ((currentServiceRef.current as any)._currentUser && isMounted) {
            const customUser = (currentServiceRef.current as any)._currentUser;

            // Only update if different
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
        console.error("Service initialization error:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unable to initialize Mattermost service";

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
      service: MattermostService,
      mode: string,
      notificationSvc: NotificationService | null,
    ) {
      try {
        console.debug("Initializing WebSocket connection...");
        // Get WebSocket URL and token
        const wsUrl = service.getWebsocketUrl();
        const wsToken = await service.getWebsocketToken();

        // Set up WebSocket connection
        const ws = await setupWebsocket({
          mode: mode as "direct" | "proxy" | "custom",
          serverUrl: wsUrl,
          token: wsToken,
          onMessage: (msg) => {
            // Vérifier si le message concerne une mise à jour utilisateur
            if (msg.event === WebSocketEventType.USER_UPDATED) {
              handleUserUpdatedEvent(msg);
            }

            // Traiter normalement le message
            if (notificationSvc) {
              notificationSvc.processWebSocketEvent(msg as WebSocketEvent);
            }
          },
          onError: (err) => {
            console.error("WebSocket error:", err);
          },
          onClose: (closeEvent) => {
            console.log("WebSocket closed:", closeEvent);
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
        console.debug("WebSocket connection established successfully");
      } catch (wsError) {
        console.error("Failed to initialize WebSocket:", wsError);
        // Consider this a warning, not a fatal error
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
            console.debug("User updated via WebSocket event:", updatedUser.id);
            currentUserRef.current = updatedUser;
            setCurrentUser(updatedUser); // Ne pas sauter cette étape!
            // Mettre à jour uniquement si les données ont changé

            // Mettre à jour l'utilisateur dans le service utilisateur
            if (userService) {
              userService.addUser(updatedUser);
            }

            // Mettre à jour la liste des utilisateurs connus
            setKnownUsers((prev) => ({
              ...prev,
              [updatedUser.id]: updatedUser,
            }));

            // Mettre à jour le timestamp du dernier rafraîchissement
            lastUserRefreshRef.current = Date.now();
          } else if (userService) {
            // Si c'est un autre utilisateur, juste le mettre à jour dans le service
            userService.addUser(updatedUser);

            // Et dans la liste des utilisateurs connus
            setKnownUsers((prev) => ({
              ...prev,
              [updatedUser.id]: updatedUser,
            }));
          }
        } catch (error) {
          console.error("Error handling user updated event:", error);
        }
      }
    };

    // Cleanup on unmount
    return () => {
      isMounted = false;
      console.debug("MattermostProvider cleanup");

      if (currentSocketRef.current) {
        console.debug("Releasing WebSocket connection");

        // Récupérer les informations nécessaires pour libérer la connexion
        if (service) {
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
    notificationService,
    userService,
  ]);

  // Effet périodique de rafraîchissement utilisateur (beaucoup moins fréquent)
  useEffect(() => {
    // Ne pas configurer l'intervalle si refreshInterval est désactivé (0 ou négatif)
    if (refreshInterval <= 0 || !currentServiceRef.current || !isConnected) {
      return;
    }

    console.debug(`Setting up user refresh interval (${refreshInterval}ms)`);

    // Fonction pour rafraîchir l'utilisateur
    const refreshUser = async () => {
      // Vérifier si suffisamment de temps s'est écoulé depuis le dernier rafraîchissement
      const now = Date.now();
      if (now - lastUserRefreshRef.current < refreshInterval) {
        return;
      }

      try {
        // Si le service implémente refreshCurrentUser, l'utiliser
        if (
          (currentServiceRef.current instanceof DirectService ||
            currentServiceRef.current instanceof ProxyService) &&
          isConnected
        ) {
          console.debug("Refreshing current user...");
          const freshUser =
            await currentServiceRef.current.refreshCurrentUser();
          // Mettre à jour seulement si l'utilisateur a changé
          if (
            JSON.stringify(currentUserRef.current) !== JSON.stringify(freshUser)
          ) {
            console.debug("User refreshed with changes detected");
            currentUserRef.current = freshUser;
            setCurrentUser(freshUser);

            // Mettre à jour l'utilisateur dans le service utilisateur
            if (userService) {
              userService.addUser(freshUser);
            }

            // Mettre à jour la liste des utilisateurs connus
            setKnownUsers((prev) => ({
              ...prev,
              [freshUser.id]: freshUser,
            }));
          } else {
            console.debug("User refreshed, no changes detected");
          }

          // Mettre à jour le timestamp même si aucun changement
          lastUserRefreshRef.current = now;
        }
      } catch (refreshError) {
        console.warn("Error refreshing user:", refreshError);
      }
    };

    // Exécuter le rafraîchissement immédiatement si nécessaire
    void refreshUser();

    // Configurer l'intervalle pour les rafraîchissements périodiques
    const intervalId = setInterval(refreshUser, refreshInterval);

    // Nettoyer l'intervalle lors du démontage
    return () => {
      clearInterval(intervalId);
      console.debug("User refresh interval cleared");
    };
  }, [refreshInterval, isConnected, userService]);

  // Écouter les nouvelles notifications pour afficher une Snackbar (pas de changement - faible fréquence)
  useEffect(() => {
    if (!notificationService) return;

    // Fonction de gestion des notifications pour éviter les rendus inutiles
    const handleNotificationAdded = (notification: Notification) => {
      // Ne pas afficher de notification si nous sommes déjà dans le canal concerné
      if (
        notification.channelId &&
        activeChannel &&
        notification.channelId === activeChannel.id
      ) {
        return;
      }

      // Ajouter cette notification à notre file d'attente
      setNotifications((prev) => [notification, ...prev]);
    };

    return notificationService.addEventListener(
      "notification_added",
      handleNotificationAdded,
    );
  }, [activeChannel, notificationService]);

  // Gérer l'affichage des notifications une par une
  useEffect(() => {
    // Si nous n'avons pas de notification en cours d'affichage et qu'il y en a dans la file d'attente
    if (!currentNotification && notifications.length > 0) {
      const [nextNotification, ...remainingNotifications] = notifications;
      setCurrentNotification(nextNotification);
      setNotifications(remainingNotifications);
    }
  }, [currentNotification, notifications]);

  // Quand un canal devient actif, mettre à jour le service de notification
  useEffect(() => {
    if (!notificationService) return;
    if (activeChannel) {
      notificationService.setCurrentChannelId(activeChannel.id);
    } else {
      notificationService.setCurrentChannelId(null);
    }
  }, [activeChannel, notificationService]);

  // Écouter les événements de frappe avec un nettoyage amélioré
  useEffect(() => {
    if (!notificationService) return;

    const handleTypingUpdated = (data: any) => {
      if (!data.channelId) return;

      // Mettez à jour le state des utilisateurs en train de taper
      setTypingUsers((prev) => {
        // Créez une copie pour ne pas modifier directement l'état
        const newTypingUsers = { ...prev };

        // Si nous avons une liste d'utilisateurs pour ce canal, mettez-la à jour
        if (data.typingUsers) {
          newTypingUsers[data.channelId] = data.typingUsers;
        } else {
          // Si aucun utilisateur ne tape, supprimez l'entrée pour ce canal
          delete newTypingUsers[data.channelId];
        }

        return newTypingUsers;
      });
    };

    // S'abonner à l'événement et retourner la fonction de nettoyage
    return notificationService.addEventListener(
      "typing_updated",
      handleTypingUpdated,
    );
  }, [notificationService]);

  // Charger les utilisateurs de l'équipe active
  useEffect(() => {
    if (isConnected && userService && activeTeam) {
      // Charger les utilisateurs de l'équipe
      void userService.loadTeamUsers(activeTeam.id);
    }
  }, [isConnected, userService, activeTeam]);

  // Charger les utilisateurs des messages directs quand les canaux changent
  useEffect(() => {
    if (isConnected && service && activeChannel && userService) {
      // Lorsqu'un canal devient actif, récupérer tous les canaux
      // Nous avons déplacé cette responsabilité dans le ChannelList
      // Si nécessaire, ne charger que pour les canaux directs individuels
      if (activeChannel.type === "D" || activeChannel.type === "G") {
        void userService.loadDirectMessageUsers([activeChannel]);
      }
    }
  }, [isConnected, service, activeChannel, userService]);

  // Synchroniser knownUsers avec userService (moins fréquent)
  useEffect(() => {
    if (!userService) return;

    const updateKnownUsers = () => {
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

    // Configurer un intervalle pour mettre à jour périodiquement (toutes les 30 secondes)
    const interval = setInterval(updateKnownUsers, 30000);

    return () => clearInterval(interval);
  }, [userService, knownUsers]);

  // Fonction pour naviguer vers un message - Optimisée avec useCallback
  const navigateToMessage = useCallback(
    async (notification: Notification) => {
      const { channelId, messageId } = notification;
      if (!service || !notificationService || !channelId) return;

      try {
        // Récupérer les informations du canal
        const channel = await service.getChannel(channelId);

        const { team_id } = channel;

        const team = await service.getTeam(team_id);
        setActiveTeam(team);

        // Signaler que nous visualisons maintenant ce canal
        notificationService.setCurrentChannelId(channelId);

        // Si c'est un canal direct, charger les informations des utilisateurs impliqués
        if ((channel.type === "D" || channel.type === "G") && userService) {
          // Utiliser le service utilisateur pour charger les utilisateurs impliqués
          await userService.loadDirectMessageUsers([channel]);
        }

        if (messageId) setHighlightMessageId(messageId);

        setActiveChannel(channel);
      } catch (error) {
        console.error(
          `Erreur lors de la navigation vers le canal ${channelId}:`,
          error,
        );
      }
    },
    [service, userService, notificationService],
  );

  // Fermeture de la notification actuelle
  const handleCloseNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  // Clic sur une notification (naviguer vers le canal/message concerné)
  const handleNotificationClick = useCallback(() => {
    if (!notificationService) return;
    if (currentNotification?.channelId) {
      void navigateToMessage(currentNotification);
      // Marquer cette notification comme lue
      notificationService.markNotificationAsRead(currentNotification.id);
    }

    setCurrentNotification(null);
  }, [currentNotification, navigateToMessage, notificationService]);

  // Helper pour récupérer l'état non lu d'un canal - Optimisé avec useCallback
  const getChannelUnreadState = useCallback(
    (channelId: string) => {
      return (
        notificationService?.getChannelUnreadState(channelId) || {
          msg_count: 0,
          mention_count: 0,
        }
      );
    },
    [notificationService],
  );

  // Méthode pour initialiser les états non lus d'une équipe - Optimisée avec useCallback
  const initializeTeamUnreadStates = useCallback(
    async (teamId: string, channels: Channel[]) => {
      if (
        !isConnected ||
        !service ||
        !notificationService ||
        !teamId ||
        !channels ||
        channels.length === 0
      )
        return;

      try {
        // Pour chaque canal, récupérer l'état non lu individuellement
        for (const channel of channels) {
          if (channel.id) {
            try {
              // Vérifier si la méthode est disponible
              if (
                typeof (service as any).getChannelUnreadCount === "function"
              ) {
                const unreadState = await (
                  service as any
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
    [isConnected, service, notificationService],
  );

  // Marquer un canal comme lu - Optimisé avec useCallback
  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      if (!isConnected || !service || !channelId || !notificationService)
        return;

      try {
        // Appeler le serveur via la méthode viewChannel
        if (typeof (service as any).viewChannel === "function") {
          await (service as any).viewChannel(channelId);
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
    [isConnected, service, notificationService],
  );

  // Création d'une version stable du contexte pour éviter les re-renders inutiles
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

  // Mémoriser la valeur du contexte pour éviter les re-renders inutiles
  const contextValue = useMemo<MattermostContextType>(
    () => ({
      // State
      mode,
      isConnected,
      error,
      currentUser: currentUserRef.current,
      service: service!,
      websocket,

      // Reply functionality
      replyTo,
      setReplyTo,
      clearReply,
      isReplying,

      // Additional services
      fileService: fileService!,
      emojiService: emojiService!,
      userService: userService!,

      // Navigation
      navigateToMessage,
      activeChannel,
      setActiveChannel: stableSetActiveChannel,

      // Team management
      activeTeam,
      setActiveTeam: stableSetActiveTeam,

      // Users management
      knownUsers,
      getUser,
      getUserDisplayName,

      // Typing status
      typingUsers,
      isUserTyping,
      getTypingUsersForChannel,
      getTypingIndicatorText,

      // Unread status
      getChannelUnreadState,
      initializeTeamUnreadStates,
      markChannelAsRead,

      notificationService: notificationService!,

      highlightMessageId,
      setHighlightMessageId: stableSetHighlightMessageId,

      isCurrentUser: (userId: string): boolean => {
        return !!currentUser && currentUser.id === userId;
      },
    }),
    [
      // Dépendances explicites pour éviter les rendus inutiles
      mode,
      isConnected,
      error,
      currentUser,
      service,
      websocket,
      replyTo,
      setReplyTo,
      clearReply,
      isReplying,
      fileService,
      emojiService,
      userService,
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
      notificationService,
      highlightMessageId,
      stableSetHighlightMessageId,
    ],
  );

  if (
    !service ||
    !fileService ||
    !emojiService ||
    !notificationService ||
    !userService
  )
    return null;

  return (
    <MattermostContext.Provider value={contextValue}>
      {children}

      {/* Notification Snackbar */}
      {currentNotification && (
        <NotificationSnackbar
          notification={currentNotification}
          onClose={handleCloseNotification}
          onClick={handleNotificationClick}
          autoHideDuration={6000}
        />
      )}
    </MattermostContext.Provider>
  );
};

// Export the context for direct use if needed
export { MattermostContext };

export default MattermostProvider;
