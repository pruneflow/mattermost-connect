// src/components/channels/ChannelHeader.tsx
/**
 * Component that displays a channel header with information and actions
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import ChannelHeaderContainer from "../../internal/containers/channels/ChannelHeaderContainer";
import { Channel } from "../../types";

export interface ChannelHeaderProps {
  /** Channel ID to display */
  channelId?: string;
  /** Channel data (if no channelId is provided) */
  channel?: Channel;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Whether the channel is a favorite (only used with direct channel prop) */
  isFavorite?: boolean;
  /** Whether the channel is muted (only used with direct channel prop) */
  isMuted?: boolean;
  /** Members count (only used with direct channel prop) */
  membersCount?: number;
  /** Whether to show search option */
  showSearch?: boolean;
  /** Whether to show settings option */
  showSettings?: boolean;
  /** Whether to show leave option */
  showLeave?: boolean;
  /** Callback when search is clicked */
  onSearch?: () => void;
  /** Callback when channel is deleted */
  onDelete?: () => void;
  /** Callback when channel is left */
  onLeave?: () => void;
  /** Callback when view members is clicked */
  onViewMembers?: () => void;
  /** Callback when favorite is toggled (only used with direct channel prop) */
  onToggleFavorite?: () => void;
  /** Callback when mute is toggled (only used with direct channel prop) */
  onToggleMute?: () => void;
  /** Callback when settings is clicked (only used with direct channel prop) */
  onSettings?: () => void;
  /** Callback when info is clicked (only used with direct channel prop) */
  onInfo?: () => void;
  /** Callback when invite is clicked (only used with direct channel prop) */
  onInvite?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Channel header component that displays information and actions for a channel
 *
 * This component can work in two modes:
 * 1. Connected mode (with channelId): Fetches channel data from the store
 * 2. Standalone mode (with channel object): Uses provided data directly
 *
 * @example
 * ```tsx
 * // Connected mode
 * <ChannelHeader
 *   channelId="channel123"
 *   size="medium"
 *   onSearch={() => console.log('Search clicked')}
 * />
 *
 * // Standalone mode
 * <ChannelHeader
 *   channel={channelObject}
 *   isFavorite={true}
 *   membersCount={25}
 *   onToggleFavorite={() => console.log('Toggle favorite')}
 * />
 * ```
 */
const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channelId,
  channel,
  size = "medium",
  isFavorite,
  isMuted,
  membersCount,
  showSearch = true,
  showSettings = true,
  showLeave = true,
  onSearch,
  onDelete,
  onLeave,
  onViewMembers,
  onToggleFavorite,
  onToggleMute,
  onSettings,
  onInfo,
  onInvite,
  className,
  sx,
  id,
}) => {
  // If channelId is provided, use the container for connected functionality
  if (!channelId && !channel) return null;
  return (
    <ChannelHeaderContainer
      channelId={channelId}
      channel={channel}
      size={size}
      showSearch={showSearch}
      showSettings={showSettings}
      showLeave={showLeave}
      onSearch={onSearch}
      onViewMembers={onViewMembers}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default ChannelHeader;
