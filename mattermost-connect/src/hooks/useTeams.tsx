// src/hooks/useTeams.ts
/**
 * Hook pour la gestion des équipes
 */
import { useCallback } from "react";
import { useStoreSelector } from "./useStoreSelector";
import { useStoreDispatch } from "./useStoreDispatch";
import { getServices } from "../core/services";
import { getTeams, selectTeam } from "../core/store/thunks/teams.thunks";
import { Team } from "../core/store/slices/teams.slice";

interface UseTeamsReturnType {
  teams: Team[];
  activeTeam: Team | null;
  isLoading: boolean;
  error: Error | null;
  loadTeams: (forceRefresh?: boolean) => Promise<Team[]>;
  selectTeam: (team: Team | null) => Promise<Team | null>;
  getTeamUnreadCount: (teamId: string) => {
    messageCount: number;
    mentionCount: number;
  };
}

export function useTeams(): UseTeamsReturnType {
  const dispatch = useStoreDispatch();
  const { apiClient, cacheService } = getServices();

  // Sélectionner les données d'équipes du store
  const teamsState = useStoreSelector((state) => state.teams);

  // Action pour charger les équipes
  const loadTeams = useCallback(
    async (forceRefresh: boolean = false) => {
      return dispatch(getTeams(apiClient, cacheService, { forceRefresh }));
    },
    [dispatch, apiClient, cacheService],
  );

  // Action pour sélectionner une équipe
  const selectTeamAction = useCallback(
    async (team: Team | null) => {
      return dispatch(selectTeam(team, apiClient));
    },
    [dispatch, apiClient],
  );

  // Fonction pour obtenir les compteurs non lus d'une équipe
  const getTeamUnreadCount = useCallback(
    (teamId: string) => {
      return (
        teamsState.unreadCounts[teamId] || { messageCount: 0, mentionCount: 0 }
      );
    },
    [teamsState.unreadCounts],
  );

  return {
    teams: teamsState.teams,
    activeTeam: teamsState.activeTeam,
    isLoading: teamsState.isLoading,
    error: teamsState.error,
    loadTeams,
    selectTeam: selectTeamAction,
    getTeamUnreadCount,
  };
}
