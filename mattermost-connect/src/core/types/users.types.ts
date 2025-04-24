// src/core/types/users.types.ts
/**
 * Types liés aux utilisateurs
 */

/**
 * Profil utilisateur
 */
export interface User {
  /** Identifiant unique de l'utilisateur */
  id: string;

  /** Nom d'utilisateur */
  username: string;

  /** Adresse email */
  email?: string;

  /** Prénom */
  first_name?: string;

  /** Nom de famille */
  last_name?: string;

  /** Surnom / Pseudo */
  nickname?: string;

  /** Rôles de l'utilisateur (séparés par des espaces) */
  roles?: string;

  /** Propriétés personnalisées de l'utilisateur */
  props?: Record<string, unknown>;

  /** Timestamp de la dernière mise à jour de l'avatar */
  last_picture_update?: number;

  /** Timestamp de la dernière mise à jour du profil */
  update_at: number;
}

/**
 * Statut de présence d'un utilisateur
 */
export type UserStatus = "online" | "away" | "dnd" | "offline";

/**
 * Information de statut utilisateur
 */
export interface UserStatusInfo {
  /** ID de l'utilisateur */
  user_id: string;

  /** Statut actuel */
  status: UserStatus;

  /** Message de statut personnalisé */
  custom_status?: string;

  /** Timestamp de la dernière activité */
  last_activity_at?: number;
}

/**
 * État des utilisateurs dans le store
 */
export interface UsersState {
  /** Utilisateurs par ID */
  byId: Record<string, User>;

  /** État de chargement par ID */
  loadingStates: Record<string, boolean>;

  /** Erreurs par ID */
  errors: Record<string, Error | null>;

  /** Statuts en ligne des utilisateurs */
  onlineStatus: Record<string, UserStatus>;

  /** Derniers timestamps de chargement par ID */
  lastFetchTimes: Record<string, number>;

  /** Pour les utilisateurs en cours de chargement */
  pendingUserIds: string[];
}

/**
 * Options pour récupérer plusieurs utilisateurs
 */
export interface GetUsersOptions {
  /** Liste d'IDs d'utilisateurs à récupérer */
  userIds?: string[];

  /** ID du canal pour récupérer les membres */
  inChannel?: string;

  /** ID de l'équipe pour récupérer les membres */
  inTeam?: string;
}

/**
 * Format de retour pour les hooks utilisateurs
 */
export interface UseUsersReturnType {
  // État
  usersById: Record<string, User>;
  loadingStates: Record<string, boolean>;
  onlineStatus: Record<string, UserStatus>;

  // Actions
  getUser: (userId: string) => Promise<User | null>;
  getUsers: (options: GetUsersOptions) => Promise<User[]>;
  getUserStatus: (userId: string) => Promise<UserStatus>;

  // Utilitaires
  getUserDisplayName: (userId: string) => string;
  formatUserName: (user: User | null | undefined) => string;
}
