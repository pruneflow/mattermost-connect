// src/internal/components/teams/variants/TeamTabs.tsx

import React, { useCallback } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { TeamVariantProps } from "../types";
import TeamItemTabs from "./TeamItemTabs";

/**
 * A horizontal tabs view of teams
 */
const TeamTabs: React.FC<TeamVariantProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  maxNameLength = 0,
  allowCreate = false,
  onCreateTeam,
  unreadCounts,
  className,
  sx,
  id,
}) => {
  // Handle tab change - preventing recursion by checking if team is already selected
  const handleTeamSelect = useCallback(
    (teamId: string) => {
      // Only trigger selection if it's not already the selected team
      if (teamId !== selectedTeamId) {
        const team = teams.find((t) => t.id === teamId);
        if (team && onSelectTeam) {
          onSelectTeam(team);
        }
      }
    },
    [teams, selectedTeamId, onSelectTeam],
  );

  // Handle create team button click
  const handleCreateTeam = useCallback(() => {
    if (onCreateTeam) {
      onCreateTeam();
    }
  }, [onCreateTeam]);

  return (
    <Box
      className={className}
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        display: "block",
        position: "relative",
        zIndex: 1,
        mb: 1,
        ...sx,
      }}
      id={id}
    >
      <Tabs
        value={selectedTeamId || ""}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Team selector tabs"
        sx={{
          minHeight: 48,
          width: "100%",
          "& .MuiTabs-flexContainer": {
            height: "100%",
          },
          "& .MuiTabs-indicator": {
            height: 3,
          },
        }}
      >
        {teams.map((team) => (
          <TeamItemTabs
            key={team.id}
            value={team.id}
            team={team}
            isActive={team.id === selectedTeamId}
            onClick={handleTeamSelect}
            showIcon={showIcons}
            maxNameLength={maxNameLength}
            unreadCounts={unreadCounts}
          />
        ))}

        {allowCreate && (
          <Tab
            icon={<AddIcon />}
            iconPosition="start"
            label="Create"
            onClick={handleCreateTeam}
          />
        )}
      </Tabs>
    </Box>
  );
};

export default TeamTabs;
