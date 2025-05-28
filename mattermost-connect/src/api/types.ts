// Import types directly from @mattermost/types (same as Client4)
import type { UserProfile } from '@mattermost/types/users';

export type {
  UserProfile as User,
  UserProfile,
  UserStatus
} from '@mattermost/types/users';

export type {
  Team,
  TeamMembership as TeamMember
} from '@mattermost/types/teams';

// Import Team type for use in definitions
import type { Team } from '@mattermost/types/teams';

// Team creation request - partial data for creating new teams
export type TeamCreationRequest = Pick<Team, 'name' | 'display_name' | 'type'> & 
  Partial<Pick<Team, 'description' | 'company_name' | 'allow_open_invite'>>;

export type {
  Channel,
  ChannelMembership as ChannelMember
} from '@mattermost/types/channels';

export type {
  Post
} from '@mattermost/types/posts';

// Auth types - keep our own for compatibility
export interface LoginRequest {
  login_id: string;
  password: string;
}

// Error types - use official Mattermost types  
export type {
  ServerError as APIError,
  ServerError
} from '@mattermost/types/errors';

export interface TeamsUnreadResponse {
  team_id: string;
  msg_count: number;
  mention_count: number;
}

export interface ChannelUnreadResponse {
  team_id: string;
  channel_id: string;
  msg_count: number;
  mention_count: number;
  last_viewed_at: number;
}

// WebSocket Event Types
export interface WebSocketMessage {
  event: string;
  data: Record<string, any>;
  broadcast: {
    omit_users: Record<string, boolean>;
    user_id: string;
    channel_id: string;
    team_id: string;
  };
  seq: number;
}

export interface WSEventPosted {
  channel_display_name: string;
  channel_name: string;
  channel_type: string;
  post: string; // JSON stringified Post
  sender_name: string;
  team_id: string;
}

export interface WSEventChannelViewed {
  channel_id: string;
}

export interface WSEventUserUpdated {
  user: UserProfile;
}

export interface WSEventTyping {
  channel_id: string;
  parent_id: string;
  user_id: string;
}