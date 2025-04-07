// src/types/channel.types.ts
/**
 * Types for Mattermost channels
 */

export type ChannelType = "O" | "P" | "D" | "G";

export interface Channel {
  id: string;
  team_id: string;
  name: string;
  display_name: string;
  type: ChannelType;
  header?: string;
  purpose?: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  total_msg_count?: number;
  last_post_at?: number;
  // Additional properties that may exist in Mattermost API
  is_favorite?: boolean;
  mention_count?: number;
}
