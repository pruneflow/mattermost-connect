// src/core/store/selectors/teams.selectors.ts
/**
 * Sélecteurs pour l'état des équipes
 */

import { createSelector, createParameterizedSelector } from "../selector-utils";
import { RootState } from "../store.config";
import { Team } from "../../types/teams.types";

/**
 * Sélectionne l'état complet des équipes
 */
export const selectTeamsState = (state: RootState) => state.teams;

/**
 * Sélectionne la liste des équipes
 */
export const selectAllTeams = createSelector(
  selectTeamsState,
  (teamsState) => teamsState.teams,
);

/**
 * Sélectionne l'équipe active
 */
export const selectActiveTeam = createSelector(
  selectTeamsState,
  (teamsState) => teamsState.activeTeam,
);

/**
 * Sélectionne l'ID de l'équipe active
 */
export const selectActiveTeamId = createSelector(
  selectActiveTeam,
  (activeTeam) => activeTeam?.id || null,
);

/**
 * Sélectionne l'indicateur de chargement des équipes
 */
export const selectTeamsLoading = createSelector(
  selectTeamsState,
  (teamsState) => teamsState.isLoading,
);

/**
 * Sélectionne l'erreur de chargement des équipes
 */
export const selectTeamsError = createSelector(
  selectTeamsState,
  (teamsState) => teamsState.error,
);

/**
 * Sélectionne le timestamp du dernier chargement des équipes
 */
export const selectTeamsLastFetchTime = createSelector(
  selectTeamsState,
  (teamsState) => teamsState.lastFetchTime,
);

/**
 * Sélectionne les compteurs non lus pour toutes les équipes
 */
export const selectTeamsUnreadCounts = createSelector(
  selectTeamsState,
  (teamsState) => teamsState.unreadCounts,
);

/**
 * Crée un sélecteur pour obtenir les compteurs non lus d'une équipe spécifique
 */
export const makeSelectTeamUnreadCount = createParameterizedSelector(
  (teamId: string) =>
    createSelector(
      selectTeamsUnreadCounts,
      (unreadCounts) =>
        unreadCounts[teamId] || { messageCount: 0, mentionCount: 0 },
    ),
);

/**
 * Crée un sélecteur pour obtenir une équipe par son ID
 */
export const makeSelectTeamById = createParameterizedSelector(
  (teamId: string) =>
    createSelector(
      selectAllTeams,
      (teams): Team | null => teams.find((team) => team.id === teamId) || null,
    ),
);

/**
 * Sélectionne les équipes triées par nom
 */
export const selectTeamsSortedByName = createSelector(selectAllTeams, (teams) =>
  [...teams].sort((a, b) => a.display_name.localeCompare(b.display_name)),
);

/**
 * Sélectionne l'état des équipes pour le hook useTeams
 */
export const selectTeamsStateForHook = createSelector(
  selectAllTeams,
  selectActiveTeam,
  selectTeamsLoading,
  selectTeamsError,
  (teams, activeTeam, isLoading, error) => ({
    teams,
    activeTeam,
    isLoading,
    error,
  }),
);
