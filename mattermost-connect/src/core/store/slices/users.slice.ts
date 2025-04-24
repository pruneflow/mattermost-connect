// src/core/store/slices/users.slice.ts
/**
 * Slice pour la gestion des utilisateurs
 */
import { createReducer, createAction } from "../store";
import { User } from "../../services/auth.service";

export interface UsersState {
  // Utilisateurs par ID
  byId: Record<string, User>;
  // État de chargement par ID
  loadingStates: Record<string, boolean>;
  // Erreurs par ID
  errors: Record<string, Error | null>;
  // Statuts en ligne des utilisateurs
  onlineStatus: Record<string, "online" | "away" | "dnd" | "offline">;
  // Derniers timestamps de chargement par ID
  lastFetchTimes: Record<string, number>;
  // Pour les utilisateurs en cours de chargement
  pendingUserIds: string[];
}

// État initial
const initialState: UsersState = {
  byId: {},
  loadingStates: {},
  errors: {},
  onlineStatus: {},
  lastFetchTimes: {},
  pendingUserIds: [],
};

// Actions
export const fetchUser = createAction<{ userId: string }>("USER_FETCH_REQUEST");
export const fetchUserSuccess = createAction<{ user: User }>(
  "USER_FETCH_SUCCESS",
);
export const fetchUserError = createAction<{ userId: string; error: Error }>(
  "USER_FETCH_ERROR",
);

export const fetchUsers = createAction<{
  userIds?: string[];
  inChannel?: string;
  inTeam?: string;
}>("USERS_FETCH_REQUEST");

export const fetchUsersSuccess = createAction<{ users: User[] }>(
  "USERS_FETCH_SUCCESS",
);
export const fetchUsersError = createAction<{ error: Error }>(
  "USERS_FETCH_ERROR",
);

export const fetchUserStatus = createAction<{ userId: string }>(
  "USER_STATUS_FETCH_REQUEST",
);
export const fetchUserStatusSuccess = createAction<{
  userId: string;
  status: "online" | "away" | "dnd" | "offline";
}>("USER_STATUS_FETCH_SUCCESS");

export const setUserStatus = createAction<{
  userId: string;
  status: "online" | "away" | "dnd" | "offline";
}>("USER_STATUS_SET");

// Reducer
export const usersReducer = createReducer<UsersState>(initialState, {
  // Chargement d'un utilisateur
  [fetchUser.type]: (state, payload) => ({
    ...state,
    loadingStates: {
      ...state.loadingStates,
      [payload.userId]: true,
    },
    errors: {
      ...state.errors,
      [payload.userId]: null,
    },
    pendingUserIds: [...state.pendingUserIds, payload.userId],
  }),

  [fetchUserSuccess.type]: (state, payload) => {
    const user = payload.user;

    return {
      ...state,
      byId: {
        ...state.byId,
        [user.id]: user,
      },
      loadingStates: {
        ...state.loadingStates,
        [user.id]: false,
      },
      lastFetchTimes: {
        ...state.lastFetchTimes,
        [user.id]: Date.now(),
      },
      pendingUserIds: state.pendingUserIds.filter((id) => id !== user.id),
    };
  },

  [fetchUserError.type]: (state, payload) => ({
    ...state,
    loadingStates: {
      ...state.loadingStates,
      [payload.userId]: false,
    },
    errors: {
      ...state.errors,
      [payload.userId]: payload.error,
    },
    pendingUserIds: state.pendingUserIds.filter((id) => id !== payload.userId),
  }),

  // Chargement de plusieurs utilisateurs
  [fetchUsers.type]: (state, payload) => {
    // Marquer les utilisateurs comme en cours de chargement
    const newLoadingStates = { ...state.loadingStates };
    const newErrors = { ...state.errors };
    let newPendingUserIds = [...state.pendingUserIds];

    if (payload.userIds) {
      payload.userIds.forEach((userId) => {
        newLoadingStates[userId] = true;
        newErrors[userId] = null;
        if (!newPendingUserIds.includes(userId)) {
          newPendingUserIds.push(userId);
        }
      });
    }

    return {
      ...state,
      loadingStates: newLoadingStates,
      errors: newErrors,
      pendingUserIds: newPendingUserIds,
    };
  },

  [fetchUsersSuccess.type]: (state, payload) => {
    const newById = { ...state.byId };
    const newLoadingStates = { ...state.loadingStates };
    const newLastFetchTimes = { ...state.lastFetchTimes };
    const now = Date.now();

    // Mettre à jour chaque utilisateur
    payload.users.forEach((user) => {
      newById[user.id] = user;
      newLoadingStates[user.id] = false;
      newLastFetchTimes[user.id] = now;
    });

    return {
      ...state,
      byId: newById,
      loadingStates: newLoadingStates,
      lastFetchTimes: newLastFetchTimes,
      pendingUserIds: state.pendingUserIds.filter(
        (id) => !payload.users.some((user) => user.id === id),
      ),
    };
  },

  // Statut des utilisateurs
  [fetchUserStatusSuccess.type]: (state, payload) => ({
    ...state,
    onlineStatus: {
      ...state.onlineStatus,
      [payload.userId]: payload.status,
    },
  }),

  [setUserStatus.type]: (state, payload) => ({
    ...state,
    onlineStatus: {
      ...state.onlineStatus,
      [payload.userId]: payload.status,
    },
  }),

  // Stocker l'utilisateur courant lors de la connexion
  AUTH_LOGIN_SUCCESS: (state, payload) => {
    if (payload.currentUser) {
      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.currentUser.id]: payload.currentUser,
        },
      };
    }
    return state;
  },

  AUTH_VALIDATE_TOKEN_SUCCESS: (state, payload) => {
    if (payload.currentUser) {
      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.currentUser.id]: payload.currentUser,
        },
      };
    }
    return state;
  },

  AUTH_SET_CURRENT_USER: (state, payload) => {
    if (payload.currentUser) {
      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.currentUser.id]: payload.currentUser,
        },
      };
    }
    return state;
  },

  // Réinitialiser l'état lors de la déconnexion
  AUTH_LOGOUT: () => ({
    ...initialState,
  }),
});
