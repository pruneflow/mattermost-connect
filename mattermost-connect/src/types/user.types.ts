/**
 * User related type definitions
 */
import { Entity, CommonState, PaginationParams } from "./common";
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
  is_bot?: boolean;
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
 * User profile update parameters
 */
export interface UserProfileUpdate {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  position?: string;
  locale?: string;
  props?: Record<string, unknown>;
}

/**
 * User search parameters
 */
export interface UserSearchParams extends PaginationParams {
  term: string;
  inTeam?: string;
  inChannel?: string;
  notInChannel?: string;
  notInTeam?: string;
  withoutTeam?: boolean;
  sort?: string;
  roles?: string[];
  inactive?: boolean;
}

/**
 * Options for fetching users
 */
export interface GetUsersOptions {
  userIds?: string[];
  inChannel?: string;
  inTeam?: string;
  withProfiles?: boolean;
  withStatuses?: boolean;
}

/**
 * Typing indicator information
 */
export interface TypingInfo {
  userId: string;
  channelId: string;
  timestamp: number;
  parentId?: string; // For thread typing
}

/**
 * User notification settings
 */
export interface UserNotificationSettings {
  email: "all" | "mention" | "none";
  desktop: "all" | "mention" | "none";
  desktop_sound: boolean;
  push: "all" | "mention" | "none";
  mark_unread: "all" | "mention";
}

/**
 * User profile display options
 */
export interface UserProfileDisplay {
  name_format: "full_name" | "nickname_full_name" | "username";
  show_status: boolean;
  show_email: boolean;
}

/**
 * User state - core structure for userStore
 * Now extends CommonState for standardized state management
 */
export interface UserState extends CommonState {
  byId: Record<string, User>;
  statusByUserId: Record<string, UserStatus>;
  typingUsers: Record<string, Record<string, number>>;
  isInitialized: boolean;
}

export interface UserStore {
  // Actions - User Data
  setUser: (user: User) => void;
  setUsers: (users: User[]) => void;
  updateUser: (user: Partial<User> & { id: string }) => void;
  removeUser: (userId: string) => void;

  // Actions - User Status
  setUserStatus: (userId: string, status: UserStatus) => void;
  setUserStatuses: (
    statuses: UserStatusInfo[] | Record<string, UserStatus>,
  ) => void;

  // Actions - Typing Indicators
  setTyping: (channelId: string, userId: string) => void;
  clearTyping: (channelId: string, userId: string) => void;
  cleanupExpiredTyping: () => void;

  // Selectors
  getUserById: (userId: string) => User | null;
  getUserStatus: (userId: string) => UserStatus;
  getUserDisplayName: (userId: string) => string;
  getUsersByIds: (userIds: string[]) => User[];
  getTypingUsers: (channelId: string) => string[];
  getUsersWithStatus: (userIds: string[]) => Array<{
    user: User;
    status: UserStatus;
    displayName: string;
  }>;
  isPendingUser: (userId: string) => boolean;

  // Reset
  reset: () => void;
}
