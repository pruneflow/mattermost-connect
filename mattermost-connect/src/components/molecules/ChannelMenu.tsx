/**
 * Channel context menu component with comprehensive channel actions
 * Provides favorites, mute, move, add members, and leave functionality
 */
import React, { useCallback, useMemo } from 'react';
import {
  IconButton,
  SxProps,
  Theme,
} from '@mui/material';
import {
  MoreVert,
  Check,
  MarkAsUnread,
  Star,
  StarBorder,
  Notifications,
  NotificationsOff,
  DriveFileMove,
  PersonAdd,
  ExitToApp,
} from '@mui/icons-material';
import { Menu, type MenuItemConfig } from '../common';
import { useMenu, useDialog } from '../../hooks';
import { LeaveChannelDialog } from '../organisms/LeaveChannelDialog';
import { AddChannelMembersDialog } from '../organisms/AddChannelMembersDialog';
import {
  markAsUnread,
  toggleFavorite,
  moveToCategory,
  muteChannel,
  leaveChannel,
  isChannelFavorite,
  getChannelCategory,
  getCategories
} from '../../services/channelService';
import { canManageChannelMembers } from '../../services/permissionService';
import useUserPreferences from '../../hooks/useUserPreferences';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectChannelById } from '../../store/selectors';

export interface ChannelMenuOptions {
  showMarkUnread?: boolean;
  showToggleFavorite?: boolean;
  showMute?: boolean;
  showMoveTo?: boolean;
  showAddMembers?: boolean;
  showLeave?: boolean;
}

export interface ChannelMenuProps {
  channelId: string;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps<Theme>;
  options?: ChannelMenuOptions;
  placement?: 'left' | 'right';
  className?: string;
}

/**
 * Create submenu items for "Move to..." option
 */
export const createMoveToSubmenu = (
  channel: any, // Channel object passed from component
  currentCategoryId?: string,
  onMoveToCategory?: (categoryId: string) => void
) => {
  const categories = getCategories();
  
  return categories
    .filter((category) => {
      // If current channel is not a DM, don't show DM categories
      return !(
        channel?.type !== "D" && category.type === "direct_messages"
      );
    })
    .map((category) => ({
      id: `move-to-${category.id}`,
      label: category.display_name,
      onClick: () => onMoveToCategory?.(category.id),
      icon:
        currentCategoryId === category.id ? (
          <Check fontSize="small" color="primary" />
        ) : undefined,
    }));
};

/**
 * ChannelMenu component for channel actions dropdown
 * Reusable in ChannelItem and ChannelHeader - handles menu and dialogs internally
 */
