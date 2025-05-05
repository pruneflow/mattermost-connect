// src/internal/components/channels/ChannelItemUI.tsx
/**
 * Component that displays a single channel item
 */
import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Tab,
} from "@mui/material";
import {
  Tag as PublicIcon,
  LockOutlined as PrivateIcon,
  Person as DirectIcon,
  Group as GroupIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreIcon,
  VolumeOff as MutedIcon,
} from "@mui/icons-material";
import { Channel } from "../../../types";
import { ItemComponentProps } from "../../types/componentTypes";
import { UnreadBadge } from "../common";

export interface ChannelItemUIProps extends ItemComponentProps<Channel> {
  /** Display variant */
  variant?: "list" | "grid" | "sidebar" | "tabs";
  /** Unread message count */
  unreadCount?: number;
  /** Unread mention count */
  mention_count?: number;
  /** Whether the channel is a favorite */
  isFavorite?: boolean;
  /** Whether to show favorite toggle */
  showFavoriteToggle?: boolean;
  /** Whether to show the channel is muted */
  isMuted?: boolean;
  /** User names for direct/group messages */
  displayNames?: string[];
  /** Whether the item is a compact version */
  compact?: boolean;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (channel: Channel) => void;
}

const ChannelItemUI: React.FC<ChannelItemUIProps> = ({
  item,
  isActive = false,
  showActions = false,
  isLoading = false,
  variant = "list",
  unreadCount = 0,
  mention_count = 0,
  isFavorite = false,
  showFavoriteToggle = false,
  isMuted = false,
  displayNames = [],
  compact = false,
  onClick,
  onAction,
  onToggleFavorite,
  className,
  sx,
  id,
}) => {
  // Get channel icon based on type
  const getChannelIcon = () => {
    switch (item.type) {
      case "O":
        return <PublicIcon fontSize="small" />;
      case "P":
        return <PrivateIcon fontSize="small" />;
      case "D":
        return <DirectIcon fontSize="small" />;
      case "G":
        return <GroupIcon fontSize="small" />;
      default:
        return <PublicIcon fontSize="small" />;
    }
  };

  // Get channel display name
  const getDisplayName = () => {
    // For direct/group messages, use the display names if provided
    if ((item.type === "D" || item.type === "G") && displayNames.length > 0) {
      return displayNames.join(", ");
    }
    return item.display_name;
  };

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  // Handle more options click
  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction("more", item);
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(item);
    }
  };

  // Create secondary content (if applicable)
  const secondaryContent = !compact ? (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        color: isMuted ? "text.disabled" : "inherit",
      }}
    >
      {item.purpose && (
        <Typography
          variant="body2"
          color="inherit"
          noWrap
          sx={{
            flexGrow: 1,
            opacity: 0.8,
          }}
        >
          {item.purpose}
        </Typography>
      )}
    </Box>
  ) : null;

  // Render different variants
  switch (variant) {
    case "sidebar":
      return (
        <ListItem
          disablePadding
          className={className}
          sx={{
            mb: 0.5,
            ...sx,
          }}
          id={id}
        >
          <ListItemButton
            selected={isActive}
            onClick={handleClick}
            disabled={isLoading}
            sx={{
              borderRadius: 1,
              py: 0.75,
              px: 1.5,
              opacity: isMuted ? 0.6 : 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              {getChannelIcon()}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      maxWidth: 160,
                      fontWeight:
                        unreadCount > 0 ? "fontWeightMedium" : "inherit",
                    }}
                  >
                    {getDisplayName()}
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                ...(isFavorite && {
                  "& .MuiTypography-root": {
                    color: "primary.main",
                  },
                }),
              }}
            />
            {(unreadCount > 0 || mention_count > 0) && (
              <UnreadBadge
                messageCount={unreadCount}
                mentionCount={mention_count}
                showZero={false}
                mentionPriority={true}
                size="small"
              />
            )}
          </ListItemButton>
        </ListItem>
      );

    case "tabs":
      return (
        <Tab
          label={
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
                {getChannelIcon()}
              </Box>
              <UnreadBadge
                messageCount={unreadCount}
                mentionCount={mention_count}
                showZero={false}
                mentionPriority={true}
              >
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    maxWidth: 120,
                    textTransform: "none",
                    fontWeight:
                      unreadCount > 0 ? "fontWeightMedium" : "inherit",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {getDisplayName()}
                  {isFavorite && (
                    <StarIcon
                      fontSize="small"
                      color="primary"
                      sx={{ ml: 0.5 }}
                    />
                  )}
                  {isMuted && (
                    <MutedIcon
                      fontSize="small"
                      color="action"
                      sx={{ ml: 0.5, opacity: 0.6 }}
                    />
                  )}
                </Typography>
              </UnreadBadge>
            </Box>
          }
          value={item.id}
          disabled={isLoading}
          onClick={handleClick}
          className={className}
          sx={{
            opacity: isMuted ? 0.6 : 1,
            ...sx,
          }}
          id={id}
        />
      );

    case "grid":
      return (
        <Card
          className={className}
          sx={{
            width: "100%",
            borderRadius: 2,
            ...(isActive && {
              borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
            }),
            ...sx,
          }}
          id={id}
        >
          <CardActionArea onClick={handleClick} disabled={isLoading}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                {getChannelIcon()}
                {isFavorite && (
                  <StarIcon fontSize="small" color="primary" sx={{ ml: 0.5 }} />
                )}
                {isMuted && (
                  <MutedIcon
                    fontSize="small"
                    color="action"
                    sx={{ ml: 0.5, opacity: 0.6 }}
                  />
                )}
              </Box>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{
                  fontWeight: unreadCount > 0 ? "fontWeightMedium" : "inherit",
                  opacity: isMuted ? 0.6 : 1,
                }}
              >
                {getDisplayName()}
              </Typography>
              {!compact && item.purpose && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    mt: 0.5,
                    opacity: isMuted ? 0.6 : 1,
                  }}
                >
                  {item.purpose}
                </Typography>
              )}
              {(unreadCount > 0 || mention_count > 0) && (
                <Box sx={{ mt: 1 }}>
                  <UnreadBadge
                    messageCount={unreadCount}
                    mentionCount={mention_count}
                    showZero={false}
                    mentionPriority={true}
                  />
                </Box>
              )}
            </CardContent>
          </CardActionArea>
        </Card>
      );

    case "list":
    default:
      return (
        <ListItem
          disablePadding
          secondaryAction={
            showActions && (
              <Box sx={{ display: "flex" }}>
                {showFavoriteToggle && (
                  <IconButton
                    edge="end"
                    onClick={handleFavoriteToggle}
                    disabled={isLoading}
                    size="small"
                  >
                    {isFavorite ? (
                      <StarIcon fontSize="small" color="primary" />
                    ) : (
                      <StarBorderIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
                <IconButton
                  edge="end"
                  onClick={handleMoreClick}
                  disabled={isLoading}
                  size="small"
                >
                  <MoreIcon />
                </IconButton>
              </Box>
            )
          }
          className={className}
          sx={sx}
          id={id}
        >
          <ListItemButton
            selected={isActive}
            onClick={handleClick}
            disabled={isLoading}
            sx={{
              borderRadius: 1,
              opacity: isMuted ? 0.6 : 1,
            }}
          >
            <ListItemIcon>
              <UnreadBadge
                messageCount={unreadCount}
                mentionCount={mention_count}
                showZero={false}
                mentionPriority={true}
              >
                {getChannelIcon()}
              </UnreadBadge>
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="body1"
                    noWrap
                    sx={{
                      fontWeight:
                        unreadCount > 0 ? "fontWeightMedium" : "inherit",
                    }}
                  >
                    {getDisplayName()}
                  </Typography>
                  {isFavorite && (
                    <StarIcon
                      fontSize="small"
                      color="primary"
                      sx={{ ml: 0.5 }}
                    />
                  )}
                  {isMuted && (
                    <MutedIcon
                      fontSize="small"
                      color="action"
                      sx={{ ml: 0.5, opacity: 0.6 }}
                    />
                  )}
                </Box>
              }
              secondary={secondaryContent}
            />
          </ListItemButton>
        </ListItem>
      );
  }
};

export default ChannelItemUI;
