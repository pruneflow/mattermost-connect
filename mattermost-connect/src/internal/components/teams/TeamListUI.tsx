// src/internal/components/teams/TeamListUI.tsx
/**
 * Component that displays a list of teams
 */
import React from "react";
import {
  List,
  Box,
  Grid,
  Tabs,
  Paper,
  Button,
  CircularProgress,
  Tab,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Team } from "../../../index";
import { ListComponentProps } from "../../types/componentTypes";
import TeamItemUI from "./TeamItemUI";
import { EmptyState, IconButton, SearchInput, Tooltip } from "../common";

export interface TeamListUIProps extends ListComponentProps<Team> {
  /** Unread counts by team ID */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
  /** Whether to allow creating new teams */
  allowCreate?: boolean;
  /** Whether to show a search input */
  showSearch?: boolean;
  /** Density of the list */
  density?: "compact" | "comfortable" | "spacious";
  /** Callback when create team button is clicked */
  onCreateTeam?: () => void;
  /** Callback when a team action is performed */
  onTeamAction?: (action: string, team: Team) => void;
}

const TeamListUI: React.FC<TeamListUIProps> = ({
  items,
  activeId,
  variant = "list",
  density = "comfortable",
  isLoading = false,
  emptyMessage = "No teams found",
  unreadCounts = {},
  allowCreate = false,
  showSearch = false,
  searchTerm = "",
  onItemClick,
  onCreateTeam,
  onTeamAction,
  className,
  sx,
  id,
}) => {
  // Determine if we're using compact mode based on density
  const compact = density === "compact";

  // Handle team click
  const handleTeamClick = (team: Team) => {
    if (onItemClick) {
      onItemClick(team);
    }
  };

  // Handle create team click
  const handleCreateTeam = () => {
    if (onCreateTeam) {
      onCreateTeam();
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={100}
        className={className}
        sx={sx}
        id={id}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  // Render empty state
  if (!items || items.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description="Join or create a team to get started"
        actionText={allowCreate ? "Create Team" : undefined}
        onAction={allowCreate ? handleCreateTeam : undefined}
        className={className}
        sx={sx}
        id={id}
      />
    );
  }

  // Render based on variant
  switch (variant) {
    case "sidebar":
      return (
        <Box
          className={className}
          sx={{
            width: "72px",
            overflow: "auto",
            borderRight: "1px solid",
            borderColor: "divider",
            py: 2,
            display: "flex",
            flexDirection: "column",
            ...sx,
          }}
          id={id}
        >
          <List disablePadding sx={{ px: 1 }}>
            {items.map((team) => (
              <TeamItemUI
                key={team.id}
                item={team}
                isActive={team.id === activeId}
                variant="sidebar"
                unreadCount={unreadCounts[team.id]?.messageCount || 0}
                mentionCount={unreadCounts[team.id]?.mentionCount || 0}
                onClick={handleTeamClick}
              />
            ))}
          </List>

          {allowCreate && (
            <Box
              sx={{
                mt: "auto",
                display: "flex",
                justifyContent: "center",
                px: 1,
              }}
            >
              <Tooltip title="Create Team" placement="right" arrow>
                <IconButton onClick={handleCreateTeam} color="primary">
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      );

    case "tabs":
      return (
        <Box
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
        >
          <Paper square elevation={0}>
            <Tabs
              value={activeId || false}
              variant="scrollable"
              scrollButtons="auto"
              textColor="primary"
              indicatorColor="primary"
            >
              {items.map((team) => (
                <TeamItemUI
                  key={team.id}
                  item={team}
                  isActive={team.id === activeId}
                  variant="tabs"
                  unreadCount={unreadCounts[team.id]?.messageCount || 0}
                  mentionCount={unreadCounts[team.id]?.mentionCount || 0}
                  onClick={handleTeamClick}
                />
              ))}

              {allowCreate && (
                <Tab
                  icon={<AddIcon />}
                  iconPosition="start"
                  label="Create"
                  onClick={handleCreateTeam}
                />
              )}
            </Tabs>
          </Paper>
        </Box>
      );

    case "grid":
      return (
        <Box
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
        >
          {showSearch && (
            <Box sx={{ mb: 2 }}>
              <SearchInput
                value={searchTerm}
                placeholder="Search teams..."
                fullWidth
              />
            </Box>
          )}

          <Grid container spacing={2}>
            {items.map((team) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={team.id}>
                <TeamItemUI
                  item={team}
                  isActive={team.id === activeId}
                  variant="grid"
                  compact={compact}
                  unreadCount={unreadCounts[team.id]?.messageCount || 0}
                  mentionCount={unreadCounts[team.id]?.mentionCount || 0}
                  onClick={handleTeamClick}
                />
              </Grid>
            ))}

            {allowCreate && (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 2,
                    border: "2px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    minHeight: 148,
                  }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleCreateTeam}
                  >
                    Create Team
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      );

    case "list":
    default:
      return (
        <Box
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
        >
          {showSearch && (
            <Box sx={{ mb: 2 }}>
              <SearchInput
                value={searchTerm}
                placeholder="Search teams..."
                fullWidth
              />
            </Box>
          )}

          <List
            disablePadding
            sx={{
              py: 0,
            }}
          >
            {items.map((team) => (
              <TeamItemUI
                key={team.id}
                item={team}
                isActive={team.id === activeId}
                showActions={true}
                variant="list"
                compact={compact}
                unreadCount={unreadCounts[team.id]?.messageCount || 0}
                mentionCount={unreadCounts[team.id]?.mentionCount || 0}
                onClick={handleTeamClick}
                onAction={onTeamAction}
              />
            ))}
          </List>

          {allowCreate && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AddIcon />}
                onClick={handleCreateTeam}
              >
                Create Team
              </Button>
            </Box>
          )}
        </Box>
      );
  }
};

export default TeamListUI;
