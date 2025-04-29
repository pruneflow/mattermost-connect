/**
 * Team related type definitions
 */
import { Entity, PaginationParams } from "./common";

/**
 * Team types
 */
export type TeamType = "O" | "I"; // O = Open, I = Invite Only

/**
 * Team interface representing a Mattermost team
 */
export interface Team extends Entity {
  name: string;
  display_name: string;
  description?: string;
  type: TeamType;
  company_name?: string;
  allowed_domains?: string;
  invite_id?: string;
  allow_open_invite?: boolean;
  scheme_id?: string;
  group_constrained?: boolean;
  email?: string;
}

/**
 * Formatted team interface for UI display
 */
export interface FormattedTeam {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: TeamType;
  isOpen: boolean;
  memberCount: number | null;
  url: string;
}

/**
 * Team statistics
 */
export interface TeamStats {
  team_id: string;
  total_member_count: number;
  active_member_count: number;
}

/**
 * Team member information
 */
export interface TeamMember {
  team_id: string;
  user_id: string;
  roles: string;
  scheme_admin?: boolean;
  scheme_user?: boolean;
  mention_count?: number;
  msg_count?: number;
}

/**
 * Team member with user information
 */
export interface TeamMemberWithUser extends TeamMember {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Team creation parameters
 */
export interface CreateTeamParams {
  name: string;
  display_name: string;
  type: TeamType;
  description?: string;
  allowed_domains?: string;
  company_name?: string;
}

/**
 * Team update parameters
 */
export interface UpdateTeamParams {
  display_name?: string;
  description?: string;
  company_name?: string;
  allowed_domains?: string;
  invite_id?: string;
  allow_open_invite?: boolean;
}

/**
 * Team search parameters
 */
export interface TeamSearchParams extends PaginationParams {
  term: string;
  exclude_default_channels?: boolean;
}

/**
 * Team invitation info
 */
export interface TeamInviteInfo {
  teamId: string;
  teamName: string;
  displayName: string;
  inviteId: string;
  isValid: boolean;
}

/**
 * Team state
 */
export interface TeamState {
  teams: Team[];
  activeTeam: Team | null;
  teamStats: Record<string, TeamStats>;
  teamMembers: Record<string, TeamMember[]>;
  lastFetchTimes: Record<string, number>;
}
