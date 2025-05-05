// src/internal/containers/teams/TeamListContainer.tsx
import React, { useCallback, useMemo } from "react";
import { useListContainer } from "../base/ListContainer";
import { useContainerTeam } from "../../hooks/useContainerTeam";
import { Team } from "../../../types";
import TeamListUI from "../../components/teams/TeamListUI";

export interface TeamListContainerProps {
  teams?: Team[];
  variant?: "grid" | "list" | "compact";
  showFilters?: boolean;
  showSearch?: boolean;
  showPagination?: boolean;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  onSelectTeam?: (team: Team) => void;
  onTeamAction?: (action: string, team: Team) => void;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

const TeamListContainer: React.FC<TeamListContainerProps> = (props) => {
  const {
    teams: propTeams,
    variant = "grid",
    showFilters = true,
    showSearch = true,
    showPagination = true,
    showEmptyState = true,
    emptyStateMessage = "No teams found",
    onSelectTeam,
    onTeamAction,
    className,
    sx,
    id,
  } = props;

  const { teams: fetchedTeams, selectTeam } = useContainerTeam();
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
    emptyMessage: emptyStateMessage,
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

  const filteredTeams = useMemo(() => {
    return listState.items;
  }, [listState.items]);

  const uiProps = {
    teams: filteredTeams,
    variant,
    isLoading: listState.isLoading,
    isEmpty: listState.isEmpty,
    error: listState.error,
    searchTerm: listState.searchTerm,
    sortField: listState.sortField,
    sortDirection: listState.sortDirection,
    page: listState.page,
    perPage: listState.perPage,
    totalPages: listState.totalPages,
    showFilters,
    showSearch,
    showPagination,
    showEmptyState,
    onTeamAction: handleTeamAction,
    onSearchChange: listAPI.setSearchTerm,
    onSortChange: listAPI.setSorting,
    onPageChange: listAPI.setPage,
    onPerPageChange: listAPI.setPerPage,
    className,
    sx,
    id,
  };

  return <TeamListUI {...uiProps} />;
};

export default TeamListContainer;
