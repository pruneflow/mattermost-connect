/**
 * Channel item component for sidebar channel list display
 * Supports drag & drop, unread indicators, and context menus following Mattermost patterns
 */
import React, { useCallback, useMemo } from "react";
import {
  alpha,
  Box,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SxProps,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { ChannelIcon } from "../atoms/ChannelIcon";
import { UserAvatar } from "../atoms/UserAvatar";
import { GroupAvatar } from "../atoms/GroupAvatar";
import { ChannelIndicator } from "./ChannelIndicator";
import { ChannelMenu, type ChannelMenuOptions } from "./ChannelMenu";
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
  compact?: boolean;
  draggable?: boolean;
  menuOptions?: ChannelMenuOptions;
  sx?: SxProps<Theme>;
}

/**
 * Channel item component for sidebar display
 * Shows channel name, unread indicators, and context menu
 */

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
    compact = false,
    draggable = true,
    menuOptions,
    sx,
  }) => {
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



    // Default values for enriched properties
    const hasUnreads = channel.hasUnreads ?? false;
    const unreadCount = channel.unreadCount ?? 0;
    const mentionCount = channel.mentionCount ?? 0;
    const isMuted = channel.isMuted ?? false;


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

            {/* Channel Menu Button (shown on hover) */}
            <ChannelMenu
              channelId={channel.id}
              size="small"
              options={menuOptions}
              className={`menu-button ${isMobile ? "mobile-visible" : ""}`}
              sx={STATIC_STYLES.menuButton}
            />
          </Box>
        </ListItemButton>

      </ListItem>
    );
  },
);

export default ChannelItem;
