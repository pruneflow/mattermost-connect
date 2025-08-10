import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  SxProps,
  Theme,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
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
} from "@mui/icons-material";
import { ChannelIcon } from "../atoms/ChannelIcon";
import { UserAvatar } from "../atoms/UserAvatar";
import { GroupAvatar } from "../atoms/GroupAvatar";
import { Tooltip } from "@mui/material";
import { ChannelIndicator } from "./ChannelIndicator";
import { Menu, useMenu, type MenuItemConfig } from "../common";
import { LeaveChannelDialog } from "../organisms/LeaveChannelDialog";
import {
  markAsUnread,
  toggleFavorite,
  moveToCategory,
  muteChannel,
  leaveChannel,
  isChannelFavorite,
  getChannelCategory,
  getCategories
} from "../../services/channelService";
import { canManageChannelMembers } from "../../services/permissionService";
import useUserPreferences from "../../hooks/useUserPreferences";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Channel, UserProfile } from "../../api/types";

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  listItem: {
    "& .MuiListItemButton-root": {
      borderRadius: 1,
      margin: "1px 8px 1px 24px", // Add right indent (24px from left)
      "&:hover": {
        backgroundColor: alpha("#000", 0.04),
      },
      "&.Mui-selected": {
        backgroundColor: "primary.main",
        color: "primary.contrastText",
        "&:hover": {
          backgroundColor: "primary.dark",
        },
        "& .MuiListItemIcon-root": {
          color: "primary.contrastText",
        },
        "& .MuiTypography-root": {
          color: "primary.contrastText",
        },
      },
    },
  } as const,

  listItemText: {
    margin: 0,
    "& .MuiListItemText-primary": {
      fontSize: "inherit",
    },
  } as const,

  channelIndicatorBox: {
    ml: "auto",
    display: "flex",
    alignItems: "center",
    position: "relative",
    minWidth: 32, // Reserve space for menu button
    justifyContent: "flex-end",
  } as const,

  menuButton: {
    p: 0.25,
    position: "absolute",
    top: "50%",
    right: 0,
    transform: "translateY(-50%)",
    visibility: "hidden",
    "&.mobile-visible": {
      visibility: "visible",
    },
  } as const,

  channelIndicator: {
    position: "absolute",
    top: "50%",
    right: 0,
    transform: "translateY(-50%)",
  } as const,

  listItemButtonWithMenu: {
    "&:hover .menu-button": {
      visibility: "visible",
    },
    "&:hover .channel-indicator": {
      visibility: "hidden",
    },
  } as const,

  listItemButton: {
    px: 1,
  } as const,

  listItemIcon: {
    mr: 1,
    position: "relative",
  } as const,
};

export interface ChannelItemProps {
  channel: Channel & {
    hasUnreads?: boolean;
    unreadCount?: number;
    mentionCount?: number;
    isMuted?: boolean;
    // Enriched data from selectors (following Mattermost pattern)
    computedDisplayName?: string;
    otherUser?: UserProfile | null;
    otherUserId?: string;
  };
  isActive?: boolean;
  onClick?: (channelId: string) => void;
  onAddChannelMembers?: (channelId: string) => void;
  compact?: boolean;
  draggable?: boolean;
  sx?: SxProps<Theme>;
}

const ChannelName = ({
  name,
  compact,
  dynamicStyles,
  showTooltip = false,
}: {
  name: string;
  compact: boolean;
  dynamicStyles: any;
  showTooltip?: boolean;
}) => {
  const typography = (
    <Typography
      variant={compact ? "body2" : "body1"}
      noWrap
      sx={dynamicStyles.typography}
    >
      {name}
    </Typography>
  );

  return (
    <ListItemText
      primary={
        showTooltip ? (
          <Tooltip
            placement="top-start"
            enterDelay={250}
            leaveDelay={0}
            title={name}
            arrow
          >
            <span>{typography}</span>
          </Tooltip>
        ) : (
          typography
        )
      }
      sx={STATIC_STYLES.listItemText}
    />
  );
};

/**
 * ChannelItem component following Mattermost sidebar patterns
 * Displays channel with icon, name, and indicators (typing/unread)
 */
