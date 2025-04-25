// src/internal/components/teams/variants/TeamList.tsx

import React from "react";
import { List, Box, Divider, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { TeamSearchableVariantProps } from "../types";
import { BaseComponentProps } from "../../../types/componentTypes";
import { SearchInput } from "../../../components/common";
import TeamItemList from "./TeamItemList";

/**
 * A list view of teams
 */
const TeamList: React.FC<TeamSearchableVariantProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  showDescription = false,
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
              showDescription={showDescription}
              showMemberCount={showMemberCount}
              maxNameLength={maxNameLength}
              unreadCounts={unreadCounts}
            />

            {/* Add divider between teams if descriptions are shown */}
            {showDescription && index < teams.length - 1 && (
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
