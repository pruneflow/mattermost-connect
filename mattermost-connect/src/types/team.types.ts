// types/team.types.ts
/**
 * Types for team-related data and functions
 */

/**
 * Team interface representing a Mattermost team
 */
export interface Team {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type?: "O" | "I"; // O = Open, I = Invite Only
  invite_id?: string;
  create_at: string;
  update_at?: string;
  delete_at?: number;
  member_count?: number;
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
}

/**
 * State for team store
 */
export interface TeamState {
  teams: Team[];
  activeTeam: Team | null;
  teamStats: Record<string, TeamStats>;
  teamMembers: Record<string, TeamMember[]>;
  lastFetchTimes: Record<string, number>;
}

/**
 * Team creation parameters
 */
export interface CreateTeamParams {
  name: string;
  display_name: string;
  type: "O" | "I";
  description?: string;
}

/**
 * Team update parameters
 */
export interface UpdateTeamParams {
  teamId: string;
  data: Partial<{
    display_name: string;
    description: string;
    company_name: string;
    allowed_domains: string;
    invite_id: string;
    allow_open_invite: boolean;
  }>;
}
