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
import type {
  Channel,
  MattermostService,
  Message,
  ProviderConfig,
  Team,
  User,
  WebSocketConnection,
} from "../types";
import { setupWebsocket } from "../services/websocket.service";
import {
  Notification,
  notificationService,
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

  /** Navigate to a specific channel and optionally to a specific message */
  navigateToChannel: (channelId: string, messageId?: string) => void;

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

  /** Load user by id if not in cache */
  loadUserById: (userId: string) => Promise<User | null>;
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
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // État pour stocker tous les utilisateurs connus (pas seulement ceux de l'équipe)
  const [knownUsers, setKnownUsers] = useState<Record<string, User>>({});

  // Cache pour les requêtes utilisateur en cours pour éviter les appels multiples
  const pendingUserRequests = useRef<Record<string, Promise<User | null>>>({});

  // État pour suivre quand les utilisateurs ont été mis à jour la dernière fois
  const lastUsersFetchRef = useRef<number>(0);
  const usersFetchIntervalRef = useRef<number | null>(null);

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
   * Charge les utilisateurs de l'équipe active et les ajoute au cache global
   */
  const loadTeamUsers = useCallback(
    async (teamId: string) => {
      if (!service || !isConnected) return;

      try {
        // Marquer le début du chargement
        const fetchStart = Date.now();
        lastUsersFetchRef.current = fetchStart;

        // Récupérer tous les utilisateurs de l'équipe (en augmentant la limite)
        const users = await service.getUsers({
          inTeam: teamId,
          perPage: 200, // Une limite plus grande pour récupérer plus d'utilisateurs
        });

        // Vérifier si c'est toujours la dernière requête (éviter les conditions de course)
        if (fetchStart !== lastUsersFetchRef.current) return;

        // Construire le dictionnaire des utilisateurs, mais sans écraser les utilisateurs existants
        setKnownUsers((prevUsers) => {
          const newUsers = { ...prevUsers };
          users.forEach((user) => {
            // N'ajouter l'utilisateur que s'il n'existe pas déjà ou si ses données sont plus récentes
            if (
              !newUsers[user.id] ||
              (user.update_at &&
                newUsers[user.id].update_at &&
                user.update_at > newUsers[user.id].update_at)
            ) {
              newUsers[user.id] = user;
            }
          });

          // Ajouter l'utilisateur actuel s'il n'est pas déjà présent
          if (currentUser && !newUsers[currentUser.id]) {
            newUsers[currentUser.id] = currentUser;
          }

          return newUsers;
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des utilisateurs de l'équipe:",
          error,
        );
      }
    },
    [service, isConnected, currentUser],
  );

  /**
   * Charge tous les utilisateurs impliqués dans des canaux de messages directs
   */
  const loadDirectMessageUsers = useCallback(
    async (channels: Channel[]) => {
      if (!service || !isConnected || !currentUser) return;

      try {
        // Filtrer les canaux de type direct (D) ou groupe (G)
        const directChannels = channels.filter(
          (c) => c.type === "D" || c.type === "G",
        );

        if (directChannels.length === 0) return;

        // Collecter tous les IDs utilisateurs depuis les noms des canaux
        const userIds: Set<string> = new Set();

        directChannels.forEach((channel) => {
          // Dans Mattermost, les canaux directs ont généralement un nom au format "user1__user2"
          if (channel.name && channel.name.includes("__")) {
            const parts = channel.name.split("__");
            parts.forEach((part) => {
              if (part !== currentUser.id) {
                userIds.add(part);
              }
            });
          }
        });

        // Convertir Set en tableau et filtrer les utilisateurs déjà connus
        const usersToFetch = Array.from(userIds).filter(
          (id) => !knownUsers[id],
        );

        if (usersToFetch.length === 0) return;

        // Charger les informations des utilisateurs
        const users = await service.getUsers({ ids: usersToFetch });

        // Ajouter les nouveaux utilisateurs au cache
        setKnownUsers((prevUsers) => {
          const newUsers = { ...prevUsers };
          users.forEach((user) => {
            newUsers[user.id] = user;
          });
          return newUsers;
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des utilisateurs pour les DMs:",
          error,
        );
      }
    },
    [service, isConnected, currentUser, knownUsers],
  );

  /**
   * Charge un utilisateur spécifique par son ID s'il n'est pas déjà dans le cache
   */
  const loadUserById = useCallback(
    async (userId: string): Promise<User | null> => {
      if (!userId || !service || !isConnected) return null;

      // Si l'utilisateur est déjà dans le cache, le retourner immédiatement
      if (knownUsers[userId]) {
        return knownUsers[userId];
      }

      // Si une requête est déjà en cours pour cet utilisateur, retourner sa promesse
      if (pendingUserRequests.current[userId]) {
        return pendingUserRequests.current[userId];
      }

      // Créer une nouvelle promesse pour cette requête
      const request = (async () => {
        try {
          const users = await service.getUsers({ ids: [userId] });
          if (users && users.length > 0) {
            const user = users[0];

            // Mettre à jour le cache
            setKnownUsers((prev) => ({
              ...prev,
              [userId]: user,
            }));

            return user;
          }
        } catch (error) {
          console.error(
            `Erreur lors du chargement de l'utilisateur ${userId}:`,
            error,
          );
        } finally {
          // Supprimer cette requête des requêtes en cours
          delete pendingUserRequests.current[userId];
        }
        return null;
      })();

      // Stocker la promesse dans les requêtes en cours
      pendingUserRequests.current[userId] = request;

      return request;
    },
    [service, isConnected, knownUsers],
  );

  /**
   * Obtenir un utilisateur par son ID - charge l'utilisateur si nécessaire
   */
  const getUser = useCallback(
    async (userId: string): Promise<User | null> => {
      if (!userId) return null;

      // Si l'utilisateur est déjà dans le cache, le retourner
      if (knownUsers[userId]) {
        return knownUsers[userId];
      }

      // Sinon, essayer de le charger
      return loadUserById(userId);
    },
    [knownUsers, loadUserById],
  );

  /**
   * Obtenir le nom formaté d'un utilisateur par son ID
   */
  const getUserDisplayName = useCallback(
    (userId: string): string => {
      const user = knownUsers[userId];

      // Si l'utilisateur n'est pas dans le cache, essayer de le charger en arrière-plan
      if (!user && service && isConnected) {
        void loadUserById(userId);
        return "Chargement..."; // Afficher un état de chargement en attendant
      }

      return formatUserDisplayName(user);
    },
    [knownUsers, service, isConnected, loadUserById],
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
      return `${typingUserNames[0]}, ${typingUserNames[1]} et ${remaining} autre${remaining > 1 ? "s" : ""} sont en train d'écrire...`;
    },
    [getTypingUsersForChannel, getUserDisplayName],
  );

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

            // Initialiser le service de notification avec l'ID utilisateur
            notificationService.setCurrentUserId(user.id);

            // Ajouter l'utilisateur courant aux utilisateurs connus
            setKnownUsers((prev) => ({
              ...prev,
              [user.id]: user,
            }));

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

                    // Process the WebSocket message through our notification service
                    notificationService.processWebSocketEvent(
                      msg as WebSocketEvent,
                    );
                  },
                  onError: (err) => {
                    console.error("WebSocket error:", err);
                    // Consider reconnecting or showing an error message
                  },
                  onClose: (closeEvent) => {
                    console.log("WebSocket closed:", closeEvent);
                    setWebsocket(null);
                    // Consider reconnecting or showing a connection lost message
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

          // Initialiser le service de notification avec l'ID utilisateur
          if (serviceProvider.currentUser.id) {
            notificationService.setCurrentUserId(
              serviceProvider.currentUser.id,
            );

            // Ajouter l'utilisateur courant aux utilisateurs connus
            if (serviceProvider.currentUser) {
              setKnownUsers((prev) => ({
                ...prev,
                [serviceProvider.currentUser!.id]:
                  serviceProvider.currentUser as User,
              }));
            }
          }

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

                // Mettre à jour l'utilisateur dans la liste des utilisateurs connus
                setKnownUsers((prev) => ({
                  ...prev,
                  [freshUser.id]: freshUser,
                }));
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

      // Nettoyer l'intervalle de rafraîchissement des utilisateurs
      if (usersFetchIntervalRef.current) {
        window.clearInterval(usersFetchIntervalRef.current);
        usersFetchIntervalRef.current = null;
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

  // Écouter les nouvelles notifications pour afficher une Snackbar
  useEffect(() => {
    // Écouter les nouvelles notifications
    return notificationService.addEventListener(
      "notification_added",
      (notification: Notification) => {
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
      },
    );
  }, [activeChannel]);

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
    if (activeChannel) {
      notificationService.setCurrentChannelId(activeChannel.id);
    } else {
      notificationService.setCurrentChannelId(null);
    }
  }, [activeChannel]);

  // Écouter les événements de frappe avec un nettoyage amélioré
  useEffect(() => {
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
  }, []);

  // Configurer l'intervalle pour actualiser les utilisateurs de l'équipe
  useEffect(() => {
    // Nettoyer l'intervalle existant
    if (usersFetchIntervalRef.current) {
      window.clearInterval(usersFetchIntervalRef.current);
      usersFetchIntervalRef.current = null;
    }

    if (isConnected && service && activeTeam) {
      // Charger les utilisateurs immédiatement
      void loadTeamUsers(activeTeam.id);

      // Configurer un intervalle pour actualiser les utilisateurs (toutes les 5 minutes)
      usersFetchIntervalRef.current = window.setInterval(
        () => {
          void loadTeamUsers(activeTeam.id);
        },
        5 * 60 * 1000,
      ); // 5 minutes
    }

    return () => {
      if (usersFetchIntervalRef.current) {
        window.clearInterval(usersFetchIntervalRef.current);
        usersFetchIntervalRef.current = null;
      }
    };
  }, [isConnected, service, activeTeam, loadTeamUsers]);

  // Écouter les mises à jour d'utilisateurs via WebSocket
  useEffect(() => {
    const handleUserUpdated = (data: any) => {
      try {
        const user = data.user;
        if (!user || !user.id) return;

        // Mettre à jour l'utilisateur dans notre cache
        setKnownUsers((prev) => ({
          ...prev,
          [user.id]: {
            ...prev[user.id],
            ...user,
          },
        }));
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
      }
    };

    // S'abonner à l'événement de mise à jour d'utilisateur
    return notificationService.addEventListener(
      WebSocketEventType.USER_UPDATED,
      handleUserUpdated,
    );
  }, []);

  // Charger les utilisateurs des messages directs quand les canaux changent
  useEffect(() => {
    if (isConnected && service && activeChannel) {
      // Lorsqu'un canal devient actif, récupérer tous les canaux
      service
        .getChannels(activeChannel.team_id)
        .then((channels) => {
          // Charger les utilisateurs impliqués dans les messages directs
          void loadDirectMessageUsers(channels);
        })
        .catch((error) => {
          console.error("Erreur lors de la récupération des canaux:", error);
        });
    }
  }, [isConnected, service, activeChannel, loadDirectMessageUsers]);

  // Fonction pour naviguer vers un canal spécifique
  const navigateToChannel = useCallback(
    async (channelId: string, _messageId?: string) => {
      if (!service) return;

      try {
        // Récupérer les informations du canal
        const channel = await service.getChannel(channelId);

        // Mettre à jour le canal actif
        setActiveChannel(channel);

        // Signaler que nous visualisons maintenant ce canal
        notificationService.setCurrentChannelId(channelId);

        // Si c'est un canal direct, charger les informations des utilisateurs impliqués
        if (channel.type === "D" || channel.type === "G") {
          // Extraire les IDs utilisateurs du nom du canal
          if (channel.name && channel.name.includes("__")) {
            const userIds = channel.name
              .split("__")
              .filter((id) => id !== currentUser?.id);
            // Charger les utilisateurs si nécessaire
            for (const userId of userIds) {
              void loadUserById(userId);
            }
          }
        }

        // Si un ID de message est fourni, nous voudrons peut-être le mettre en évidence
        // Cette fonctionnalité sera implémentée dans le composant ChannelViewer
      } catch (error) {
        console.error(
          `Erreur lors de la navigation vers le canal ${channelId}:`,
          error,
        );
      }
    },
    [service, currentUser, loadUserById],
  );

  // Fermeture de la notification actuelle
  const handleCloseNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  // Clic sur une notification (naviguer vers le canal/message concerné)
  const handleNotificationClick = useCallback(() => {
    if (currentNotification?.channelId) {
      navigateToChannel(
        currentNotification.channelId,
        currentNotification.messageId,
      );

      // Marquer cette notification comme lue
      notificationService.markNotificationAsRead(currentNotification.id);
    }

    setCurrentNotification(null);
  }, [currentNotification, navigateToChannel]);

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

    // Navigation
    navigateToChannel,
    activeChannel,
    setActiveChannel,

    // Team management
    activeTeam,
    setActiveTeam,

    // Users management
    knownUsers,
    getUser,
    getUserDisplayName,
    loadUserById,

    // Typing status
    typingUsers,
    isUserTyping,
    getTypingUsersForChannel,
    getTypingIndicatorText,
  };

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
