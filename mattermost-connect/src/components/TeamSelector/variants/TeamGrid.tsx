// src/components/TeamSelector/variants/TeamGrid.tsx
import React from "react";
import { Team } from "../../../types";

// Material-UI Components
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Tooltip,
  Grid,
  SxProps,
  Theme,
} from "@mui/material";

// Material-UI Icons
import {
  People as MembersIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";

// Utils
import {
  formatTeamName,
  generateColorFromString,
  getTeamInitials,
} from "../../../utils/formatting";

/**
 * Props for the TeamGrid component
 */
export interface TeamGridProps {
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
 * A grid view of teams as cards
 */
const TeamGrid: React.FC<TeamGridProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  showDescriptions = false,
  showMemberCount = false,
  maxNameLength = 0,
  teamItemSx,
  selectedTeamSx,
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {teams.map((team) => {
          const isSelected = team.id === selectedTeamId;

          return (
            <Grid size={{ xs: 12, sm: 4, md: 3 }} key={team.id}>
              <Card
                elevation={isSelected ? 3 : 1}
                sx={{
                  borderRadius: 2,
                  position: "relative",
                  border: isSelected ? 2 : 0,
                  borderColor: "primary.main",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 3,
                  },
                  ...(isSelected ? (selectedTeamSx as any) : {}),
                  ...(teamItemSx as any),
                }}
              >
                <CardActionArea
                  onClick={() => onSelectTeam(team)}
                  sx={{ height: "100%" }}
                >
                  <CardContent sx={{ textAlign: "center", pt: 3, pb: 2 }}>
                    {showIcons && (
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: generateColorFromString(team.name),
                          fontSize: "1.5rem",
                          mb: 2,
                          mx: "auto",
                        }}
                      >
                        {getTeamInitials(team.display_name)}
                      </Avatar>
                    )}

                    <Typography
                      variant="h6"
                      component="div"
                      gutterBottom
                      sx={{
                        fontWeight: 600,
                        minHeight: showDescriptions ? 32 : "auto",
                      }}
                    >
                      {formatTeamName(team.display_name, maxNameLength)}
                    </Typography>

                    {showDescriptions && team.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          height: 40,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {team.description}
                      </Typography>
                    )}

                    {showMemberCount && team.member_count && (
                      <Tooltip title="Members">
                        <Chip
                          icon={<MembersIcon />}
                          label={team.member_count}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Tooltip>
                    )}
                  </CardContent>
                </CardActionArea>

                {/* Selected indicator */}
                {isSelected && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 1,
                    }}
                  >
                    <CheckIcon color="primary" fontSize="small" />
                  </Box>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default TeamGrid;
