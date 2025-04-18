// src/hooks/useUser.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { User, UserStatus } from "../types";
import { useMattermost } from "../context";
import { assertServiceInitialized } from "../services/factory";

/**
 * Options pour le hook useUser
 */
interface UseUserOptions {
  /** Inclure le statut de l'utilisateur (defaut: false) */
  includeStatus?: boolean;

  /** Intervalle de rafraîchissement du statut en ms (défaut: 60000 - 1 minute) */
  statusRefreshInterval?: number;

  /** Callback appelé lorsque l'utilisateur est chargé */
  onUserLoaded?: (user: User) => void;

  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void;
}

/**
 * Options pour le hook useUsers
 */
interface UseUsersOptions {
  /** Inclure le statut des utilisateurs (defaut: false) */
  includeStatus?: boolean;

  /** Nombre maximal d'utilisateurs à charger en parallèle pour les statuts */
  statusBatchSize?: number;

  /** Utiliser le cache pour les utilisateurs au lieu de les recharger (défaut: true) */
  useCache?: boolean;

  /** Callback appelé lorsque tous les utilisateurs sont chargés */
  onUsersLoaded?: (users: User[]) => void;

  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void;
}

/**
 * État de retour du hook useUser
 */
interface UseUserState {
  /** L'utilisateur demandé */
  user: User | null;

  /** État de chargement de l'utilisateur */
  loading: boolean;

  /** Erreur éventuelle lors du chargement de l'utilisateur */
  error: Error | null;

  /** Statut de l'utilisateur (si includeStatus est true) */
  status: UserStatus | null;

  /** État de chargement du statut */
  loadingStatus: boolean;

  /** Erreur éventuelle lors du chargement du statut */
  statusError: Error | null;

  /** Nom d'affichage formaté de l'utilisateur */
  displayName: string;

  /** Indique si l'utilisateur est l'utilisateur actuel */
  isCurrentUser: boolean;
}

/**
 * Hook personnalisé pour récupérer et interagir avec un utilisateur spécifique
 *
 * @param userId ID de l'utilisateur à récupérer
 * @param options Options de configuration
 * @returns État et fonctions pour interagir avec l'utilisateur
 */
export function useUser(userId: string | null, options: UseUserOptions = {}) {
  // Options avec valeurs par défaut
  const {
    includeStatus = false,
    statusRefreshInterval = 60000,
    onUserLoaded,
    onError,
  } = options;

  // Contexte Mattermost
  const {
    services,
    currentUser,
    getUserDisplayName,
    isCurrentUser: checkIsCurrentUser,
  } = useMattermost();

  // États locaux
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<Error | null>(null);
  const [lastStatusFetch, setLastStatusFetch] = useState<number>(0);

  // Détermine si l'utilisateur est l'utilisateur actuel
  const isCurrentUser = useMemo(() => {
    if (!userId || !currentUser) return false;
    return checkIsCurrentUser(userId);
  }, [userId, currentUser, checkIsCurrentUser]);

  // Récupère le nom d'affichage
  const displayName = useMemo(() => {
    if (!userId) return "";
    return getUserDisplayName(userId);
  }, [userId, getUserDisplayName]);

  // Fonction pour charger l'utilisateur
  const loadUser = useCallback(async () => {
    if (!userId || !services) return;

    assertServiceInitialized(services.userService, "userService");

    setLoading(true);
    setError(null);

    try {
      const userData = await services.userService.getUser(userId);

      if (userData) {
        setUser(userData);

        // Appeler le callback si fourni
        if (onUserLoaded) {
          onUserLoaded(userData);
        }
      } else {
        throw new Error(`Utilisateur ${userId} non trouvé`);
      }
    } catch (err) {
      console.error(
        `Erreur lors du chargement de l'utilisateur ${userId}:`,
        err,
      );
      setError(err instanceof Error ? err : new Error(String(err)));

      // Appeler le callback d'erreur si fourni
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }, [userId, services, onUserLoaded, onError]);

  // Fonction pour charger le statut de l'utilisateur
  const loadStatus = useCallback(async () => {
    if (!userId || !services || !includeStatus) return;

    assertServiceInitialized(services.mattermostService, "mattermostService");

    setLoadingStatus(true);
    setStatusError(null);

    try {
      const userStatus = await services.mattermostService.getUserStatus(userId);
      setStatus(userStatus);
      setLastStatusFetch(Date.now());
    } catch (err) {
      console.error(
        `Erreur lors du chargement du statut de l'utilisateur ${userId}:`,
        err,
      );
      setStatusError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingStatus(false);
    }
  }, [userId, services, includeStatus]);

  // Charger l'utilisateur quand l'ID change
  useEffect(() => {
    if (userId) {
      void loadUser();
    } else {
      setUser(null);
      setError(null);
    }
  }, [userId, loadUser]);

  // Charger le statut quand l'utilisateur change ou quand includeStatus change
  useEffect(() => {
    if (userId && includeStatus) {
      void loadStatus();
    } else if (!includeStatus) {
      setStatus(null);
      setStatusError(null);
    }
  }, [userId, includeStatus, loadStatus]);

  // Configurer le rafraîchissement périodique du statut si demandé
  useEffect(() => {
    if (
      !statusRefreshInterval ||
      statusRefreshInterval <= 0 ||
      !userId ||
      !includeStatus
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      // Ne charger que si le dernier chargement date d'au moins statusRefreshInterval ms
      const now = Date.now();
      if (now - lastStatusFetch >= statusRefreshInterval) {
        void loadStatus();
      }
    }, statusRefreshInterval);

    return () => clearInterval(intervalId);
  }, [
    userId,
    includeStatus,
    statusRefreshInterval,
    lastStatusFetch,
    loadStatus,
  ]);

  // État combiné à retourner
  const state: UseUserState = {
    user,
    loading,
    error,
    status,
    loadingStatus,
    statusError,
    displayName,
    isCurrentUser,
  };

  // Retourner l'état et les fonctions
  return {
    ...state,
    loadUser,
    loadStatus,
  };
}

