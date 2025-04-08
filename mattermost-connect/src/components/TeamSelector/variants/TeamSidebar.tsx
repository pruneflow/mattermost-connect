// src/components/TeamSelector/variants/TeamSidebar.tsx
import React from "react";
import { Team } from "../../../types";

// Material-UI Components
import {
  Box,
  Stack,
  Avatar,
  Tooltip,
  Badge,
  IconButton,
  Zoom,
  SxProps,
  Theme,
  Paper,
  Typography,
  Divider,
} from "@mui/material";

// Material-UI Icons
import { People as MembersIcon } from "@mui/icons-material";

// Utils
import { generateColorFromString } from "../../../utils/formatting";

/**
 * Props for the TeamSidebar component
 */
export interface TeamSidebarProps {
  /** Teams to display */
  teams: Team[];

  /** Currently selected team ID */
  selectedTeamId?: string;

  /** Callback when a team is selected */
  onSelectTeam: (team: Team) => void;

  /** Show team icons (if available) */
  showIcons?: boolean;

  /** Show team descriptions */
  showDescriptions?: boolean;

  /** Show team member count badges */
  showMemberCount?: boolean;

  /** Max number of characters for team name before truncating (0 for no limit) */
  maxNameLength?: number;

  /** Custom styling for team items */
  teamItemSx?: SxProps<Theme>;

  /** Custom styling for selected team */
  selectedTeamSx?: SxProps<Theme>;
}

/**
 * A vertical sidebar with team icons
 */
const TeamSidebar: React.FC<TeamSidebarProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true, // Always true for sidebar
  showDescriptions = false,
  showMemberCount = false,
  maxNameLength = 0, // Not used in sidebar, but kept for API consistency
  teamItemSx,
  selectedTeamSx,
}) => {
  // Current team for displaying info panel
  const [hoverTeam, setHoverTeam] = React.useState<Team | null>(null);

  // Get the initials from team name
  const getTeamInitials = (team: Team): string => {
    const words = team.display_name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (
      words[0].charAt(0) + words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Team icons sidebar */}
      <Box
        sx={{
          width: 72,
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
          {teams.map((team) => {
            const isSelected = team.id === selectedTeamId;

            return (
              <Box
                key={team.id}
                sx={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                }}
                onMouseEnter={() => setHoverTeam(team)}
                onMouseLeave={() => setHoverTeam(null)}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 4,
                      height: 20,
                      bgcolor: "primary.main",
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                    }}
                  />
                )}

                <Tooltip
                  title={
                    <Box>
                      <Typography variant="body2">
                        {team.display_name}
                      </Typography>
                      {showMemberCount && team.member_count && (
                        <Typography variant="caption" color="text.secondary">
                          {team.member_count} members
                        </Typography>
                      )}
                    </Box>
                  }
                  placement="right"
                  TransitionComponent={Zoom}
                >
                  <IconButton
                    onClick={() => onSelectTeam(team)}
                    sx={{
                      p: 0.5,
                      borderRadius: 2,
                      border: isSelected ? 2 : 0,
                      borderColor: "primary.main",
                      transform: isSelected ? "scale(1.1)" : "scale(1)",
                      transition: "all 0.2s ease-in-out",
                      ...(isSelected ? (selectedTeamSx as any) : {}),
                      ...(teamItemSx as any),
                    }}
                  >
                    <Badge
                      overlap="circular"
                      badgeContent={
                        showMemberCount && team.member_count
                          ? team.member_count
                          : null
                      }
                      color="primary"
                      max={99}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: generateColorFromString(team.name),
                          fontSize: "1rem",
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        {getTeamInitials(team)}
                      </Avatar>
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Info panel when hovering (optional) */}
      {hoverTeam && showDescriptions && (
        <Box
          sx={{
            position: "absolute",
            left: 80,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            maxWidth: 240,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {hoverTeam.display_name}
            </Typography>

            {hoverTeam.description && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {hoverTeam.description}
                </Typography>
              </>
            )}

            {showMemberCount && hoverTeam.member_count && (
              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                <MembersIcon
                  fontSize="small"
                  sx={{ mr: 0.5, color: "text.secondary" }}
                />
                <Typography variant="caption" color="text.secondary">
                  {hoverTeam.member_count} members
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default TeamSidebar;
