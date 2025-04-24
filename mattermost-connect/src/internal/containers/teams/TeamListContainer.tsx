// src/internal/containers/teams/TeamListContainer.tsx
/**
 * Container component for team list that manages data fetching and state
 */
import React, { useCallback, useState } from "react";
import { useTeams } from "../../../hooks/useTeams";
import { BaseComponentProps } from "../../types/componentTypes";
import TeamListUI from "../../components/teams/TeamListUI";
import { Team } from "../../../index";
import { useTeamCreation } from "../../../hooks/useTeams";
import { DisplayVariant, DensityVariant } from "../../types/componentTypes";

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

  // Filter teams based on search term
  const filteredTeams = searchTerm
    ? teams.filter(
        (team) =>
          team.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (team.description &&
            team.description.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : teams;

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

  return (
    <TeamListUI
      items={filteredTeams}
      activeId={activeTeam?.id}
      variant={variant as "list" | "grid" | "sidebar" | "tabs"}
      density={density as "compact" | "comfortable" | "spacious"}
      isLoading={isLoading || isCreating}
      emptyMessage={emptyMessage}
      allowCreate={allowCreate}
      showSearch={showSearch}
      searchTerm={searchTerm}
      onItemClick={handleTeamSelect}
      onCreateTeam={handleCreateTeam}
      onTeamAction={handleTeamAction}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamListContainer;
