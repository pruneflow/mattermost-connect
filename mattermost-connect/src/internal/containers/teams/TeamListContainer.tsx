// src/internal/containers/teams/TeamListContainer.tsx
/**
 * Container component for team list that manages data fetching and state
 */
import React, {
  useCallback,
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useTeams } from "../../../hooks/useTeams";
import { BaseComponentProps } from "../../types/componentTypes";
import TeamListUI from "../../components/teams/TeamListUI";
import { Team } from "../../../index";
import { useTeamCreation } from "../../../hooks/useTeams";
import { DisplayVariant, DensityVariant } from "../../types/componentTypes";
import { useUnreadCounts } from "../../../hooks/useUnreadCounts";
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

  // State to force re-render when unread counts update
  const [forceUpdate, setForceUpdate] = useState(0);

  // Ref to track if we've forced an update for initial data
  const hasForceUpdatedRef = useRef(false);

  // Get teams data from hook
  const { teams, activeTeam, isLoading, error, setActiveTeam, refreshTeams } =
    useTeams();

  // Team creation mutation
  const { createTeam, isCreating } = useTeamCreation();

  // Get unread counts from optimized hook
  const { teamUnreadCounts, loadInitialUnreadCounts, initialLoadCompleted } =
    useUnreadCounts();

  // Monitor WebSocket connection
  const { isConnected, connectionStatus } = useWebSocket();

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

  // Force a re-render when unread counts change
  useEffect(() => {
    // If we have teams and unread counts
    if (teams.length > 0 && Object.keys(teamUnreadCounts).length > 0) {
      // If we haven't already forced an update for the initial data
      if (!hasForceUpdatedRef.current) {
        hasForceUpdatedRef.current = true;
        // Force re-render with a slight delay to ensure data is processed
        setTimeout(() => {
          setForceUpdate((prev) => prev + 1);
        }, 100);
      }
    }
  }, [teams, teamUnreadCounts]);

  // Listen for custom unread counts update events
  useEffect(() => {
    const handleUnreadCountsUpdate = () => {
      // Force re-render to reflect new unread counts
      setForceUpdate((prev) => prev + 1);
    };

    window.addEventListener("unreadCountsUpdated", handleUnreadCountsUpdate);
    return () => {
      window.removeEventListener(
        "unreadCountsUpdated",
        handleUnreadCountsUpdate,
      );
    };
  }, []);

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

  // Handle create team (placeholder - would typically open a dialog)
  const handleCreateTeam = useCallback(() => {
    // Example implementation - would typically open a dialog
    // then call createTeam with form data
    console.log("Open create team dialog");
  }, []);

  // Format unread counts for UI - includes forceUpdate in dependencies
  // to ensure it recalculates when forced
  const unreadCountsForUI = useMemo(() => {
    const result: Record<string, { msg_count: number; mention_count: number }> =
      {};

    teams.forEach((team) => {
      result[team.id] = {
        msg_count: teamUnreadCounts[team.id]?.msg_count || 0,
        mention_count: teamUnreadCounts[team.id]?.mention_count || 0,
      };
    });

    return result;
  }, [teams, teamUnreadCounts, forceUpdate]);

  return (
    <TeamListUI
      items={filteredTeams}
      activeId={activeTeam?.id}
      variant={variant as "list" | "grid" | "sidebar" | "tabs"}
      density={density as "compact" | "comfortable" | "spacious"}
      isLoading={isLoading || isCreating}
      emptyMessage={emptyMessage}
      unreadCounts={unreadCountsForUI}
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
