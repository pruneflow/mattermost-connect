// src/components/channel/ChannelList/ChannelItem.tsx
import React from "react";
import { Channel } from "../../../types";
import { useMattermost } from "../../../context";

// Material-UI Components
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  SxProps,
  Theme,
  Typography,
  Box,
} from "@mui/material";

// Material-UI Icons
import {
  Tag as TagIcon,
  LockOutlined as PrivateIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Bookmark as FavoriteIcon,
  FiberManualRecord as StatusIcon,
  Edit as TypingIcon,
} from "@mui/icons-material";

/**
 * Props pour le composant ChannelItem
 */
export interface ChannelItemProps {
  /** Channel data object */
  channel: Channel;

  /** Whether this channel is currently selected */
  isSelected?: boolean;

  /** Click handler for the channel item */
  onClick?: () => void;

  /** Additional styling for the root element */
  sx?: SxProps<Theme>;

  /** Additional styling for the button element */
  buttonSx?: SxProps<Theme>;

  /** Additional styling for the selected state */
  selectedSx?: SxProps<Theme>;

  /** Additional styling for the icon */
  iconSx?: SxProps<Theme>;
}

/**
 * A component that renders a single channel item in the channel list
 */
const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  isSelected = false,
  onClick,
  sx,
  buttonSx,
  selectedSx,
  iconSx,
}) => {
  // Utiliser les nouvelles méthodes du MattermostProvider
  const {
    getTypingUsersForChannel,
    getTypingIndicatorText,
    getChannelUnreadState,
  } = useMattermost();

  // Vérifier si des utilisateurs sont en train de taper dans ce canal
  const typingUsers = getTypingUsersForChannel(channel.id);
  const isTyping = typingUsers.length > 0;
  const typingText = isTyping ? getTypingIndicatorText(channel.id) : "";

  const unreadState = getChannelUnreadState(channel.id);
  const hasUnread = unreadState.msg_count > 0;
  const unreadCount = unreadState.msg_count;

  // Determine which icon to use based on channel type
  const getChannelIcon = () => {
    const isFavorite = channel.is_favorite;

    if (isFavorite) {
      return <FavoriteIcon color="primary" fontSize="small" />;
    }

    switch (channel.type) {
      case "P":
        return <PrivateIcon fontSize="small" />;
      case "D":
        return <PersonIcon fontSize="small" />;
      case "G":
        return <GroupIcon fontSize="small" />;
      default:
        return <TagIcon fontSize="small" />;
    }
  };

  // Used to display user status in direct messages
  const isDirectMessage = channel.type === "D";

  return (
    <ListItemButton
      selected={isSelected}
      onClick={onClick}
      sx={{
        px: 2,
        py: 1,
        borderRadius: 1,
        mx: 0.5,
        "&.Mui-selected": {
          backgroundColor: (theme) => theme.palette.action.selected,
          color: "primary.main",
          "&:hover": {
            backgroundColor: (theme) => theme.palette.action.hover,
          },
          ...(selectedSx as any),
        },
        ...(buttonSx as any),
        ...(sx as any),
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 36,
          color: isSelected ? "primary.main" : "action.active",
          ...(iconSx as any),
        }}
      >
        {getChannelIcon()}
      </ListItemIcon>

      <ListItemText
        primary={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              variant="body2"
              component="span"
              noWrap
              sx={{
                fontWeight: hasUnread || isSelected ? 600 : 400,
                color:
                  hasUnread || isSelected ? "text.primary" : "text.secondary",
              }}
            >
              {channel.display_name}
            </Typography>

            {/* Status indicator for direct messages */}
            {isDirectMessage && (
              <StatusIcon
                sx={{
                  ml: 0.5,
                  width: 8,
                  height: 8,
                  color: "success.main",
                }}
              />
            )}

            {/* Typing indicator */}
            {isTyping && (
              <TypingIcon
                sx={{
                  ml: 0.5,
                  width: 16,
                  height: 16,
                  color: "info.main",
                  animation: "typing-pulse 1.5s infinite",
                  "@keyframes typing-pulse": {
                    "0%, 100%": {
                      opacity: 0.5,
                      transform: "scale(0.9)",
                    },
                    "50%": {
                      opacity: 1,
                      transform: "scale(1.1)",
                    },
                  },
                }}
              />
            )}
          </Box>
        }
        secondary={
          isTyping ? (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ fontStyle: "italic" }}
            >
              {typingText}
            </Typography>
          ) : isDirectMessage && channel.purpose ? (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              noWrap
            >
              {channel.purpose}
            </Typography>
          ) : null
        }
      />

      {/* Mention badge */}
      {unreadCount > 0 && (
        <Badge
          badgeContent={unreadCount > 0 ? unreadCount : null}
          color={unreadCount > 0 ? "primary" : "default"}
          variant={unreadCount > 0 ? "standard" : "dot"}
          sx={{
            ml: 1,
            "& .MuiBadge-badge": {
              bgcolor: unreadCount > 0 ? "primary.main" : "text.secondary",
            },
          }}
        />
      )}
    </ListItemButton>
  );
};

export default ChannelItem;
