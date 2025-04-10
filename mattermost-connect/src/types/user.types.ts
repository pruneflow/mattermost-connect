// src/types/user.types.ts
/**
 * Types for Mattermost users
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  roles?: string;
  props?: Record<string, unknown>;
  last_picture_update?: number;
}

export interface UserStatus {
  user_id: string;
  status: "online" | "away" | "dnd" | "offline";
  last_activity_at?: number;
  manual?: boolean;
}
