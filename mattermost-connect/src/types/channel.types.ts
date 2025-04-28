// types/channel.types.ts
/**
 * Types for channel-related data and functions
 */

/**
 * Channel interface representing a Mattermost channel
 */
export interface Channel {
  id: string;
  team_id: string;
  name: string;
  display_name: string;
  type: "O" | "P" | "D" | "G"; // O = Public, P = Private, D = Direct Message, G = Group Message
  header?: string;
  purpose?: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  total_msg_count?: number;
  last_post_at?: number;
  is_favorite?: boolean;
}

/**
 * Channel member information
 */
export interface ChannelMember {
  channel_id: string;
  user_id: string;
  roles: string;
  last_viewed_at: number;
  msg_count: number;
  mention_count: number;
  scheme_admin?: boolean;
  scheme_user?: boolean;
}

/**
 * Channel grouping types for organization
 */
export type ChannelGroupType =
  | "public"
  | "private"
  | "direct"
  | "group"
  | "favorite";

/**
 * Channel creation parameters
 */
export interface CreateChannelParams {
  team_id: string;
  name: string;
  display_name: string;
  type: "O" | "P"; // Only public or private channels can be created directly
  purpose?: string;
  header?: string;
}

/**
 * State for channel store
 */
export interface ChannelState {
  channelsByTeam: Record<string, Channel[]>;
  activeChannel: Channel | null;
  members: Record<string, ChannelMember[]>;
  lastFetchTimes: Record<string, number>;
}

/**
 * Channel update parameters
 */
export interface UpdateChannelParams {
  channelId: string;
  data: Partial<{
    name: string;
    display_name: string;
    purpose: string;
    header: string;
  }>;
}

/**
 * Direct channel information
 */
export interface DirectChannelInfo {
  isDirect: boolean;
  isGroup: boolean;
  displayName: string;
  userIds: string[];
  otherUserId?: string | null;
  userImageUrl?: string;
  userStatus?: string;
  groupAvatarUrls?: string[];
}
