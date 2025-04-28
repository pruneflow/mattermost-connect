// types/user.types.ts
/**
 * Types for user-related data and functions
 */

import { User } from "./auth.types";

/**
 * User online status options
 */
export type UserStatus = "online" | "away" | "dnd" | "offline";

/**
 * User status information
 */
export interface UserStatusInfo {
  user_id: string;
  status: UserStatus;
  custom_status?: string;
  last_activity_at?: number;
}

/**
 * State for the user store
 */
export interface UserState {
  byId: Record<string, User>;
  statusByUserId: Record<string, UserStatus>;
  typingUsers: Record<string, string[]>;
  loadingUserIds: string[];
  lastFetchTimes: Record<string, number>;
}

/**
 * Options for fetching users
 */
export interface GetUsersOptions {
  userIds?: string[];
  inChannel?: string;
  inTeam?: string;
  searchTerm?: string;
}

/**
 * User with status for display purposes
 */
export interface UserWithStatus {
  user: User;
  status: UserStatus;
  displayName: string;
  isTyping?: boolean;
}

/**
 * Typing indicator entry
 */
export interface TypingInfo {
  userId: string;
  channelId: string;
  timestamp: number;
}
