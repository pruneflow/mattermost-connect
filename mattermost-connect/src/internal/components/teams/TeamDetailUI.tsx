// src/internal/components/teams/TeamDetailUI.tsx
/**
 * Team Detail UI Component
 * Displays comprehensive information about a team with tabs, stats, and actions
 */
import React, { useState } from "react";
import {
  Card,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Divider,
  Grid,
  Paper,
  Avatar,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExitToApp as LeaveIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Forum as ForumIcon,
} from "@mui/icons-material";
import { Team, TeamStats } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { ErrorState, LoadingSpinner, ContentLoader } from "../common";
import TeamAvatar from "./components/TeamAvatar";

export interface TeamDetailUIProps extends BaseComponentProps {
  // Data props
  team: Team | null;
  formattedTeam?: any;
  stats?: TeamStats;
  members?: any[];
  // State props
  isLoading?: boolean;
  hasError?: boolean;
  error?: Error | null;
  isEditMode?: boolean;
  // Display props
  variant?: "standard" | "compact" | "card";
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  activeTab?: string;
  showActions?: boolean;
  availableActions?: Record<string, boolean>;
  // Callback props
  onAction?: (action: string) => void;
  onTabChange?: (tabId: string) => void;
  onEditModeToggle?: () => void;
  onCancelEdit?: () => void;
  onRefresh?: () => void;
}

