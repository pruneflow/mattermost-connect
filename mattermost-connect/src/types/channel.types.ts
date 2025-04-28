/**
 * Channel related type definitions
 */
import { Entity, PaginationParams } from "./common";
import { UserStatus } from "./user.types";

/**
 * Channel types
 */
export type ChannelType = "O" | "P" | "D" | "G";
// O = Public, P = Private, D = Direct Message, G = Group Message

/**
 * Channel base interface
 */
export interface ChannelBase extends Entity {
  team_id: string; // Empty for direct/group channels
  name: string;
  display_name: string;
  type: ChannelType;
  header?: string;
  purpose?: string;
  last_post_at?: number;
  total_msg_count?: number;
  is_favorite?: boolean;
}

/**
 * Public channel interface
 */
export interface PublicChannel extends ChannelBase {
  type: "O";
}

/**
 * Private channel interface
 */
export interface PrivateChannel extends ChannelBase {
  type: "P";
}

/**
 * Direct message channel interface
 */
export interface DirectChannel extends ChannelBase {
  type: "D";
}

/**
 * Group message channel interface
 */
export interface GroupChannel extends ChannelBase {
  type: "G";
}

/**
 * Discriminated union of all channel types
 */
export type Channel =
  | PublicChannel
  | PrivateChannel
  | DirectChannel
  | GroupChannel;

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
  notify_props?: ChannelNotifyProps;
}

/**
 * Channel notification preferences
 */
export interface ChannelNotifyProps {
  desktop: "all" | "mention" | "none";
  mark_unread: "all" | "mention";
  push: "all" | "mention" | "none";
  ignore_channel_mentions: "off" | "on";
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
 * Channel update parameters
 */
export interface UpdateChannelParams {
  display_name?: string;
  name?: string;
  purpose?: string;
  header?: string;
}

/**
 * Channel search parameters
 */
export interface ChannelSearchParams extends PaginationParams {
  term: string;
  team_id?: string;
  exclude_default_channels?: boolean;
  include_deleted?: boolean;
  private?: boolean;
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
  userStatus?: UserStatus;
  groupAvatarUrls?: string[];
  status: "complete" | "loading" | "error";
}

/**
 * Channel state
 */
export interface ChannelState {
  channelsByTeam: Record<string, Channel[]>;
  activeChannel: Channel | null;
  members: Record<string, ChannelMember[]>;
  directChannelInfoById: Record<string, DirectChannelInfo>;
  pendingUserIds: string[];
  lastFetchTimes: Record<string, number>;
}
