// src/internal/components/teams/variants/TeamSidebar.tsx

import React from "react";
import { Box, Stack, Tooltip, IconButton } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { TeamVariantProps } from "../types";
import TeamItemSidebar from "./TeamItemSidebar";

/**
 * A vertical sidebar with team icons
 */
const TeamSidebar: React.FC<TeamVariantProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showDescription = false,
  showMemberCount = false,
  allowCreate = false,
  onCreateTeam,
  unreadCounts,
  className,
  sx,
  id,
}) => {
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
        display: "flex",
        height: "100%",
        position: "relative",
        ...sx,
      }}
      id={id}
    >
      {/* Team icons sidebar */}
      <Box
        sx={{
          width: "100px",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? theme.palette.grey[900]
              : theme.palette.grey[100],
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 2,
          pb: 2,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Stack spacing={2} sx={{ width: "100%", alignItems: "center" }}>
          {teams.map((team) => (
            <TeamItemSidebar
              key={team.id}
              team={team}
              isSelected={team.id === selectedTeamId}
              onClick={onSelectTeam}
              showDescription={showDescription}
              showMemberCount={showMemberCount}
              unreadCounts={unreadCounts}
            />
          ))}
        </Stack>

        {allowCreate && (
          <Box
            sx={{
              mt: "auto",
              display: "flex",
              justifyContent: "center",
              px: 1,
            }}
          >
            <Tooltip title="Create Team" placement="right" arrow>
              <IconButton onClick={handleCreateTeam} color="primary">
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TeamSidebar;