export const ChannelMenu: React.FC<ChannelMenuProps> = ({
  channelId,
  size = 'small',
  sx,
  options = { 
    showMarkUnread: true, 
    showToggleFavorite: true, 
    showMute: true, 
    showMoveTo: true, 
    showAddMembers: true, 
    showLeave: true 
  },
  placement = 'right',
  className,
}) => {
  // Get channel from Redux store
  const channel = useAppSelector(state => selectChannelById(state, channelId));
  
  // Menu and dialog hooks
  const { anchorEl, isOpen, openMenu, closeMenu } = useMenu(`channel-menu-${channelId}`);
  const { isOpen: isLeaveDialogOpen, openDialog: openLeaveDialog, closeDialog: closeLeaveDialog } = useDialog(`leave-dialog-${channelId}`);
  const { isOpen: isInviteDialogOpen, openDialog: openInviteDialog, closeDialog: closeInviteDialog } = useDialog(`invite-dialog-${channelId}`);

  // Get preferences actions for group channels
  const { closeGroupConversation } = useUserPreferences();

  if (!channel) return null;

  // Get current favorite status and category
  const isFavorite = isChannelFavorite(channelId);
  const currentCategory = getChannelCategory(channelId);
  const canAddMembers = canManageChannelMembers(channel);
  
  // Default values for enriched properties
  const isMuted = channel.isMuted ?? false;

  // Stable menu action handlers
  const handleMarkUnread = useCallback(() => {
    closeMenu();
    void markAsUnread(channelId);
  }, [closeMenu, channelId]);

  const handleToggleFavorite = useCallback(() => {
    closeMenu();
    toggleFavorite(channelId, isFavorite);
  }, [closeMenu, channelId, isFavorite]);

  const handleMuteChannel = useCallback(() => {
    closeMenu();
    muteChannel(channelId, !isMuted);
  }, [closeMenu, channelId, isMuted]);

  const handleMoveToCategory = useCallback(
    (categoryId: string) => {
      closeMenu();
      if (currentCategory?.id === categoryId) {
        // If same category, just close menu
        return;
      }
      moveToCategory(channelId, categoryId);
    },
    [closeMenu, channelId, currentCategory?.id],
  );

  const handleAddMembers = useCallback(() => {
    closeMenu();
    openInviteDialog();
  }, [closeMenu, openInviteDialog]);

  const handleLeaveChannel = useCallback(() => {
    closeMenu();
    if (channel.type === "G") {
      // For group channels, close conversation instead of leaving
      void closeGroupConversation(channelId);
    } else {
      // For other channels, show leave dialog
      openLeaveDialog();
    }
  }, [closeMenu, channel.type, channelId, closeGroupConversation, openLeaveDialog]);

  const handleLeaveChannelConfirm = useCallback(() => {
    leaveChannel(channelId);
    closeLeaveDialog();
  }, [channelId, closeLeaveDialog]);

  // Create menu items configuration
  const menuItems = useMemo((): MenuItemConfig[] => {
    const items: MenuItemConfig[] = [];

    // Mark as unread
    if (options.showMarkUnread) {
      items.push({
        id: "mark-unread",
        label: "Mark as unread",
        icon: <MarkAsUnread fontSize="small" />,
        onClick: handleMarkUnread,
      });
    }

    // Toggle favorite
    if (options.showToggleFavorite) {
      items.push({
        id: "toggle-favorite",
        label: isFavorite ? "Remove from favorites" : "Add to favorites",
        icon: isFavorite ? (
          <Star fontSize="small" />
        ) : (
          <StarBorder fontSize="small" />
        ),
        onClick: handleToggleFavorite,
      });
    }

    // Mute/unmute channel
    if (options.showMute) {
      items.push({
        id: "mute-channel",
        label: isMuted ? "Unmute channel" : "Mute channel",
        icon: isMuted ? (
          <NotificationsOff fontSize="small" />
        ) : (
          <Notifications fontSize="small" />
        ),
        onClick: handleMuteChannel,
      });
    }

    // First divider if we have basic actions
    if ((options.showMarkUnread || options.showToggleFavorite || options.showMute) && 
        (options.showMoveTo || options.showAddMembers || options.showLeave)) {
      items.push({
        id: "divider-1",
        type: "divider",
      });
    }

    // Move to category
    if (options.showMoveTo) {
      items.push({
        id: "move-to",
        label: "Move to...",
        icon: <DriveFileMove fontSize="small" />,
        submenu: createMoveToSubmenu(channel, currentCategory?.id, handleMoveToCategory),
      });
    }

    // Second divider if we have move-to and other actions
    if (options.showMoveTo && (options.showAddMembers || options.showLeave)) {
      items.push({
        id: "divider-2",
        type: "divider",
      });
    }

    // Add members option if user has permissions
    if (options.showAddMembers && canAddMembers) {
      items.push({
        id: "add-members",
        label: "Add members",
        icon: <PersonAdd fontSize="small" />,
        onClick: handleAddMembers,
      });
    }

    // Leave channel or close conversation option
    if (options.showLeave) {
      items.push({
        id: "leave-channel",
        label: channel.type === "G" ? "Close conversation" : "Leave channel",
        icon: <ExitToApp fontSize="small" />,
        onClick: handleLeaveChannel,
        variant: "danger",
      });
    }

    return items;
  }, [
    options,
    isFavorite,
    isMuted,
    channelId,
    currentCategory?.id,
    canAddMembers,
    channel.type,
    handleMarkUnread,
    handleToggleFavorite,
    handleMuteChannel,
    handleMoveToCategory,
    handleAddMembers,
    handleLeaveChannel,
  ]);

  return (
    <>
      <IconButton
        size={size}
        onClick={openMenu}
        aria-label="channel options"
        className={className}
        sx={{
          color: 'action.active',
          '&:hover': {
            color: 'text.primary',
          },
          ...sx,
        }}
      >
        <MoreVert fontSize={size} />
      </IconButton>

      {/* Context Menu */}
      <Menu
        open={isOpen}
        anchorEl={anchorEl}
        onClose={closeMenu}
        items={menuItems}
        placement={placement}
      />

      {/* Leave Channel Confirmation Dialog */}
      {isLeaveDialogOpen && (
        <LeaveChannelDialog
          open={isLeaveDialogOpen}
          onClose={closeLeaveDialog}
          onConfirm={handleLeaveChannelConfirm}
          channel={channel}
        />
      )}

      {/* Add Channel Members Dialog */}
      {isInviteDialogOpen && (
        <AddChannelMembersDialog
          open={isInviteDialogOpen}
          onClose={closeInviteDialog}
          channelId={channelId}
        />
      )}
    </>
  );
};

export default ChannelMenu;