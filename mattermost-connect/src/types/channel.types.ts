/**
 * Channel related type definitions
 */
import {
  CommonSliceActions,
  CommonState,
  Entity,
  PaginationParams,
} from "./common";
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
export interface ChannelState extends CommonState {
  channelsByTeam: Record<string, Channel[]>;
  activeChannel: Channel | null;
  members: Record<string, ChannelMember[]>;
}

export interface ChannelStore extends CommonSliceActions {
  // Actions - Channel Data
  setChannels: (teamId: string, channels: Channel[]) => void;
  setChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannel: (channel: Channel | null) => void;
  updateChannel: (channel: Partial<Channel> & { id: string }) => void;
  setChannelProperty: <K extends keyof Channel>(
    channelId: string,
    key: K,
    value: Channel[K],
  ) => void;

  // Actions - Channel Members
  setChannelMembers: (channelId: string, members: ChannelMember[]) => void;

  // Selectors
  getChannelById: (channelId: string) => Channel | null;
  getChannelsByTeam: (teamId: string) => Channel[];
  getChannelsByType: (teamId: string, type: ChannelGroupType) => Channel[];
  getChannelMembers: (channelId: string) => ChannelMember[];

  // Reset
  reset: () => void;
}

/**
 * Direct channel store state interface
 */
export interface DirectChannelState extends CommonState {
  // Data
  directChannelInfoById: Record<string, DirectChannelInfo>;
  pendingUserIds: string[];
}

export interface DirectChannelStore extends CommonSliceActions {
  // Actions - Direct Channel Info
  setDirectChannelInfo: (channelId: string, info: DirectChannelInfo) => void;
  updateDirectChannelInfo: <K extends keyof DirectChannelInfo>(
    channelId: string,
    key: K,
    value: DirectChannelInfo[K],
  ) => void;

  // Actions - User Status & Image
  setDirectChannelUserStatus: (channelId: string, status: UserStatus) => void;
  setDirectChannelUserImage: (channelId: string, imageUrl: string) => void;

  // Actions - Pending Users
  addPendingUser: (userId: string) => void;
  removePendingUser: (userId: string) => void;

  // Selectors
  getDirectChannelInfo: (channelId: string) => DirectChannelInfo | null;
  isDirectChannelLoading: (channelId: string) => boolean;
  isPendingUser: (userId: string) => boolean;
  refreshDirectChannelInfo: (channelId: string, currentUserId: string) => void;

  // Reset
  reset: () => void;

  preloadDirectChannelsInfo: (
    channels: Channel[],
    currentUserId: string,
  ) => string[];
}
