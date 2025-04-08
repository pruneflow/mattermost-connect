// src/types/team.types.ts
/**
 * Types for Mattermost teams
 */

export interface Team {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type?: "O" | "I";
  invite_id?: string;
  member_count?: number;
}
