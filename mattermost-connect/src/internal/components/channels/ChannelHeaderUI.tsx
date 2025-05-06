// src/internal/components/channels/ChannelHeaderUI.tsx
/**
 * Component that displays the header for a channel
 */
import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Divider,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Info as InfoIcon,
  People as PeopleIcon,
  PersonAdd as InviteIcon,
  Star as StarIcon,
  StarBorder as StarOutlineIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  ExitToApp as LeaveIcon,
  Tag as PublicIcon,
  LockOutlined as PrivateIcon,
  Person as DirectIcon,
  Group as GroupIcon,
  VolumeOff as MuteIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { ChannelHeaderData } from "../../types/componentTypes";

export interface ChannelHeaderUIProps extends ChannelHeaderData {
  /** Whether the channel is muted */
  isMuted?: boolean;
  /** Whether the channel has search enabled */
  hasSearch?: boolean;
  /** Whether to show channel settings */
  showSettings?: boolean;
  /** Whether to show leave channel option */
  showLeave?: boolean;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Callback when search is clicked */
  onSearch?: () => void;
  /** Callback when mute is toggled */
  onToggleMute?: () => void;
  /** Callback when invite is clicked */
  onInvite?: () => void;
  /** Callback when leave is clicked */
  onLeave?: () => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
}

const ChannelHeaderUI: React.FC<ChannelHeaderUIProps> = ({
  channel,
  membersCount,
  isFavorite = false,
  isMuted = false,
  hasSearch = true,
  showSettings = true,
  showLeave = true,
  size = "medium",
  onViewMembers,
  onToggleFavorite,
  onSettings,
  onInfo,
  onSearch,
  onToggleMute,
  onInvite,
  onLeave,
  onDelete,
  className,
  sx,
  id,
}) => {
  // State for menu
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const menuOpen = Boolean(menuAnchorEl);

  // Get channel icon based on type
  const getChannelIcon = () => {
    switch (channel.type) {
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

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle favorite toggle
  const handleToggleFavorite = () => {
    handleMenuClose();
    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  // Handle mute toggle
  const handleToggleMute = () => {
    handleMenuClose();
    if (onToggleMute) {
      onToggleMute();
    }
  };

  // Handle settings click
  const handleSettings = () => {
    handleMenuClose();
    if (onSettings) {
      onSettings();
    }
  };

  // Handle info click
  const handleInfo = () => {
    handleMenuClose();
    if (onInfo) {
      onInfo();
    }
  };

  // Handle view members click
  const handleViewMembers = () => {
    handleMenuClose();
    if (onViewMembers) {
      onViewMembers();
    }
  };

  // Handle invite click
  const handleInvite = () => {
    handleMenuClose();
    if (onInvite) {
      onInvite();
    }
  };

  // Handle leave click
  const handleLeave = () => {
    handleMenuClose();
    if (onLeave) {
      onLeave();
    }
  };

  // Handle delete click
  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) {
      onDelete();
    }
  };

  // Handle search click
  const handleSearch = () => {
    if (onSearch) {
      onSearch();
    }
  };

  // Determine header size
  const isSmall = size === "small";
  const isLarge = size === "large";

  return (
    <Paper
      elevation={0}
      className={className}
      sx={{
        p: isSmall ? 1 : 2,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderBottom: "1px solid",
        borderColor: "divider",
        ...sx,
      }}
      id={id}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {getChannelIcon()}
          <Typography
            variant={isSmall ? "subtitle1" : isLarge ? "h5" : "h6"}
            sx={{ ml: 1, fontWeight: 500 }}
          >
            {channel.display_name}
          </Typography>
          {isFavorite && (
            <StarIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
          )}
          {isMuted && (
            <MuteIcon
              color="action"
              fontSize="small"
              sx={{ ml: 1, opacity: 0.6 }}
            />
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          {hasSearch && (
            <Tooltip title="Search in channel">
              <IconButton onClick={handleSearch} size="small">
                <SearchIcon />
              </IconButton>
            </Tooltip>
          )}

          {membersCount !== undefined && membersCount > 0 && (
            <Tooltip title="View members">
              <Button
                size="small"
                startIcon={<PeopleIcon />}
                onClick={handleViewMembers}
                sx={{ ml: 1 }}
              >
                {membersCount}
              </Button>
            </Tooltip>
          )}

          <Tooltip title="More options">
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{ ml: 1 }}
              aria-label="more options"
              aria-controls={menuOpen ? "channel-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? "true" : undefined}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {!isSmall && channel.purpose && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: isLarge ? 3 : 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {channel.purpose}
        </Typography>
      )}

      {isLarge && channel.header && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {channel.header}
          </Typography>
        </>
      )}

      {/* Channel options menu */}
      <Menu
        id="channel-menu"
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
          dense: true,
        }}
      >
        <MenuItem onClick={handleInfo}>
          <ListItemIcon>
            <InfoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Info</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleToggleFavorite}>
          <ListItemIcon>
            {isFavorite ? (
              <StarIcon fontSize="small" color="primary" />
            ) : (
              <StarOutlineIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={handleToggleMute}>
          <ListItemIcon>
            {isMuted ? (
              <NotificationsIcon fontSize="small" />
            ) : (
              <NotificationsOffIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {isMuted ? "Unmute Channel" : "Mute Channel"}
          </ListItemText>
        </MenuItem>

        {onViewMembers && (
          <MenuItem onClick={handleViewMembers}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Members</ListItemText>
          </MenuItem>
        )}

        {onInvite && (
          <MenuItem onClick={handleInvite}>
            <ListItemIcon>
              <InviteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Invite People</ListItemText>
          </MenuItem>
        )}

        {showSettings && onSettings && (
          <MenuItem onClick={handleSettings}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Channel Settings</ListItemText>
          </MenuItem>
        )}

        {showLeave && onLeave && (
          <>
            <Divider />
            <MenuItem onClick={handleLeave}>
              <ListItemIcon>
                <LeaveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Leave Channel</ListItemText>
            </MenuItem>
          </>
        )}

        {onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "error.main" }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Channel</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default ChannelHeaderUI;
