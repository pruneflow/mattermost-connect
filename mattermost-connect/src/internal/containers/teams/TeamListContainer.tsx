// src/internal/containers/teams/TeamListContainer.tsx
import React, { useCallback, useMemo } from "react";
import { useListContainer } from "../base/ListContainer";
import { useContainerTeam } from "../../hooks/useContainerTeam";
import { Team } from "../../../types";
import TeamSelector from "../../components/teams/components/TeamSelector";
import { useDialog } from "../../hooks/useDialog";

export interface TeamListContainerProps {
  teams?: Team[];
  variant?: "list" | "grid" | "tabs" | "sidebar";
  showFilters?: boolean;
  showSearch?: boolean;
  showPagination?: boolean;
  allowCreate?: boolean;
  onSelectTeam?: (team: Team) => void;
  onTeamAction?: (action: string, team: Team) => void;
  onCreateTeam?: () => void;
  className?: string;
  sx?: React.CSSProperties;
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
    showFilters = true,
    showSearch = true,
    showPagination = true,
    allowCreate = false,
    onSelectTeam,
    onTeamAction,
    onCreateTeam,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();
  const { teams: fetchedTeams, selectTeam, isLoading } = useContainerTeam();
  const teams = propTeams || fetchedTeams;

  const [listState, listAPI] = useListContainer({
    items: teams,
    idField: "id",
    displayField: "display_name",
    searchFields: ["display_name", "name", "description"],
    sortFields: [
      { field: "display_name", label: "Name" },
      { field: "member_count", label: "Members" },
      { field: "type", label: "Type" },
    ],
    initialSortField: "display_name",
    onItemSelect: (team) => {
      selectTeam(team);
      if (onSelectTeam) {
        onSelectTeam(team);
      }
    },
    className,
    sx,
    id,
  });

  const handleTeamAction = useCallback(
    (action: string, team: Team) => {
      if (action === "select") {
        selectTeam(team);
        if (onSelectTeam) {
          onSelectTeam(team);
        }
        return;
      }

      if (onTeamAction) {
        onTeamAction(action, team);
      }
    },
    [selectTeam, onSelectTeam, onTeamAction],
  );

  const handleSearch = useCallback(
    (term: string) => {
      listAPI.setSearchTerm(term);
    },
    [listAPI],
  );

  // Calculate if we need to show each type of indicator
  const showDescription = useMemo(() => {
    return variant !== "tabs" && variant !== "sidebar";
  }, [variant]);

  const showMemberCount = useMemo(() => {
    return variant !== "tabs" && variant !== "sidebar";
  }, [variant]);

  return (
    <TeamSelector
      teams={listState.items}
      selectedTeamId={listState.selectedIds[0]}
      onSelectTeam={listAPI.selectItem}
      variant={variant}
      showIcons={true}
      showDescription={showDescription}
      showMemberCount={showMemberCount}
      allowCreate={allowCreate}
      showSearch={showSearch}
      searchTerm={listState.searchTerm}
      onSearch={handleSearch}
      onCreateTeam={onCreateTeam}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamListContainer;
