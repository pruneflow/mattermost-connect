// src/internal/containers/teams/TeamListContainer.tsx
/**
 * Container component for team list that manages data fetching and state
 */
import React, { useCallback, useState, useMemo } from "react";
import { useTeams } from "../../../hooks/useTeams";
import { BaseComponentProps } from "../../types/componentTypes";
import TeamListUI from "../../components/teams/TeamListUI";
import { Team } from "../../../index";
import { useTeamCreation } from "../../../hooks/useTeams";
import { DisplayVariant, DensityVariant } from "../../types/componentTypes";
import { useUnreadCounts } from "../../../hooks/useUnreadCounts";

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

  // Get teams data from hook
  const { teams, activeTeam, isLoading, error, setActiveTeam, refreshTeams } =
    useTeams();

  // Team creation mutation
  const { createTeam, isCreating } = useTeamCreation();

  // Get unread counts from optimized hook
  const { teamUnreadCounts } = useUnreadCounts();

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

  // Format unread counts for UI
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
  }, [teams, teamUnreadCounts]);

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
      onSearchChange={handleSearch}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default React.memo(TeamListContainer);
