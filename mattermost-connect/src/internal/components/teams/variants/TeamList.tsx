// src/internal/components/teams/variants/TeamList.tsx
/**
 * Component that displays teams in a list format
 */
import React from "react";
import { List, Box, Divider, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { BaseComponentProps } from "../../../types/componentTypes";
import { SearchInput } from "../../../components/common";
import TeamItemList from "./TeamItemList";

export interface TeamListProps extends BaseComponentProps {
  /** Teams to display */
  teams: Team[];
  /** Currently selected team ID */
  selectedTeamId?: string;
  /** Callback when a team is selected */
  onSelectTeam: (team: Team) => void;
  /** Whether to show icons */
  showIcons?: boolean;
  /** Whether to show descriptions */
  showDescriptions?: boolean;
  /** Whether to show member counts */
  showMemberCount?: boolean;
  /** Max name length before truncation */
  maxNameLength?: number;
  /** Whether to allow team creation */
  allowCreate?: boolean;
  /** Whether to show search input */
  showSearch?: boolean;
  /** Current search term */
  searchTerm?: string;
  /** Callback when search changes */
  onSearch?: (term: string) => void;
  /** Callback when create team is clicked */
  onCreateTeam?: () => void;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
}

/**
 * A list view of teams
 */
const TeamList: React.FC<TeamListProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  showDescriptions = false,
  showMemberCount = false,
  maxNameLength = 0,
  allowCreate = false,
  showSearch = false,
  searchTerm = "",
  onSearch,
  onCreateTeam,
  unreadCounts,
  className,
  sx,
  id,
}) => {
  // Handle search change
  const handleSearch = (value: string) => {
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle create team button click
  const handleCreateTeam = () => {
    if (onCreateTeam) {
      onCreateTeam();
    }
  };

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
            onSearch={handleSearch}
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
        {teams.map((team, index) => (
          <React.Fragment key={team.id}>
            <TeamItemList
              team={team}
              isSelected={team.id === selectedTeamId}
              onClick={onSelectTeam}
              showIcon={showIcons}
              showDescription={showDescriptions}
              showMemberCount={showMemberCount}
              maxNameLength={maxNameLength}
              unreadCounts={unreadCounts}
            />

            {/* Add divider between teams if descriptions are shown */}
            {showDescriptions && index < teams.length - 1 && (
              <Divider variant="middle" sx={{ my: 1 }} />
            )}
          </React.Fragment>
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
};

export default TeamList;
