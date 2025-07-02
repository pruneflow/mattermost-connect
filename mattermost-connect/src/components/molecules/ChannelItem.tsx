import React, {
  useCallback,
  useMemo,
} from "react";
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
  VolumeOff,
  DriveFileMove,
  PersonAdd,
  ExitToApp,
} from "@mui/icons-material";
import { ChannelIcon } from "../atoms/ChannelIcon";
import { UserAvatar } from "../atoms/UserAvatar";
import { ChannelIndicator } from "./ChannelIndicator";
import { Menu, useMenu, type MenuItemConfig } from "../common";
import { useChannels } from "../../hooks/useChannels";
import { usePermissions } from "../../hooks/usePermissions";
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
    pl: 1,
    display: "flex",
    alignItems: "center",
    gap: 0.5,
  } as const,

  menuButton: {
    p: 0.25,
    ml: 0.5,
    visibility: "hidden",
    "&.mobile-visible": {
      visibility: "visible",
    },
  } as const,

  listItemButtonWithMenu: {
    "&:hover .menu-button": {
      visibility: "visible",
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
    const { anchorEl, isOpen, openMenu, closeMenu } = useMenu(`channel-menu-${channel.id}`);
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


    // Get channel actions from useChannels hook
    const {
      markAsUnread,
      toggleFavorite,
      moveToCategory,
      isChannelFavorite,
      getChannelCategory,
      categories,
    } = useChannels();

    // Get permissions
    const { canManageChannelMembers } = usePermissions();

    // Get current favorite status and category
    const isFavorite = isChannelFavorite(channel.id);
    const currentCategory = getChannelCategory(channel.id);
    const canAddMembers = canManageChannelMembers(channel);

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
      // TODO: Implement mute channel
      console.log(`Mute channel ${channel.id}`);
    }, [closeMenu, channel.id]);

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
      // TODO: Implement leave channel
      console.log(`Leave channel ${channel.id}`);
    }, [closeMenu, channel.id]);

    // Create menu items configuration
    const menuItems = useMemo((): MenuItemConfig[] => {
      const items: MenuItemConfig[] = [
        {
          id: 'mark-unread',
          label: 'Mark as unread',
          icon: <MarkAsUnread fontSize="small" />,
          onClick: handleMarkUnread,
        },
        {
          id: 'toggle-favorite',
          label: isFavorite ? 'Remove from favorites' : 'Add to favorites',
          icon: isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />,
          onClick: handleToggleFavorite,
        },
        {
          id: 'mute-channel',
          label: 'Mute channel',
          icon: <VolumeOff fontSize="small" />,
          onClick: handleMuteChannel,
        },
        {
          id: 'divider-1',
          type: 'divider',
        },
        {
          id: 'move-to',
          label: 'Move to...',
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
              icon: currentCategory?.id === category.id ? <Check fontSize="small" color="primary" /> : undefined,
            })),
        },
        {
          id: 'divider-2',
          type: 'divider',
        },
      ];

      // Add members option if user has permissions
      if (canAddMembers) {
        items.push({
          id: 'add-members',
          label: 'Add members',
          icon: <PersonAdd fontSize="small" />,
          onClick: handleAddMembers,
        });
      }

      // Leave channel option
      items.push({
        id: 'leave-channel',
        label: 'Leave channel',
        icon: <ExitToApp fontSize="small" />,
        onClick: handleLeaveChannel,
        variant: 'danger',
      });

      return items;
    }, [
      isFavorite,
      handleMarkUnread,
      handleToggleFavorite,
      handleMuteChannel,
      categories,
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
            : channel.hasUnreads && !channel.isMuted
              ? 600
              : 400,
          color: isActive
            ? "primary.main"
            : channel.hasUnreads && !channel.isMuted
              ? "text.primary"
              : channel.isMuted
                ? "text.disabled"
                : "text.secondary",
        },
      }),
      [compact, sx, isActive, channel.hasUnreads, channel.isMuted, draggable],
    );

    return (
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
          {/* Channel Icon or User Avatar for Direct Channels */}
          <ListItemIcon sx={dynamicStyles.listItemIcon}>
            {channel.type === "D" && channel.otherUser ? (
              <UserAvatar
                userId={channel.otherUser.id}
                size="medium"
                showStatus={true}
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
          <ListItemText
            primary={
              <Typography
                variant={compact ? "body2" : "body1"}
                noWrap
                sx={dynamicStyles.typography}
              >
                {displayName}
              </Typography>
            }
            sx={STATIC_STYLES.listItemText}
          />

          {/* Channel Indicator (Typing or Unread) */}
          <Box sx={STATIC_STYLES.channelIndicatorBox}>
            <ChannelIndicator
              channelId={channel.id}
              hasUnreads={channel.hasUnreads}
              unreadCount={channel.unreadCount}
              mentionCount={channel.mentionCount}
            />

            {/* Three Dots Menu Button */}
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
      </ListItem>
    );
  },
);

export default ChannelItem;
