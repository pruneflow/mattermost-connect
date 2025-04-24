// src/core/store/thunks/teams.thunks.ts
import { ApiClient } from "../../api/client";
import { CacheService } from "../../services/cache.service";
import { Dispatch } from "../store";
import { Team } from "../slices/teams.slice";

/**
 * Charge la liste des équipes
 */
export const getTeams =
  (
    apiClient: ApiClient,
    cacheService: CacheService,
    options: { forceRefresh?: boolean } = {},
  ) =>
  async (dispatch: Dispatch) => {
    dispatch({ type: "TEAMS_FETCH_REQUEST" });

    try {
      // Vérifier le cache
      const cacheKey = "teams";
      if (!options.forceRefresh) {
        const cachedTeams = cacheService.get(cacheKey) as Team[] | undefined;
        if (cachedTeams) {
          dispatch({
            type: "TEAMS_FETCH_SUCCESS",
            payload: { teams: cachedTeams },
          });
          return cachedTeams;
        }
      }

      // Appel API
      const response = await apiClient.get<Team[]>("users/me/teams");
      const teams = response.data;

      // Mettre à jour le cache
      cacheService.set(cacheKey, teams);

      // Dispatch du succès
      dispatch({
        type: "TEAMS_FETCH_SUCCESS",
        payload: { teams },
      });

      return teams;
    } catch (error) {
      dispatch({
        type: "TEAMS_FETCH_ERROR",
        payload: { error },
      });
      return [];
    }
  };

/**
 * Sélectionne une équipe active
 */
export const selectTeam =
  (team: Team | null, apiClient: ApiClient) => async (dispatch: Dispatch) => {
    dispatch({
      type: "TEAMS_SET_ACTIVE",
      payload: { team },
    });

    return team;
  };
