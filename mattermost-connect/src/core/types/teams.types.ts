// src/core/types/teams.types.ts
/**
 * Types liés aux équipes
 */

import { NormalizedState } from "./common.types";

/**
 * Représente une équipe Mattermost
 */
export interface Team {
  /** Identifiant unique de l'équipe */
  id: string;

  /** Nom technique de l'équipe (utilisé pour les URLs) */
  name: string;

  /** Nom d'affichage de l'équipe */
  display_name: string;

  /** Description de l'équipe */
  description?: string;

  /** Type d'équipe: O (ouverte) ou I (invitation seulement) */
  type?: "O" | "I";

  /** ID d'invitation pour rejoindre l'équipe */
  invite_id?: string;

  /** Nombre de membres dans l'équipe */
  member_count?: number;
}

/**
 * Compteurs de messages non lus pour une équipe
 */
export interface TeamUnreadCount {
  /** Nombre total de messages non lus */
  messageCount: number;

  /** Nombre de mentions non lues */
  mentionCount: number;
}

/**
 * État normalisé des équipes
 */
export interface NormalizedTeamsState extends NormalizedState<Team> {
  /** ID de l'équipe active */
  activeTeamId: string | null;
}

/**
 * État des équipes dans le store
 */
export interface TeamsState {
  /** Liste des équipes */
  teams: Team[];

  /** Équipe active sélectionnée */
  activeTeam: Team | null;

  /** Indicateur de chargement */
  isLoading: boolean;

  /** Erreur de chargement le cas échéant */
  error: Error | null;

  /** Timestamp du dernier chargement des équipes */
  lastFetchTime: number;

  /** Compteurs de messages non lus par équipe */
  unreadCounts: Record<string, TeamUnreadCount>;
}

/**
 * Interface de retour pour le hook useTeams
 */
export interface UseTeamsReturnType {
  /** Liste des équipes disponibles */
  teams: Team[];

  /** Équipe active actuellement sélectionnée */
  activeTeam: Team | null;

  /** Indicateur de chargement des équipes */
  isLoading: boolean;

  /** Erreur de chargement le cas échéant */
  error: Error | null;

  /** Fonction pour charger les équipes */
  loadTeams: (forceRefresh?: boolean) => Promise<Team[]>;

  /** Fonction pour sélectionner une équipe */
  selectTeam: (team: Team | null) => Promise<Team | null>;

  /** Fonction pour obtenir les compteurs non lus d'une équipe */
  getTeamUnreadCount: (teamId: string) => TeamUnreadCount;
}