const TeamDetailUI: React.FC<TeamDetailUIProps> = ({
  team,
  formattedTeam,
  stats,
  members,
  isLoading = false,
  hasError = false,
  error = null,
  isEditMode = false,
  variant = "standard",
  tabs = [],
  activeTab = "info",
  showActions = true,
  availableActions = {},
  onAction,
  onTabChange,
  onEditModeToggle,
  onCancelEdit,
  onRefresh,
  className,
  sx,
  id,
}) => {
  // Handle component loading state
  if (isLoading && !team) {
    return <LoadingSpinner message="Loading team details..." centered />;
  }

  // Handle error state
  if (hasError && error) {
    return <ErrorState message={error.message} onRetry={onRefresh} />;
  }

  // Handle empty state
  if (!team) {
    return (
      <ErrorState
        title="Team Not Found"
        message="The requested team could not be found."
        onRetry={onRefresh}
      />
    );
  }

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    if (onTabChange) onTabChange(newValue);
  };

  // Handle actions
  const handleAction = (action: string) => {
    if (onAction) onAction(action);
  };

  // Determine if action is available
  const isActionAvailable = (action: string): boolean => {
    return availableActions?.[action] || false;
  };

  // Render team basic information
  const renderTeamInfo = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Team Name
          </Typography>
          <Typography variant="body1" paragraph>
            {team.display_name}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Description
          </Typography>
          <Typography variant="body1" paragraph>
            {team.description || "No description provided."}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Type
          </Typography>
          <Chip
            label={team.type === "O" ? "Open" : "Invite Only"}
            color={team.type === "O" ? "success" : "primary"}
            size="small"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Team URL
          </Typography>
          <Typography variant="body1" paragraph>
            {formattedTeam?.url || `/${team.name}`}
          </Typography>

          {stats && (
            <>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Member Count
              </Typography>
              <Typography variant="body1" paragraph>
                {stats.total_member_count || 0} members (
                {stats.active_member_count || 0} active)
              </Typography>
            </>
          )}

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Created
          </Typography>
          <Typography variant="body1" paragraph>
            {new Date(team.create_at).toLocaleDateString()}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  // Render member preview section (limited view - full view in Members tab)
  const renderMemberPreview = () => (
    <Box mt={3}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Members</Typography>
        {members && members.length > 0 && (
          <Button
            size="small"
            startIcon={<PeopleIcon />}
            onClick={() => console.debug("see all members")}
          >
            View All ({members.length})
          </Button>
        )}
      </Box>

      {members && members.length > 0 ? (
        <Box display="flex" flexWrap="wrap" gap={1}>
          {members.slice(0, 10).map((member) => (
            <Tooltip key={member.user_id} title={member.username || "Unknown"}>
              <Avatar
                alt={member.username || "Unknown"}
                src={member.profile_picture}
              />
            </Tooltip>
          ))}
          {members.length > 10 && (
            <Tooltip title={`${members.length - 10} more members`}>
              <Avatar>+{members.length - 10}</Avatar>
            </Tooltip>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No members found.
        </Typography>
      )}
    </Box>
  );

  // Render action buttons
  const renderActions = () => {
    if (!showActions) return null;

    return (
      <Box
        mt={3}
        display="flex"
        flexWrap="wrap"
        gap={1}
        justifyContent="flex-end"
      >
        {isActionAvailable("refresh") && (
          <IconButton
            onClick={() => handleAction("refresh")}
            size="small"
            color="default"
          >
            <RefreshIcon />
          </IconButton>
        )}

        {isActionAvailable("edit") && !isEditMode && (
          <Button
            startIcon={<EditIcon />}
            onClick={() => handleAction("edit")}
            size="small"
            variant="outlined"
          >
            Edit
          </Button>
        )}

        {isActionAvailable("manage-members") && (
          <Button
            startIcon={<PeopleIcon />}
            onClick={() => handleAction("manage-members")}
            size="small"
            variant="outlined"
          >
            Manage Members
          </Button>
        )}

        {isActionAvailable("settings") && (
          <Button
            startIcon={<SettingsIcon />}
            onClick={() => handleAction("settings")}
            size="small"
            variant="outlined"
          >
            Settings
          </Button>
        )}

        {isActionAvailable("channels") && (
          <Button
            startIcon={<ForumIcon />}
            onClick={() => handleAction("channels")}
            size="small"
            variant="outlined"
          >
            Channels
          </Button>
        )}

        {isActionAvailable("leave") && (
          <Button
            startIcon={<LeaveIcon />}
            onClick={() => handleAction("leave")}
            size="small"
            variant="outlined"
            color="error"
          >
            Leave
          </Button>
        )}

        {isActionAvailable("delete") && (
          <Button
            startIcon={<DeleteIcon />}
            onClick={() => handleAction("delete")}
            size="small"
            variant="outlined"
            color="error"
          >
            Delete
          </Button>
        )}
      </Box>
    );
  };

  // Render selected tab content
  const renderTabContent = () => {
    const activeTabData = tabs.find((tab) => tab.id === activeTab);

    // If tab has content, render it
    if (activeTabData?.content) {
      return activeTabData.content;
    }

    // Otherwise, render default content based on tab id
    switch (activeTab) {
      case "info":
        return renderTeamInfo();
      case "members":
        return renderMemberPreview();
      case "channels":
        return <Box p={2}>Channels list will be displayed here.</Box>;
      default:
        return (
          <Box p={2}>
            <Typography>Tab content not available.</Typography>
          </Box>
        );
    }
  };

  // Main render
  return (
    <ContentLoader
      isLoading={isLoading}
      error={error}
      onRetry={onRefresh}
      className={className}
      sx={sx}
      id={id}
    >
      <Box>
        {/* Team Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <TeamAvatar team={team} size="large" sx={{ mr: 2 }} />
          <Box flexGrow={1}>
            <Typography variant="h4" component="h1">
              {team.display_name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              @{team.name}
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        {tabs.length > 0 && (
          <>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              sx={{ mb: 3 }}
            >
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  label={tab.label}
                  value={tab.id}
                  disabled={tab.disabled}
                />
              ))}
            </Tabs>
            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {/* Tab Content */}
        <Box mb={3}>{renderTabContent()}</Box>

        {/* Action Buttons */}
        {renderActions()}
      </Box>
    </ContentLoader>
  );
};

export default TeamDetailUI;
