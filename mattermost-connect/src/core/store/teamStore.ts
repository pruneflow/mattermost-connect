// src/core/store/teamStore.ts
import { create } from "zustand";

export interface Team {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type?: "O" | "I";
  invite_id?: string;
  create_at: string;
  update_at?: string;
  delete_at?: number;
  member_count?: number;
}

export interface TeamState {
  // State
  teams: Team[];
  activeTeam: Team | null;
  isLoading: boolean;
  error: Error | null;
  lastFetchTime: number;

  // Actions
  setTeams: (teams: Team[]) => void;
  setActiveTeam: (team: Team | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  getTeamById: (teamId: string | null | undefined) => Team | null;
  reset: () => void;
}

export const useTeamStore = create<TeamState>()((set, get) => ({
  // Initial state
  teams: [],
  activeTeam: null,
  isLoading: false,
  error: null,
  lastFetchTime: 0,

  setTeams: (teams: Team[]) => {
    set({
      teams,
      lastFetchTime: Date.now(),
      isLoading: false,
      error: null,
    });

    // If no active team is set but teams are available, set the first team as active
    const state = get();
    if (!state.activeTeam && teams.length > 0) {
      set({ activeTeam: teams[0] });
    }
  },

  setActiveTeam: (team: Team | null) => {
    set({ activeTeam: team });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: Error | null) => {
    set({ error, isLoading: false });
  },

  getTeamById: (teamId: string | null | undefined): Team | null => {
    if (!teamId) return null;
    return get().teams.find((team) => team.id === teamId) || null;
  },

  reset: () => {
    set({
      teams: [],
      activeTeam: null,
      isLoading: false,
      error: null,
      lastFetchTime: 0,
    });
  },
}));