export const ChannelItem: React.FC<ChannelItemProps> = React.memo(
  ({
    channel,
    isActive = false,
    onClick,
    onAddChannelMembers,
    compact = false,
    draggable = true,
    sx,
  }) => {
    // Menu state using generic hook with unique ID
    const { anchorEl, isOpen, openMenu, closeMenu } = useMenu(
      `channel-menu-${channel.id}`,
    );

    // Leave channel dialog state
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    // Drag & drop setup
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: channel.id,
      disabled: !draggable,
      data: {
        type: "channel",
        channel,
      },
    });

    const handleClick = useCallback(() => {
      if (onClick) {
        onClick(channel.id);
      }
    }, [onClick, channel.id]);


    // Get preferences actions for group channels
    const { closeGroupConversation } = useUserPreferences();

    // Get permissions

    // Get current favorite status and category
    const isFavorite = isChannelFavorite(channel.id);
    const currentCategory = getChannelCategory(channel.id);
    const categories = getCategories();
    const canAddMembers = canManageChannelMembers(channel);

    // Default values for enriched properties
    const hasUnreads = channel.hasUnreads ?? false;
    const unreadCount = channel.unreadCount ?? 0;
    const mentionCount = channel.mentionCount ?? 0;
    const isMuted = channel.isMuted ?? false;

    // Stable menu action handlers
    const handleMarkUnread = useCallback(() => {
      closeMenu();
      markAsUnread(channel.id);
    }, [closeMenu, markAsUnread, channel.id]);

    const handleToggleFavorite = useCallback(() => {
      closeMenu();
      toggleFavorite(channel.id, isFavorite);
    }, [closeMenu, toggleFavorite, channel.id, isFavorite]);

    const handleMuteChannel = useCallback(() => {
      closeMenu();
      muteChannel(channel.id, !isMuted);
    }, [closeMenu, muteChannel, channel.id, isMuted]);

    const handleMoveToCategory = useCallback(
      (categoryId: string) => {
        closeMenu();
        if (currentCategory?.id === categoryId) {
          // If same category, just close menu
          return;
        }
        moveToCategory(channel.id, categoryId);
      },
      [closeMenu, moveToCategory, channel.id, currentCategory?.id],
    );

    const handleAddMembers = useCallback(() => {
      closeMenu();
      onAddChannelMembers?.(channel.id);
    }, [closeMenu, channel.id, onAddChannelMembers]);

    const handleLeaveChannel = useCallback(() => {
      closeMenu();
      if (channel.type === "G") {
        // For group channels, close conversation instead of leaving
        closeGroupConversation(channel.id);
      } else {
        // For other channels, show leave dialog
        setIsLeaveDialogOpen(true);
      }
    }, [closeMenu, channel.type, channel.id, closeGroupConversation]);

    const handleLeaveChannelConfirm = useCallback(() => {
      leaveChannel(channel.id);
    }, [leaveChannel, channel.id]);

    const handleLeaveDialogClose = useCallback(() => {
      setIsLeaveDialogOpen(false);
    }, []);

    // Create menu items configuration
    const menuItems = useMemo((): MenuItemConfig[] => {
      const items: MenuItemConfig[] = [
        {
          id: "mark-unread",
          label: "Mark as unread",
          icon: <MarkAsUnread fontSize="small" />,
          onClick: handleMarkUnread,
        },
        {
          id: "toggle-favorite",
          label: isFavorite ? "Remove from favorites" : "Add to favorites",
          icon: isFavorite ? (
            <Star fontSize="small" />
          ) : (
            <StarBorder fontSize="small" />
          ),
          onClick: handleToggleFavorite,
        },
        {
          id: "mute-channel",
          label: isMuted ? "Unmute channel" : "Mute channel",
          icon: isMuted ? (
            <NotificationsOff fontSize="small" />
          ) : (
            <Notifications fontSize="small" />
          ),
          onClick: handleMuteChannel,
        },
        {
          id: "divider-1",
          type: "divider",
        },
        {
          id: "move-to",
          label: "Move to...",
          icon: <DriveFileMove fontSize="small" />,
          submenu: categories
            .filter((category) => {
              // If current channel is not a DM, don't show DM categories
              return !(
                channel.type !== "D" && category.type === "direct_messages"
              );
            })
            .map((category) => ({
              id: `move-to-${category.id}`,
              label: category.display_name,
              onClick: () => handleMoveToCategory(category.id),
              icon:
                currentCategory?.id === category.id ? (
                  <Check fontSize="small" color="primary" />
                ) : undefined,
            })),
        },
        {
          id: "divider-2",
          type: "divider",
        },
      ];

      // Add members option if user has permissions
      if (canAddMembers) {
        items.push({
          id: "add-members",
          label: "Add members",
          icon: <PersonAdd fontSize="small" />,
          onClick: handleAddMembers,
        });
      }

      // Leave channel or close conversation option
      items.push({
        id: "leave-channel",
        label: channel.type === "G" ? "Close conversation" : "Leave channel",
        icon: <ExitToApp fontSize="small" />,
        onClick: handleLeaveChannel,
        variant: "danger",
      });

      return items;
    }, [
      isFavorite,
      handleMarkUnread,
      handleToggleFavorite,
      handleMuteChannel,
      channel.type,
      currentCategory?.id,
      handleMoveToCategory,
      canAddMembers,
      handleAddMembers,
      handleLeaveChannel,
    ]);

    // Get display name (computed by selector following Mattermost pattern)
    const displayName = channel.computedDisplayName || channel.display_name;

    // Drag & drop styles
    const dragStyle = {
      transform: CSS.Transform.toString(transform),
      transition: transition || "transform 150ms ease-out",
      opacity: isDragging ? 0.8 : 1,
    };

    // Memoized dynamic styles based on props
    const dynamicStyles = useMemo(
      () => ({
        listItem: {
          ...STATIC_STYLES.listItem,
          "& .MuiListItemButton-root": {
            ...STATIC_STYLES.listItem["& .MuiListItemButton-root"],
            minHeight: compact ? 28 : 32,
          },
          ...sx,
        },

        listItemButton: {
          ...STATIC_STYLES.listItemButton,
          ...STATIC_STYLES.listItemButtonWithMenu,
          py: compact ? 0.25 : 0.5,
          ...(draggable && {
            cursor: "grab",
            "&:active": {
              cursor: "grabbing",
            },
          }),
        },

        listItemIcon: {
          ...STATIC_STYLES.listItemIcon,
          minWidth: compact ? 20 : 24,
        },

        typography: {
          fontSize: compact ? "0.8125rem" : "0.875rem",
          lineHeight: compact ? 1.2 : 1.4,
          fontWeight: isActive
            ? 600
            : isMuted
              ? mentionCount > 0
                ? 600
                : 400 // Muted with mentions = bold
              : hasUnreads
                ? 600
                : 400,
          color: isActive
            ? "primary.main"
            : isMuted
              ? "text.disabled" // Muted = always grayed out
              : hasUnreads
                ? "text.primary"
                : "text.secondary",
          opacity: isMuted ? 0.6 : 1,
        },
      }),
      [compact, sx, isActive, hasUnreads, isMuted, mentionCount, draggable],
    );

    const channelItemContent = (
      <ListItem
        ref={setNodeRef}
        disablePadding
        sx={{
          ...dynamicStyles.listItem,
          ...dragStyle,
        }}
        {...(draggable ? attributes : {})}
      >
        <ListItemButton
          selected={isActive}
          onClick={handleClick}
          sx={dynamicStyles.listItemButton}
          {...(draggable ? listeners : {})}
        >
          {/* Channel Icon, User Avatar for Direct Channels, or Group Avatar for Group Channels */}
          <ListItemIcon sx={dynamicStyles.listItemIcon}>
            {channel.type === "D" && channel.otherUser ? (
              <UserAvatar
                userId={channel.otherUser.id}
                size="medium"
                showStatus={true}
              />
            ) : channel.type === "G" ? (
              <GroupAvatar
                channelId={channel.id}
                size="medium"
                showMemberCount={true}
              />
            ) : (
              <ChannelIcon
                channel={channel}
                size={compact ? "small" : "medium"}
                color={isActive ? "inherit" : "action"}
              />
            )}
          </ListItemIcon>

          {/* Channel Name */}
          <ChannelName
            name={displayName}
            compact={compact}
            dynamicStyles={dynamicStyles}
            showTooltip={channel.type === "G"}
          />

          {/* Channel Indicator and Menu - same position */}
          <Box sx={STATIC_STYLES.channelIndicatorBox}>
            {/* Channel Indicator (hidden on hover) */}
            <Box
              className="channel-indicator"
              sx={STATIC_STYLES.channelIndicator}
            >
              <ChannelIndicator
                channelId={channel.id}
                hasUnreads={hasUnreads}
                unreadCount={unreadCount}
                mentionCount={mentionCount}
                isMuted={isMuted}
              />
            </Box>

            {/* Three Dots Menu Button (shown on hover) */}
            <IconButton
              size="small"
              onClick={openMenu}
              className={`menu-button ${isMobile ? "mobile-visible" : ""}`}
              sx={STATIC_STYLES.menuButton}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
        </ListItemButton>

        {/* Context Menu using generic Menu component */}
        <Menu
          open={isOpen}
          anchorEl={anchorEl}
          onClose={closeMenu}
          items={menuItems}
        />

        {/* Leave Channel Confirmation Dialog */}
        {isLeaveDialogOpen && (
          <LeaveChannelDialog
            open={isLeaveDialogOpen}
            onClose={handleLeaveDialogClose}
            onConfirm={handleLeaveChannelConfirm}
            channel={channel}
          />
        )}
      </ListItem>
    );

    return channelItemContent;
  },
);

export default ChannelItem;
