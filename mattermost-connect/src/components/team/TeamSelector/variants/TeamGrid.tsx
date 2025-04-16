// src/components/team/TeamSelector/variants/TeamGrid.tsx
import React from "react";
import { Team } from "../../../../types";

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
  Badge,
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
} from "../../../../utils";

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

  /** Unread counts for teams */
  teamUnreadCounts?: Record<
    string,
    { msg_count: number; mention_count: number }
  >;
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
  teamUnreadCounts = {},
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {teams.map((team) => {
          const isSelected = team.id === selectedTeamId;
          const unreadState = teamUnreadCounts[team.id] || {
            msg_count: 0,
            mention_count: 0,
          };
          const hasUnreadMentions = unreadState.mention_count > 0;
          const hasUnreadMessages = unreadState.msg_count > 0;

          return (
            <Grid size={{ xs: 12, sm: 4, md: 3 }} key={team.id}>
              <Card
                elevation={isSelected ? 3 : hasUnreadMentions ? 2 : 1}
                sx={{
                  borderRadius: 2,
                  position: "relative",
                  border: isSelected ? 2 : hasUnreadMessages ? 1 : 0,
                  borderColor: isSelected
                    ? "primary.main"
                    : hasUnreadMentions
                      ? "error.main"
                      : hasUnreadMessages
                        ? "primary.light"
                        : "transparent",
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
                      <Box sx={{ position: "relative" }}>
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

                        {/* Badge pour les mentions non lues */}
                        {hasUnreadMentions && (
                          <Badge
                            badgeContent={unreadState.mention_count}
                            color="error"
                            max={99}
                            sx={{
                              position: "absolute",
                              top: -4,
                              right: "30%",
                            }}
                          />
                        )}
                      </Box>
                    )}

                    <Typography
                      component={"div"}
                      variant="h6"
                      gutterBottom
                      sx={{
                        fontWeight: isSelected || hasUnreadMessages ? 600 : 400,
                        minHeight: showDescriptions ? 32 : "auto",
                      }}
                    >
                      {formatTeamName(team.display_name, maxNameLength)}
                    </Typography>

                    {showDescriptions && team.description && (
                      <Typography
                        component={"div"}
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

                    {showMemberCount &&
                      team.member_count &&
                      !hasUnreadMentions && (
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

                {/* Unread messages indicator (dot) */}
                {!isSelected && hasUnreadMessages && !hasUnreadMentions && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      zIndex: 1,
                    }}
                  />
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