/**
 * Hook personnalisé pour récupérer et interagir avec plusieurs utilisateurs
 *
 * @param userIds Liste des IDs d'utilisateurs à récupérer
 * @param options Options de configuration
 * @returns État et fonctions pour interagir avec les utilisateurs
 */
export function useUsers(
  userIds: string[] | null,
  options: UseUsersOptions = {},
) {
  // Options avec valeurs par défaut
  const {
    includeStatus = false,
    statusBatchSize = 10,
    useCache = true,
    onUsersLoaded,
    onError,
  } = options;

  // Contexte Mattermost
  const { services } = useMattermost();

  // États locaux
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<Error | null>(null);

  // Liste triée et filtrée des utilisateurs
  const usersList = useMemo(() => {
    return Object.values(users).sort((a, b) => {
      // Trier par nom d'affichage
      const aName =
        `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.username;
      const bName =
        `${b.first_name || ""} ${b.last_name || ""}`.trim() || b.username;
      return aName.localeCompare(bName);
    });
  }, [users]);

  // Fonction pour charger les utilisateurs
  const loadUsers = useCallback(async () => {
    if (!userIds || !userIds.length || !services) return;

    assertServiceInitialized(services.userService, "userService");

    setLoading(true);
    setError(null);

    try {
      // Identifier les utilisateurs qui doivent être chargés
      let idsToLoad = userIds;

      if (useCache) {
        // Filtrer pour exclure les utilisateurs déjà en cache
        idsToLoad = userIds.filter(
          (id) =>
            !services.userService.hasUser(id) &&
            !services.userService.isUserLoading(id),
        );
      }

      if (idsToLoad.length === 0) {
        // Tous les utilisateurs sont déjà en cache
        const cachedUsers = await services.userService.getUsers(userIds);
        const usersMap = cachedUsers.reduce(
          (acc, user) => {
            acc[user.id] = user;
            return acc;
          },
          {} as Record<string, User>,
        );

        setUsers(usersMap);

        // Appeler le callback si fourni
        if (onUsersLoaded) {
          onUsersLoaded(cachedUsers);
        }
      } else {
        // Charger les utilisateurs manquants
        const loadedUsers = await services.userService.getUsers(userIds);
        const usersMap = loadedUsers.reduce(
          (acc, user) => {
            acc[user.id] = user;
            return acc;
          },
          {} as Record<string, User>,
        );

        setUsers(usersMap);

        // Appeler le callback si fourni
        if (onUsersLoaded) {
          onUsersLoaded(loadedUsers);
        }
      }
    } catch (err) {
      console.error(`Erreur lors du chargement des utilisateurs:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));

      // Appeler le callback d'erreur si fourni
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }, [userIds, services, useCache, onUsersLoaded, onError]);

  // Fonction pour charger les statuts des utilisateurs
  const loadStatuses = useCallback(async () => {
    if (!userIds || !userIds.length || !services || !includeStatus) return;

    assertServiceInitialized(services.mattermostService, "mattermostService");

    setLoadingStatus(true);
    setStatusError(null);

    try {
      const statusesMap: Record<string, UserStatus> = {};

      // Charger les statuts par lots pour éviter de surcharger l'API
      // Diviser les IDs utilisateurs en lots de taille statusBatchSize
      const batchCount = Math.ceil(userIds.length / statusBatchSize);

      for (let i = 0; i < batchCount; i++) {
        const batchIds = userIds.slice(
          i * statusBatchSize,
          (i + 1) * statusBatchSize,
        );

        // Charger les statuts en parallèle
        const statusPromises = batchIds.map(async (userId) => {
          try {
            return {
              userId,
              status: await services.mattermostService.getUserStatus(userId),
            };
          } catch (error) {
            console.warn(
              `Impossible de charger le statut pour l'utilisateur ${userId}:`,
              error,
            );
            return null;
          }
        });

        const results = await Promise.all(statusPromises);

        // Ajouter les statuts récupérés à la map
        results.forEach((result) => {
          if (result) {
            statusesMap[result.userId] = result.status;
          }
        });

        // Petite pause entre les lots pour éviter de surcharger l'API
        if (i < batchCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      setStatuses(statusesMap);
    } catch (err) {
      console.error(
        `Erreur lors du chargement des statuts des utilisateurs:`,
        err,
      );
      setStatusError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingStatus(false);
    }
  }, [userIds, services, includeStatus, statusBatchSize]);

  // Fonction pour obtenir un utilisateur par son ID
  const getUserById = useCallback(
    (userId: string): User | null => {
      return users[userId] || null;
    },
    [users],
  );

  // Fonction pour obtenir le statut d'un utilisateur par son ID
  const getUserStatus = useCallback(
    (userId: string): UserStatus | null => {
      return statuses[userId] || null;
    },
    [statuses],
  );

  // Fonction pour filtrer les utilisateurs par leur statut
  const filterUsersByStatus = useCallback(
    (status: string): User[] => {
      if (!includeStatus) return [];

      return usersList.filter(
        (user) => statuses[user.id] && statuses[user.id].status === status,
      );
    },
    [usersList, statuses, includeStatus],
  );

  // Charger les utilisateurs quand les IDs changent
  useEffect(() => {
    if (userIds && userIds.length > 0) {
      void loadUsers();
    } else {
      setUsers({});
      setError(null);
    }
  }, [userIds, loadUsers]);

  // Charger les statuts quand les utilisateurs changent ou quand includeStatus change
  useEffect(() => {
    if (
      userIds &&
      userIds.length > 0 &&
      includeStatus &&
      Object.keys(users).length > 0
    ) {
      void loadStatuses();
    } else if (!includeStatus) {
      setStatuses({});
      setStatusError(null);
    }
  }, [userIds, users, includeStatus, loadStatuses]);

  // Calculer les statistiques par statut
  const statusStats = useMemo(() => {
    if (!includeStatus) {
      return {
        onlineCount: 0,
        awayCount: 0,
        dndCount: 0,
        offlineCount: 0,
      };
    }

    let onlineCount = 0;
    let awayCount = 0;
    let dndCount = 0;
    let offlineCount = 0;

    Object.values(statuses).forEach((status) => {
      switch (status.status) {
        case "online":
          onlineCount++;
          break;
        case "away":
          awayCount++;
          break;
        case "dnd":
          dndCount++;
          break;
        case "offline":
          offlineCount++;
          break;
      }
    });

    return {
      onlineCount,
      awayCount,
      dndCount,
      offlineCount,
    };
  }, [statuses, includeStatus]);

  // Retourner l'état et les fonctions
  return {
    users: usersList,
    loading,
    error,
    statuses,
    loadingStatus,
    statusError,
    ...statusStats,
    loadUsers,
    loadStatuses,
    getUserById,
    getUserStatus,
    filterUsersByStatus,
  };
}

export default { useUser, useUsers };
