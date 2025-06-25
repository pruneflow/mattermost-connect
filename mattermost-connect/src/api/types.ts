// Import types directly from @mattermost/types (same as Client4)
import type { UserProfile } from '@mattermost/types/users';

export type {
  UserProfile as User,
  UserProfile,
  UserStatus
} from '@mattermost/types/users';

export type {
  Team,
  TeamMembership as TeamMember,
  TeamStats
} from '@mattermost/types/teams';

export type {
  PreferenceType
} from '@mattermost/types/preferences';

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

// WebSocket event types
export interface WebSocketEvent {
  event: string;
  data: Record<string, any>;
  broadcast?: {
    channel_id?: string;
    team_id?: string;
    user_id?: string;
    omit_users?: string[] | null;
  };
  seq?: number;
}

// WebSocket message types
export interface WebSocketMessage {
  action: string;
  seq: number;
  data: Record<string, any>;
}

// Common WebSocket events
export type WebSocketEventType = 
  | 'typing'
  | 'posted'
  | 'channel_updated'
  | 'channel_viewed'
  | 'channel_created'
  | 'channel_deleted'
  | 'user_added'
  | 'user_removed'
  | 'user_updated'
  | 'status_change'
  | 'hello'
  | 'authentication_challenge';

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

// Channel Categories - Use official Mattermost types
export type {
  ChannelCategory,
  CategorySorting
} from '@mattermost/types/channel_categories';

// Import for local use
import type { ChannelCategory } from '@mattermost/types/channel_categories';

export interface ChannelCategoriesResponse {
  categories: ChannelCategory[];
  order: string[]; // Category IDs in display order
}