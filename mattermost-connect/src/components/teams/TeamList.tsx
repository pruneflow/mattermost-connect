// src/components/teams/TeamList.tsx
/**
 * Component that displays a list of teams with different viewing options
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import TeamListContainer from "../../internal/containers/teams/TeamListContainer";
import { Team } from "../../types";

export interface TeamListProps {
  /** How to display the teams (list, grid, sidebar, tabs) */
  variant?: "list" | "grid" | "sidebar" | "tabs";
  /** Density of items (compact, comfortable, spacious) */
  density?: "compact" | "comfortable" | "spacious";
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
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * A flexible team list component with multiple display options
 *
 * This component renders a list of teams and can be displayed in different ways:
 * - list: Traditional vertical list
 * - grid: Grid of team cards
 * - sidebar: Compact vertical sidebar with avatars
 * - tabs: Horizontal tabs along the top
 *
 * @example
 * ```tsx
 * // Simple list view
 * <TeamList
 *   variant="list"
 *   onTeamSelect={(team) => console.log('Selected team:', team.display_name)}
 * />
 *
 * // Grid view with search and create option
 * <TeamList
 *   variant="grid"
 *   allowCreate={true}
 *   showSearch={true}
 *   onCreateSuccess={(team) => console.log('Created team:', team)}
 * />
 *
 * // Sidebar view
 * <TeamList variant="sidebar" density="compact" />
 * ```
 */
const TeamList: React.FC<TeamListProps> = ({
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
  return (
    <TeamListContainer
      variant={variant}
      density={density}
      allowCreate={allowCreate}
      showSearch={showSearch}
      emptyMessage={emptyMessage}
      onSelectTeam={onTeamSelect}
      onCreateSuccess={onCreateSuccess}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamList;
