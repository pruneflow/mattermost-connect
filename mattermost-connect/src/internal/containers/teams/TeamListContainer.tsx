// src/internal/containers/teams/TeamListContainer.tsx
/**
 * Container component for team list that manages data fetching and state
 */
import React, { useCallback, useState, useMemo, useEffect } from "react";
import { useTeams } from "../../../hooks/useTeams";
import { BaseComponentProps } from "../../types/componentTypes";
import TeamListUI from "../../components/teams/TeamListUI";
import { Team } from "../../../index";
import { useTeamCreation } from "../../../hooks/useTeams";
import { DisplayVariant, DensityVariant } from "../../types/componentTypes";
import {
  useUnreadCounts,
  useUnreadCountsListener,
} from "../../../hooks/useUnreadCounts";
import { useWebSocket } from "../../../hooks/useWebSocket";

export interface TeamListContainerProps extends BaseComponentProps {
  /** How to display the teams */
  variant?: DisplayVariant;
  /** Density of items */
  density?: DensityVariant;
  /** Whether to allow creating new teams */
  allowCreate?: boolean;
  /** Whether to show a search input */
  showSearch?: boolean;
  /** Custom empty message */
  emptyMessage?: string;
  /** Callback when a team is selected */
  onTeamSelect?: (team: Team) => void;
  /** Callback when create team is successful */
  onCreateSuccess?: (team: Team) => void;
}

const TeamListContainer: React.FC<TeamListContainerProps> = ({
  variant = "list",
  density = "comfortable",
  allowCreate = false,
  showSearch = false,
  emptyMessage,
  onTeamSelect,
  onCreateSuccess,
  className,
  sx,
  id,
}) => {
  // State for search
  const [searchTerm, setSearchTerm] = useState("");

  // State for unread counts to ensure UI updates
  const [unreadCounts, setUnreadCounts] = useState<
    Record<string, { msg_count: number; mention_count: number }>
  >({});

  // Get teams data from hook
  const { teams, activeTeam, isLoading, error, setActiveTeam, refreshTeams } =
    useTeams();

  // Team creation mutation
  const { createTeam, isCreating } = useTeamCreation();

  // Get unread counts from optimized hook
  const {
    teamUnreadCounts,
    loadInitialUnreadCounts,
    initialLoadCompleted,
    prefetchAllTeamUnreadCounts,
  } = useUnreadCounts();

  // Monitor WebSocket connection
  const { isConnected, connectionStatus } = useWebSocket();

  // Listen for unread count updates
  useUnreadCountsListener(setUnreadCounts);

  // If WebSocket reconnects after disconnection, refresh data
  useEffect(() => {
    if (isConnected && connectionStatus.hasDisconnected) {
      // Refresh teams to get updated data
      refreshTeams();

      // Also ensure unread counts are reloaded
      if (!initialLoadCompleted) {
        void loadInitialUnreadCounts();
      }
    }
  }, [
    isConnected,
    connectionStatus,
    refreshTeams,
    loadInitialUnreadCounts,
    initialLoadCompleted,
  ]);

  // Load unread counts when teams are loaded
  useEffect(() => {
    if (teams.length > 0 && !initialLoadCompleted) {
      void prefetchAllTeamUnreadCounts(teams);
    }
  }, [teams, initialLoadCompleted, prefetchAllTeamUnreadCounts]);

  // Initialize unread counts state from teamUnreadCounts
  useEffect(() => {
    if (Object.keys(teamUnreadCounts).length > 0) {
      setUnreadCounts(teamUnreadCounts);
    }
  }, [teamUnreadCounts]);

  // Filter teams based on search term
  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return teams.filter(
      (team) =>
        team.display_name.toLowerCase().includes(lowerSearchTerm) ||
        team.name.toLowerCase().includes(lowerSearchTerm) ||
        (team.description &&
          team.description.toLowerCase().includes(lowerSearchTerm)),
    );
  }, [teams, searchTerm]);

  // Handle team selection
  const handleTeamSelect = useCallback(
    (team: Team) => {
      setActiveTeam(team);

      if (onTeamSelect) {
        onTeamSelect(team);
      }
    },
    [setActiveTeam, onTeamSelect],
  );

  // Handle team action
  const handleTeamAction = useCallback((action: string, team: Team) => {
    // Actions can be implemented as needed
    console.log("Team action:", action, team);
  }, []);

  // Handle search term change
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle create team (would typically open a dialog)
  const handleCreateTeam = useCallback(() => {
    console.log("Open create team dialog");
  }, []);

  return (
    <TeamListUI
      items={filteredTeams}
      activeId={activeTeam?.id}
      variant={variant as "list" | "grid" | "sidebar" | "tabs"}
      density={density as "compact" | "comfortable" | "spacious"}
      isLoading={isLoading || isCreating}
      emptyMessage={emptyMessage}
      unreadCounts={unreadCounts}
      allowCreate={allowCreate}
      showSearch={showSearch}
      searchTerm={searchTerm}
      onItemClick={handleTeamSelect}
      onCreateTeam={handleCreateTeam}
      onTeamAction={handleTeamAction}
      onSearch={handleSearch}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default React.memo(TeamListContainer);
