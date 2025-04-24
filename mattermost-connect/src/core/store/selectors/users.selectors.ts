// src/core/store/selectors/users.selectors.ts
/**
 * Sélecteurs pour l'état des utilisateurs
 */

import { createSelector, createParameterizedSelector } from "../selector-utils";
import { RootState } from "../store.config";
import { User, UserStatus } from "../../types/users.types";

/**
 * Sélectionne l'état complet des utilisateurs
 */
export const selectUsersState = (state: RootState) => state.users;

/**
 * Sélectionne tous les utilisateurs par ID
 */
export const selectUsersById = createSelector(
  selectUsersState,
  (usersState) => usersState.byId,
);

/**
 * Sélectionne tous les utilisateurs sous forme de tableau
 */
export const selectAllUsers = createSelector(
  selectUsersById,
  (usersById): User[] => Object.values(usersById),
);

/**
 * Sélectionne les états de chargement des utilisateurs
 */
export const selectUsersLoadingStates = createSelector(
  selectUsersState,
  (usersState) => usersState.loadingStates,
);

/**
 * Sélectionne les erreurs de chargement des utilisateurs
 */
export const selectUsersErrors = createSelector(
  selectUsersState,
  (usersState) => usersState.errors,
);

/**
 * Sélectionne les statuts en ligne des utilisateurs
 */
export const selectUsersOnlineStatus = createSelector(
  selectUsersState,
  (usersState) => usersState.onlineStatus,
);

/**
 * Sélectionne les IDs des utilisateurs en cours de chargement
 */
export const selectPendingUserIds = createSelector(
  selectUsersState,
  (usersState) => usersState.pendingUserIds,
);

/**
 * Crée un sélecteur pour obtenir un utilisateur par son ID
 */
export const makeSelectUserById = createParameterizedSelector(
  (userId: string) =>
    createSelector(
      selectUsersById,
      (usersById): User | null => usersById[userId] || null,
    ),
);

/**
 * Crée un sélecteur pour obtenir plusieurs utilisateurs par leurs IDs
 */
export const makeSelectUsersByIds = createParameterizedSelector(
  (userIds: string[]) =>
    createSelector(
      selectUsersById,
      (usersById): User[] =>
        userIds.map((id) => usersById[id]).filter(Boolean) as User[],
    ),
);

/**
 * Crée un sélecteur pour vérifier si un utilisateur est en cours de chargement
 */
export const makeSelectIsUserLoading = createParameterizedSelector(
  (userId: string) =>
    createSelector(
      selectUsersLoadingStates,
      selectPendingUserIds,
      (loadingStates, pendingUserIds): boolean =>
        loadingStates[userId] || pendingUserIds.includes(userId) || false,
    ),
);

/**
 * Crée un sélecteur pour obtenir le statut en ligne d'un utilisateur
 */
export const makeSelectUserOnlineStatus = createParameterizedSelector(
  (userId: string) =>
    createSelector(
      selectUsersOnlineStatus,
      (onlineStatus): UserStatus => onlineStatus[userId] || "offline",
    ),
);

/**
 * Crée un sélecteur pour obtenir le nom d'affichage formaté d'un utilisateur
 */
export const makeSelectUserDisplayName = createParameterizedSelector(
  (userId: string) =>
    createSelector(selectUsersById, (usersById): string => {
      const user = usersById[userId];

      if (!user) {
        return "Unknown User";
      }

      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      } else {
        return user.nickname || user.username || "User";
      }
    }),
);

/**
 * Sélectionne les utilisateurs triés par nom
 */
export const selectUsersSortedByName = createSelector(
  selectAllUsers,
  (users): User[] => {
    return [...users].sort((a, b) => {
      // D'abord trier par nom complet, puis par nom d'utilisateur
      const aName =
        a.first_name && a.last_name
          ? `${a.first_name} ${a.last_name}`
          : a.username;

      const bName =
        b.first_name && b.last_name
          ? `${b.first_name} ${b.last_name}`
          : b.username;

      return aName.localeCompare(bName);
    });
  },
);

/**
 * Sélectionne l'état pour le hook useUsers
 */
export const selectUsersStateForHook = createSelector(
  selectUsersById,
  selectUsersLoadingStates,
  selectUsersOnlineStatus,
  (usersById, loadingStates, onlineStatus) => ({
    usersById,
    loadingStates,
    onlineStatus,
  }),
);
