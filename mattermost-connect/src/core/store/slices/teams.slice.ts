// src/core/store/slices/teams.slice.ts
/**
 * Slice pour la gestion des équipes
 */
import { createReducer, createAction } from "../store";

export interface Team {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type?: "O" | "I";
  invite_id?: string;
  member_count?: number;
}

export interface TeamUnreadCount {
  messageCount: number;
  mentionCount: number;
}

export interface TeamsState {
  teams: Team[];
  activeTeam: Team | null;
  isLoading: boolean;
  error: Error | null;
  lastFetchTime: number;
  unreadCounts: Record<string, TeamUnreadCount>;
}

// État initial
const initialState: TeamsState = {
  teams: [],
  activeTeam: null,
  isLoading: false,
  error: null,
  lastFetchTime: 0,
  unreadCounts: {},
};

// Actions
export const fetchTeams = createAction("TEAMS_FETCH_REQUEST");
export const fetchTeamsSuccess = createAction<{ teams: Team[] }>(
  "TEAMS_FETCH_SUCCESS",
);
export const fetchTeamsError = createAction<{ error: Error }>(
  "TEAMS_FETCH_ERROR",
);
export const setActiveTeam = createAction<{ team: Team | null }>(
  "TEAMS_SET_ACTIVE",
);
export const setTeamUnreadCount = createAction<{
  teamId: string;
  messageCount: number;
  mentionCount: number;
}>("TEAMS_SET_UNREAD_COUNT");

// Reducer
export const teamsReducer = createReducer<TeamsState>(initialState, {
  [fetchTeams.type]: (state) => ({
    ...state,
    isLoading: true,
    error: null,
  }),

  [fetchTeamsSuccess.type]: (state, payload) => ({
    ...state,
    teams: payload.teams,
    isLoading: false,
    error: null,
    lastFetchTime: Date.now(),
  }),

  [fetchTeamsError.type]: (state, payload) => ({
    ...state,
    isLoading: false,
    error: payload.error,
  }),

  [setActiveTeam.type]: (state, payload) => ({
    ...state,
    activeTeam: payload.team,
  }),

  [setTeamUnreadCount.type]: (state, payload) => ({
    ...state,
    unreadCounts: {
      ...state.unreadCounts,
      [payload.teamId]: {
        messageCount: payload.messageCount,
        mentionCount: payload.mentionCount,
      },
    },
  }),

  // Réinitialiser l'état lors de la déconnexion
  AUTH_LOGOUT: () => ({
    ...initialState,
  }),
});
