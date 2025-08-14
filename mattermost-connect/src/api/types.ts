/**
 * Type definitions for the Mattermost Connect library
 * Re-exports official Mattermost types and adds custom extensions
 */
import type { UserProfile } from '@mattermost/types/users';

export type {
  UserProfile as User,
  UserProfile,
  UserStatus,
  UserTimezone
} from '@mattermost/types/users';

export type {
  FileInfo
} from "@mattermost/types/files"

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

import type { Channel } from '@mattermost/types/channels'

export type {
  Channel,
  ChannelMembership as ChannelMember
} from '@mattermost/types/channels';

// Extended channel type with enriched data
export interface EnrichedChannel extends Channel {
  hasUnreads: boolean;
  unreadCount: number;
  mentionCount: number;
  isMuted: boolean;
  computedDisplayName?: string;
  otherUser?: UserProfile | null;
  otherUserId?: string;
  users?: UserProfile[];
  userIds?: string[];
}

export type { PostOrderBlock } from '@mattermost/types/posts'

export type {
  Post,
  PostList,
  PaginatedPostList,
  PostType
} from '@mattermost/types/posts';

export type {
  Reaction
} from '@mattermost/types/reactions';

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

export const PostRequestTypes = {
  BEFORE_ID: 'BEFORE_ID' as const,
  AFTER_ID: 'AFTER_ID' as const,
};

/**
 * ActionResult should be the return value of most Thunk action creators.
 */
export type ActionResult<Data = any, Error = any> = {
  data?: Data;
  error?: Error;
};

export interface LoadPostsReturnValue {
  error?: string;
  moreToLoad: boolean;
}

export type CanLoadMorePosts = typeof PostRequestTypes[keyof typeof PostRequestTypes] | undefined

export interface LoadPostsParameters {
  channelId: string;
  postId: string;
  type: CanLoadMorePosts;
}