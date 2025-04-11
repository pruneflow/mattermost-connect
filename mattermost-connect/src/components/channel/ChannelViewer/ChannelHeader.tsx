// src/components/ChannelViewer/ChannelHeader.tsx
import React, { useState } from "react";
import { Channel } from "../../../types";

// Material-UI Components
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  Collapse,
  SxProps,
  Theme,
} from "@mui/material";

// Material-UI Icons
import {
  Tag as TagIcon,
  LockOutlined as PrivateIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  People as MembersIcon,
  NotificationsOff as MuteIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

/**
 * Props for the ChannelHeader component
 */
export interface ChannelHeaderProps {
  /** Channel data object */
  channel: Channel;

  /** Whether the channel is favorited */
  isFavorite?: boolean;

  /** Whether the channel is muted */
  isMuted?: boolean;

  /** Member count */
  memberCount?: number;

  /** Callback for toggling favorite status */
  onToggleFavorite?: () => void;

  /** Callback for toggling mute status */
  onToggleMute?: () => void;

  /** Callback for channel settings */
  onOpenSettings?: () => void;

  /** Callback for channel search */
  onSearch?: () => void;

  /** Callback for viewing members */
  onViewMembers?: () => void;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;
}

/**
 * A component that displays the channel header with info and actions
 */
const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  isFavorite = false,
  isMuted = false,
  memberCount,
  onToggleFavorite,
  onToggleMute,
  onOpenSettings,
  onSearch,
  onViewMembers,
  className,
  style,
  sx,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Get channel icon
  const getChannelIcon = () => {
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

  // Get channel type label
  const getChannelTypeLabel = (): string => {
    switch (channel.type) {
      case "P":
        return "Private Channel";
      case "D":
        return "Direct Message";
      case "G":
        return "Group Message";
      default:
        return "Public Channel";
    }
  };

  return (
    <Paper
      elevation={0}
      square
      className={className}
      style={style}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        ...sx,
      }}
    >
      {/* Main header bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1,
        }}
      >
        {/* Channel info */}
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
          <Box sx={{ mr: 1, color: "text.secondary" }}>{getChannelIcon()}</Box>

          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 600, mr: 1 }}
          >
            {channel.display_name}
          </Typography>

          <Chip
            label={getChannelTypeLabel()}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.7rem",
              bgcolor: "action.hover",
              mr: 1,
            }}
          />

          {memberCount !== undefined && (
            <Tooltip title="Member count">
              <Chip
                icon={<MembersIcon fontSize="small" />}
                label={memberCount.toString()}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.7rem",
                  bgcolor: "action.hover",
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: "flex" }}>
          {onToggleFavorite && (
            <Tooltip
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <IconButton size="small" onClick={onToggleFavorite}>
                {isFavorite ? <StarIcon color="primary" /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
          )}

          {onToggleMute && (
            <Tooltip title={isMuted ? "Unmute channel" : "Mute channel"}>
              <IconButton
                size="small"
                onClick={onToggleMute}
                color={isMuted ? "primary" : "default"}
              >
                <MuteIcon />
              </IconButton>
            </Tooltip>
          )}

          {onSearch && (
            <Tooltip title="Search in channel">
              <IconButton size="small" onClick={onSearch}>
                <SearchIcon />
              </IconButton>
            </Tooltip>
          )}

          {onViewMembers && (
            <Tooltip title="View members">
              <IconButton size="small" onClick={onViewMembers}>
                <MembersIcon />
              </IconButton>
            </Tooltip>
          )}

          {onOpenSettings && (
            <Tooltip title="Channel settings">
              <IconButton size="small" onClick={onOpenSettings}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={showDetails ? "Hide details" : "Show details"}>
            <IconButton
              size="small"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Channel details (collapsible) */}
      <Collapse in={showDetails}>
        <Box sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>
          {channel.purpose && (
            <Typography
              component={"div"}
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              <strong>Purpose:</strong> {channel.purpose}
            </Typography>
          )}

          {channel.header ? (
            <Typography
              component={"div"}
              variant="body2"
              color="text.secondary"
            >
              <strong>Description:</strong> {channel.header}
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
              component={"div"}
            >
              <InfoIcon
                fontSize="small"
                sx={{ mr: 0.5, verticalAlign: "middle" }}
              />
              No channel description set.
            </Typography>
          )}

          <Typography
            variant="caption"
            display="block"
            color="text.secondary"
            sx={{ mt: 1 }}
            component={"div"}
          >
            Created: {new Date(channel.create_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ChannelHeader;
