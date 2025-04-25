// src/internal/components/teams/variants/TeamGrid.tsx
/**
 * Component that displays teams in a grid format
 */
import React from "react";
import { Box, Grid, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { BaseComponentProps } from "../../../types/componentTypes";
import { SearchInput } from "../../../components/common";
import TeamItemGrid from "./TeamItemGrid";

export interface TeamGridProps extends BaseComponentProps {
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
 * A grid view of teams as cards
 */
const TeamGrid: React.FC<TeamGridProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  showDescriptions = true,
  showMemberCount = true,
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

      <Grid container spacing={2}>
        {teams.map((team) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={team.id}>
            <TeamItemGrid
              team={team}
              isSelected={team.id === selectedTeamId}
              onClick={onSelectTeam}
              showIcon={showIcons}
              showDescription={showDescriptions}
              showMemberCount={showMemberCount}
              maxNameLength={maxNameLength}
              unreadCounts={unreadCounts}
            />
          </Grid>
        ))}

        {allowCreate && (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
                border: "2px dashed",
                borderColor: "divider",
                borderRadius: 2,
                minHeight: 148,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateTeam}
              >
                Create Team
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default TeamGrid;
