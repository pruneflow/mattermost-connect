// src/hooks/useUsers.ts
/**
 * Hook pour la gestion des utilisateurs
 */
import { useCallback } from "react";
import { useStoreSelector } from "./useStoreSelector";
import { useStoreDispatch } from "./useStoreDispatch";
import { getServices } from "../core/services";
import {
  getUser as getUserAction,
  getUsers as getUsersAction,
  getUserStatus as getUserStatusAction,
} from "../core/store/thunks/users.thunks";

export interface UseUsersReturnType {
  // État
  usersById: Record<string, User>;
  loadingStates: Record<string, boolean>;
  onlineStatus: Record<string, "online" | "away" | "dnd" | "offline">;

  // Actions
  getUser: (userId: string) => Promise<User | null>;
  getUsers: (options: {
    userIds?: string[];
    inChannel?: string;
    inTeam?: string;
  }) => Promise<User[]>;
  getUserStatus: (
    userId: string,
  ) => Promise<"online" | "away" | "dnd" | "offline">;

  // Utilitaires
  getUserDisplayName: (userId: string) => string;
  formatUserName: (user: User | null | undefined) => string;
}

export function useUsers(): UseUsersReturnType {
  const dispatch = useStoreDispatch();
  const { apiClient } = getServices();

  // Sélectionner les données utilisateurs du store
  const usersState = useStoreSelector((state) => state.users);

  // Action pour récupérer un utilisateur
  const getUser = useCallback(
    async (userId: string) => {
      return dispatch(getUserAction(apiClient, userId));
    },
    [dispatch, apiClient],
  );

  // Action pour récupérer plusieurs utilisateurs
  const getUsers = useCallback(
    async (options: {
      userIds?: string[];
      inChannel?: string;
      inTeam?: string;
    }) => {
      return dispatch(getUsersAction(apiClient, options));
    },
    [dispatch, apiClient],
  );

  // Action pour récupérer le statut d'un utilisateur
  const getUserStatus = useCallback(
    async (userId: string) => {
      return dispatch(getUserStatusAction(apiClient, userId));
    },
    [dispatch, apiClient],
  );

  // Utilitaire pour formater le nom d'affichage d'un utilisateur
  const formatUserName = useCallback(
    (user: User | null | undefined): string => {
      if (!user) return "Unknown User";

      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      } else {
        return user.nickname || user.username || "User";
      }
    },
    [],
  );

  // Utilitaire pour obtenir le nom d'affichage d'un utilisateur par ID
  const getUserDisplayName = useCallback(
    (userId: string): string => {
      const user = usersState.byId[userId];

      if (!user) {
        // Charger l'utilisateur en arrière-plan
        void getUser(userId);
        return "Loading...";
      }

      return formatUserName(user);
    },
    [usersState.byId, getUser, formatUserName],
  );

  return {
    // État
    usersById: usersState.byId,
    loadingStates: usersState.loadingStates,
    onlineStatus: usersState.onlineStatus,

    // Actions
    getUser,
    getUsers,
    getUserStatus,

    // Utilitaires
    getUserDisplayName,
    formatUserName,
  };
}
