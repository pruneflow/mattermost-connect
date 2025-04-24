// src/core/store/thunks/users.thunks.ts
import { ApiClient } from "../../api/client";
import { Dispatch } from "../store";
import { User } from "../../services/auth.service";

/**
 * Charge un utilisateur par son ID
 */
export const getUser =
  (apiClient: ApiClient, userId: string) => async (dispatch: Dispatch) => {
    if (!userId) return null;

    dispatch({
      type: "USER_FETCH_REQUEST",
      payload: { userId },
    });

    try {
      const response = await apiClient.get<User>(`users/${userId}`);
      const user = response.data;

      dispatch({
        type: "USER_FETCH_SUCCESS",
        payload: { user },
      });

      return user;
    } catch (error) {
      dispatch({
        type: "USER_FETCH_ERROR",
        payload: { userId, error },
      });
      return null;
    }
  };

/**
 * Charge plusieurs utilisateurs selon différents critères
 */
export const getUsers =
  (
    apiClient: ApiClient,
    options: { userIds?: string[]; inChannel?: string; inTeam?: string },
  ) =>
  async (dispatch: Dispatch) => {
    dispatch({
      type: "USERS_FETCH_REQUEST",
      payload: options,
    });

    try {
      // Construire l'URL en fonction des options
      let endpoint = "users";
      const queryParams: string[] = [];

      if (options.userIds && options.userIds.length > 0) {
        options.userIds.forEach((id) => {
          queryParams.push(`id=${encodeURIComponent(id)}`);
        });
      }

      if (options.inChannel) {
        queryParams.push(`in_channel=${encodeURIComponent(options.inChannel)}`);
      }

      if (options.inTeam) {
        queryParams.push(`in_team=${encodeURIComponent(options.inTeam)}`);
      }

      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join("&")}`;
      }

      // Appel API
      const response = await apiClient.get<User[]>(endpoint);
      const users = response.data;

      dispatch({
        type: "USERS_FETCH_SUCCESS",
        payload: { users },
      });

      return users;
    } catch (error) {
      dispatch({
        type: "USERS_FETCH_ERROR",
        payload: { error },
      });
      return [];
    }
  };

/**
 * Récupère le statut d'un utilisateur
 */
export const getUserStatus =
  (apiClient: ApiClient, userId: string) => async (dispatch: Dispatch) => {
    if (!userId) return "offline";

    try {
      const response = await apiClient.get(`users/${userId}/status`);
      const status = response.data.status;

      dispatch({
        type: "USER_STATUS_FETCH_SUCCESS",
        payload: { userId, status },
      });

      return status;
    } catch (error) {
      console.error(`Error fetching status for user ${userId}:`, error);
      return "offline";
    }
  };
