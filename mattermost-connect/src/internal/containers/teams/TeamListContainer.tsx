// src/internal/containers/teams/TeamListContainer.tsx
/**
 * Container for displaying and managing team lists
 * Supports different view variants, search, and team actions
 */
import React, { useCallback, useMemo, useState } from "react";
import { useTeams } from "../../../hooks";
import { Team } from "../../../types";
import TeamSelector from "../../components/teams/components/TeamSelector";
import { useDialog } from "../../hooks/useDialog";
import { useListContainer } from "../base/ListContainer";
import TeamCreateContainer from "./TeamCreateContainer";
import { SxProps, Theme } from "@mui/material";

export interface TeamListContainerProps {
  /** Teams array (optional, will use store teams if not provided) */
  teams?: Team[];
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
  /** Callback when a team is selected (for notification only, optional) */
  onSelectTeam?: (team: Team) => void;
  /** Callback when create team is successful (for notification only, optional) */
  onCreateSuccess?: (team: Team) => void;
  /** Callback when team action is performed (for notification only, optional) */
  onTeamAction?: (action: string, team: Team) => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Container for displaying and managing team lists
 * Supports different view variants, search, and team actions
 */
const TeamListContainer: React.FC<TeamListContainerProps> = (props) => {
  const {
    teams: propTeams,
    variant = "list",
    density = "comfortable",
    allowCreate = false,
    showSearch = true,
    emptyMessage = "No teams found",
    onSelectTeam,
    onCreateSuccess,
    onTeamAction,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();
  const {
    teams: fetchedTeams,
    selectTeam,
    isLoading,
    refreshTeams,
  } = useTeams();

  // Use provided teams or fetched teams
  const teams = propTeams || fetchedTeams;

  // State for create team dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Setup list container with search, selection, etc.
  const [listState, listAPI] = useListContainer({
    items: teams,
    idField: "id",
    displayField: "display_name",
    searchFields: ["display_name", "name", "description"],
    sortFields: [
      { field: "display_name", label: "Name" },
      { field: "type", label: "Type" },
    ],
    initialSortField: "display_name",
    onItemSelect: (team) => handleTeamSelect(team),
    emptyMessage: emptyMessage,
  });

  // Handle team selection
  const handleTeamSelect = useCallback(
    (team: Team) => {
      // Use the built-in selectTeam functionality
      selectTeam(team);

      if (listAPI) {
        listAPI.selectItem(team);
      }

      // Notify parent component if callback provided
      if (onSelectTeam) {
        onSelectTeam(team);
      }
    },
    [selectTeam, listAPI, onSelectTeam],
  );

  // Handle create team button click
  const handleCreateTeam = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  // Handle team creation success
  const handleCreateSuccess = useCallback(
    (team: Team) => {
      setShowCreateDialog(false);

      // Refresh teams list
      refreshTeams();

      // Select the newly created team
      selectTeam(team);

      // Notify parent if callback provided
      if (onCreateSuccess) {
        onCreateSuccess(team);
      }
    },
    [refreshTeams, selectTeam, onCreateSuccess],
  );

  // Handle create dialog cancel
  const handleCreateCancel = useCallback(() => {
    setShowCreateDialog(false);
  }, []);

  // Handle search input changes
  const handleSearch = useCallback(
    (term: string) => {
      listAPI.setSearchTerm(term);
    },
    [listAPI],
  );

  // Determine display options based on variant
  const showDescription = useMemo(() => {
    return variant !== "tabs" && variant !== "sidebar";
  }, [variant]);

  const showMemberCount = useMemo(() => {
    return variant !== "tabs" && variant !== "sidebar";
  }, [variant]);

  // Create team dialog using existing container
  const createTeamDialog = showCreateDialog ? (
    <TeamCreateContainer
      onCreateSuccess={handleCreateSuccess}
      onCancel={handleCreateCancel}
    />
  ) : null;

  return (
    <>
      <TeamSelector
        teams={listState.items}
        selectedTeamId={listState.selectedIds[0]}
        onSelectTeam={handleTeamSelect}
        variant={variant}
        showIcons={true}
        showDescription={showDescription}
        showMemberCount={showMemberCount}
        allowCreate={allowCreate}
        onCreateTeam={handleCreateTeam}
        showSearch={showSearch}
        searchTerm={listState.searchTerm}
        onSearch={handleSearch}
        className={className}
        sx={sx}
        id={id}
      />
      {createTeamDialog}
    </>
  );
};

export default TeamListContainer;
