// src/internal/components/channels/ChannelAvatarUI.tsx
/**
 * Component for displaying channel avatars with different styles based on channel type
 */
import React, { useMemo } from "react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  CircularProgress,
  styled,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { Channel } from "../../../types";
import {
  isDirectChannel,
  isGroupChannel,
  getChannelInitials,
} from "../../../utils/channelUtils";
import { stringToColor } from "../../../utils/mattermostUtils";

// Styled Badge for online status
const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

// Styled Badge for different statuses
const StatusBadge = styled(Badge, {
  shouldForwardProp: (prop) => prop !== "statusColor",
})<{ statusColor: string }>(({ theme, statusColor }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: statusColor,
    color: statusColor,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      content: '""',
    },
  },
}));

export interface ChannelAvatarUIProps extends BaseComponentProps {
  /** Channel data */
  channel: Channel;
  /** Size of the avatar */
  size?: "small" | "medium" | "large" | number;
  /** User display name for direct channels */
  displayName?: string;
  /** User image URL for direct channels */
  userImageUrl?: string;
  /** User online status for direct channels */
  userStatus?: "online" | "away" | "dnd" | "offline";
  /** Avatar URLs for group channels (max 3) */
  groupAvatarUrls?: string[];
  /** Whether to show status badge for direct channels */
  showStatus?: boolean;
  /** Background color (for channel types other than direct/group) */
  backgroundColor?: string;
  /** Whether the avatar is in loading state */
  isLoading?: boolean;
}

/**
 * Maps status to color
 */
const statusToColor = {
  online: "#44b700",
  away: "#ffc107",
  dnd: "#f44336",
  offline: "#bdbdbd",
};

/**
 * Get avatar size in pixels
 */
const getAvatarSize = (size: "small" | "medium" | "large" | number): number => {
  if (typeof size === "number") return size;

  switch (size) {
    case "small":
      return 24;
    case "large":
      return 40;
    case "medium":
    default:
      return 32;
  }
};

/**
 * Component that displays different avatar styles based on channel type
 */
const ChannelAvatarUI: React.FC<ChannelAvatarUIProps> = ({
  channel,
  size = "medium",
  displayName = "",
  userImageUrl,
  userStatus,
  groupAvatarUrls = [],
  showStatus = true,
  backgroundColor,
  isLoading = false,
  className,
  sx,
  id,
}) => {
  const avatarSize = getAvatarSize(size);

  // Determine background color based on channel name/ID for consistency
  const bgColor = useMemo(() => {
    if (backgroundColor) return backgroundColor;
    return stringToColor(channel.name || channel.id);
  }, [backgroundColor, channel.name, channel.id]);

  // Generate initials for the avatar
  const initials = useMemo(() => {
    if (isDirectChannel(channel) || isGroupChannel(channel)) {
      return getChannelInitials(displayName || channel.display_name);
    }

    // For regular channels, use first letter
    return channel.display_name.charAt(0).toUpperCase();
  }, [channel, displayName]);

  // Render avatar based on channel type
  if (isLoading) {
    // Show loading skeleton instead of avatar
    return (
      <Box className={className} sx={{ display: "inline-flex", ...sx }} id={id}>
        <Avatar
          sx={{
            width: avatarSize,
            height: avatarSize,
            bgcolor: "#f5f5f5",
          }}
        >
          <CircularProgress size={avatarSize * 0.6} thickness={5} />
        </Avatar>
      </Box>
    );
  } else if (isDirectChannel(channel)) {
    // Direct message channel - show user avatar with status
    return (
      <Box className={className} sx={{ display: "inline-flex", ...sx }} id={id}>
        {showStatus && userStatus ? (
          <StatusBadge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            statusColor={statusToColor[userStatus]}
          >
            {userImageUrl ? (
              <Avatar
                src={userImageUrl}
                alt={displayName || channel.display_name}
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  bgcolor: bgColor,
                }}
              >
                {initials}
              </Avatar>
            ) : (
              <Avatar
                alt={displayName || channel.display_name}
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  bgcolor: bgColor,
                }}
              >
                {initials}
              </Avatar>
            )}
          </StatusBadge>
        ) : (
          // Without status badge
          <Avatar
            src={userImageUrl}
            alt={displayName || channel.display_name}
            sx={{
              width: avatarSize,
              height: avatarSize,
              bgcolor: bgColor,
            }}
          >
            {initials}
          </Avatar>
        )}
      </Box>
    );
  } else if (isGroupChannel(channel)) {
    // Group message channel - show avatar group or single avatar with group background
    return (
      <Box className={className} sx={{ display: "inline-flex", ...sx }} id={id}>
        {groupAvatarUrls.length > 0 ? (
          <AvatarGroup
            max={3}
            sx={{
              "& .MuiAvatar-root": {
                width: avatarSize,
                height: avatarSize,
              },
            }}
          >
            {groupAvatarUrls.map((url, index) => (
              <Avatar key={`${channel.id}-avatar-${index}`} src={url} />
            ))}
          </AvatarGroup>
        ) : (
          // Fallback for group channels without avatar URLs
          <Avatar
            sx={{
              width: avatarSize,
              height: avatarSize,
              bgcolor: bgColor,
              // Subtle difference for group channels
              border: "1.5px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            {initials}
          </Avatar>
        )}
      </Box>
    );
  } else {
    // Regular channel - standard avatar with first letter
    return (
      <Box className={className} sx={{ display: "inline-flex", ...sx }} id={id}>
        <Avatar
          sx={{
            width: avatarSize,
            height: avatarSize,
            bgcolor: bgColor,
          }}
        >
          {initials}
        </Avatar>
      </Box>
    );
  }
};

export default ChannelAvatarUI;
