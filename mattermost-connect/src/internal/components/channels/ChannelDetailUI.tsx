// src/internal/components/channels/ChannelDetailUI.tsx
/**
 * UI component for channel details
 * Displays detailed information about a channel with tabs for different views
 */
import React from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  Chip,
  Grid,
  Skeleton,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  Tag as PublicIcon,
  LockOutlined as PrivateIcon,
  Person as DirectIcon,
  Group as GroupIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  NotificationsOff as MuteIcon,
  Notifications as UnmuteIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExitToApp as LeaveIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { Channel } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { ContentLoader, ErrorState, Card } from "../common";

export interface ChannelDetailUIProps extends BaseComponentProps {
  /** Channel object */
  channel: Channel | null;
  /** Formatted channel data */
  formattedChannel?: any;
  /** Channel members */
  members?: any[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether there was an error */
  hasError?: boolean;
  /** Error object */
  error?: Error | null;
  /** Whether in edit mode */
  isEditMode?: boolean;
  /** Whether channel is a favorite */
  isFavorite?: boolean;
  /** Whether channel is muted */
  isMuted?: boolean;
  /** Whether channel is a direct message */
  isDirect?: boolean;
  /** Whether channel is a group message */
  isGroup?: boolean;
  /** Display variant */
  variant?: "standard" | "compact" | "card";
  /** Tabs for the detail view */
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  /** Active tab ID */
  activeTab?: string;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Available actions map */
  availableActions?: Record<string, boolean>;
  /** Callback when an action is performed */
  onAction?: (action: string) => void;
  /** Callback when active tab changes */
  onTabChange?: (tabId: string) => void;
}

/**
 * UI component for displaying detailed channel information with tabs
 */
const ChannelDetailUI: React.FC<ChannelDetailUIProps> = ({
  channel,
  formattedChannel,
  members,
  isLoading = false,
  hasError = false,
  error = null,
  isEditMode = false,
  isFavorite = false,
  isMuted = false,
  isDirect = false,
  isGroup = false,
  variant = "standard",
  tabs = [],
  activeTab = "info",
  showActions = true,
  availableActions = {},
  onAction,
  onTabChange,
  className,
  sx,
  id,
}) => {
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  // Handle action button clicks
  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action);
    }
  };

  // Get channel icon based on type
  const getChannelIcon = () => {
    if (!channel) return <InfoIcon />;

    switch (channel.type) {
      case "O":
        return <PublicIcon fontSize="medium" />;
      case "P":
        return <PrivateIcon fontSize="medium" />;
      case "D":
        return <DirectIcon fontSize="medium" />;
      case "G":
        return <GroupIcon fontSize="medium" />;
      default:
        return <PublicIcon fontSize="medium" />;
    }
  };

  // Get channel type label
  const getChannelTypeLabel = (): string => {
    if (!channel) return "Channel";

    switch (channel.type) {
      case "O":
        return "Public Channel";
      case "P":
        return "Private Channel";
      case "D":
        return "Direct Message";
      case "G":
        return "Group Message";
      default:
        return "Channel";
    }
  };

  // Loading state
  if (isLoading && !channel) {
    return (
      <Paper
        className={className}
        sx={{
          width: "100%",
          p: 2,
          ...sx,
        }}
        id={id}
      >
        <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1 }} />
          <Skeleton variant="text" width={200} height={40} />
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={200} />
      </Paper>
    );
  }

  // Error state
  if (hasError) {
    return (
      <Paper
        className={className}
        sx={{
          width: "100%",
          ...sx,
        }}
        id={id}
      >
        <ErrorState
          title="Failed to load channel details"
          error={error}
          onRetry={() => onAction && onAction("refresh")}
        />
      </Paper>
    );
  }

  // No channel state
  if (!channel) {
    return (
      <Paper
        className={className}
        sx={{
          width: "100%",
          p: 3,
          textAlign: "center",
          ...sx,
        }}
        id={id}
      >
        <Typography variant="h6">No channel selected</Typography>
        <Typography variant="body2" color="textSecondary">
          Select a channel to view its details
        </Typography>
      </Paper>
    );
  }

  // Get active tab content
  const getActiveTabContent = () => {
    const activeTabObj = tabs.find((tab) => tab.id === activeTab);
    if (activeTabObj && activeTabObj.content) {
      return activeTabObj.content;
    }

    // Default content for "info" tab
    if (activeTab === "info") {
      return (
        <Box sx={{ p: 2 }}>
          <Grid container spacing={3}>
            {channel.purpose && (
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Purpose
                </Typography>
                <Typography variant="body2">{channel.purpose}</Typography>
              </Grid>
            )}

            {channel.header && (
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Header
                </Typography>
                <Typography variant="body2">{channel.header}</Typography>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
              >
                Channel Type
              </Typography>
              <Chip
                label={getChannelTypeLabel()}
                size="small"
                icon={getChannelIcon()}
                variant="outlined"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
              >
                Created On
              </Typography>
              <Typography variant="body2">
                {new Date(channel.create_at).toLocaleDateString()}
              </Typography>
            </Grid>

            {channel.total_msg_count !== undefined && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Total Messages
                </Typography>
                <Typography variant="body2">
                  {channel.total_msg_count.toLocaleString()}
                </Typography>
              </Grid>
            )}

            {members && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Members
                </Typography>
                <Typography variant="body2">
                  {members.length.toLocaleString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      );
    }

    return null;
  };

  // Channel detail content
  const detailContent = (
    <>
      {/* Channel header with icon and title */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {getChannelIcon()}
          <Typography variant="h5" sx={{ ml: 1, fontWeight: 500 }}>
            {channel.display_name}
          </Typography>
          {isFavorite && <StarIcon color="primary" sx={{ ml: 1 }} />}
          {isMuted && <MuteIcon color="action" sx={{ ml: 1, opacity: 0.6 }} />}
        </Box>

        {/* Action buttons */}
        {showActions && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {availableActions.favorite && (
              <IconButton
                color={isFavorite ? "primary" : "default"}
                onClick={() => handleAction("favorite")}
                size="small"
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                {isFavorite ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            )}

            {availableActions.mute && (
              <IconButton
                onClick={() => handleAction("mute")}
                size="small"
                title={isMuted ? "Unmute channel" : "Mute channel"}
              >
                {isMuted ? <UnmuteIcon /> : <MuteIcon />}
              </IconButton>
            )}

            {availableActions.edit && !isEditMode && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleAction("edit")}
              >
                Edit
              </Button>
            )}

            {availableActions.leave && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LeaveIcon />}
                onClick={() => handleAction("leave")}
              >
                Leave
              </Button>
            )}

            {availableActions.delete && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => handleAction("delete")}
              >
                Delete
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Divider />

      {/* Tabs */}
      {tabs.length > 0 && (
        <>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                disabled={tab.disabled}
              />
            ))}
          </Tabs>

          <Divider />

          {/* Tab content */}
          <ContentLoader
            isLoading={isLoading}
            error={error}
            onRetry={() => onAction && onAction("refresh")}
          >
            {getActiveTabContent()}
          </ContentLoader>
        </>
      )}
    </>
  );

  // Render based on variant
  switch (variant) {
    case "card":
      return (
        <Card
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
          elevation={2}
        >
          {detailContent}
        </Card>
      );
    case "compact":
      return (
        <Paper
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
          variant="outlined"
        >
          {detailContent}
        </Paper>
      );
    case "standard":
    default:
      return (
        <Paper
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
          elevation={1}
        >
          {detailContent}
        </Paper>
      );
  }
};

export default ChannelDetailUI;
