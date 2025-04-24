// src/components/channels/ChannelDetail.tsx
/**
 * Component that displays detailed information about a channel
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import ChannelDetailContainer from "../../internal/containers/channels/ChannelDetailContainer";
import ChannelDetailUI from "../../internal/components/channels/ChannelDetailUI";
import { Channel } from "../../index";

export interface ChannelDetailProps {
  /** Channel ID to display */
  channelId?: string;
  /** Channel data (if no channelId is provided) */
  channel?: Channel;
  /** Whether the channel is a favorite (only used with direct channel prop) */
  isFavorite?: boolean;
  /** Whether the channel is muted (only used with direct channel prop) */
  isMuted?: boolean;
  /** Member count (only used with direct channel prop) */
  memberCount?: number;
  /** List of member data to show (preview) (only used with direct channel prop) */
  memberPreview?: Array<{
    id: string;
    displayName: string;
    imageUrl?: string;
    status?: "online" | "away" | "dnd" | "offline";
  }>;
  /** Whether to show channel actions */
  showActions?: boolean;
  /** Whether the current user can manage this channel (only used with direct channel prop) */
  canManage?: boolean;
  /** Maximum number of members to preview */
  memberPreviewCount?: number;
  /** Callback when channel is deleted */
  onDelete?: () => void;
  /** Callback when channel is left */
  onLeave?: () => void;
  /** Callback when channel is updated */
  onUpdate?: () => void;
  /** Callback when view members is clicked */
  onViewMembers?: () => void;
  /** Callback when favorite is toggled (only used with direct channel prop) */
  onToggleFavorite?: () => void;
  /** Callback when invite is clicked (only used with direct channel prop) */
  onInvite?: () => void;
  /** Callback when edit is clicked (only used with direct channel prop) */
  onEdit?: () => void;
  /** Callback when copy link is clicked (only used with direct channel prop) */
  onCopyLink?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Channel detail component that displays comprehensive information about a channel
 *
 * This component can work in two modes:
 * 1. Connected mode (with channelId): Fetches channel data from the store
 * 2. Standalone mode (with channel object): Uses provided data directly
 *
 * @example
 * ```tsx
 * // Connected mode
 * <ChannelDetail
 *   channelId="channel123"
 *   showActions={true}
 *   memberPreviewCount={5}
 *   onDelete={() => console.log('Channel deleted')}
 * />
 *
 * // Standalone mode
 * <ChannelDetail
 *   channel={channelObject}
 *   isFavorite={true}
 *   memberCount={15}
 *   canManage={true}
 *   onToggleFavorite={() => console.log('Toggle favorite')}
 * />
 * ```
 */
const ChannelDetail: React.FC<ChannelDetailProps> = ({
  channelId,
  channel,
  isFavorite,
  isMuted,
  memberCount,
  memberPreview,
  showActions = true,
  canManage,
  memberPreviewCount = 5,
  onDelete,
  onLeave,
  onUpdate,
  onViewMembers,
  onToggleFavorite,
  onInvite,
  onEdit,
  onCopyLink,
  className,
  sx,
  id,
}) => {
  // If channelId is provided, use the container for connected functionality
  if (channelId) {
    return (
      <ChannelDetailContainer
        channelId={channelId}
        showActions={showActions}
        memberPreviewCount={memberPreviewCount}
        onDelete={onDelete}
        onLeave={onLeave}
        onUpdate={onUpdate}
        onViewMembers={onViewMembers}
        className={className}
        sx={sx}
        id={id}
      />
    );
  }

  // If no channel data is provided, don't render anything
  if (!channel) {
    return null;
  }

  // Otherwise, use the UI component directly with provided props
  return (
    <ChannelDetailUI
      channel={channel}
      isFavorite={isFavorite}
      isMuted={isMuted}
      memberCount={memberCount}
      memberPreview={memberPreview}
      showActions={showActions}
      canManage={canManage}
      onToggleFavorite={onToggleFavorite}
      onViewMembers={onViewMembers}
      onInvite={onInvite}
      onEdit={onEdit}
      onCopyLink={onCopyLink}
      onLeave={onLeave}
      onDelete={onDelete}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default ChannelDetail;
