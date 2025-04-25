// src/internal/components/teams/TeamListUI.tsx

import React from "react";
import { Team } from "../../../index";
import { ListComponentProps } from "../../types/componentTypes";
import TeamSelector from "./components/TeamSelector";

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

  // Determine if description should be shown based on density and variant
  const showDescription = variant !== "tabs" && density !== "compact";

  // Determine if member count should be shown
  const showMemberCount = density !== "compact" && variant !== "tabs";

  return (
    <TeamSelector
      teams={items}
      selectedTeamId={activeId}
      onSelectTeam={onItemClick}
      variant={variant as "list" | "grid" | "tabs" | "sidebar"}
      showIcons={true}
      showDescription={showDescription}
      showMemberCount={showMemberCount}
      allowCreate={allowCreate}
      showSearch={showSearch}
      searchTerm={searchTerm || ""}
      onSearch={(term) => {
        // Aucune logique, juste un passage de prop
        if (onTeamAction) {
          onTeamAction("search", {
            id: "",
            name: term,
            display_name: term,
          } as Team);
        }
      }}
      onCreateTeam={onCreateTeam}
      unreadCounts={unreadCounts}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamListUI;
