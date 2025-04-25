// src/internal/components/teams/variants/TeamItemGrid.tsx

import React from "react";
import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  People as MembersIcon,
} from "@mui/icons-material";
import { Team } from "../../../../index";
import { TeamItemProps } from "../types";
import BaseTeamItem from "../components/BaseTeamItem";
import TeamAvatar from "../components/TeamAvatar";
import { formatTeamName } from "../utils";

export interface TeamItemGridProps extends TeamItemProps {
  /** Show team avatar/icon */
  showIcon?: boolean;
  /** Show team description */
  showDescription?: boolean;
  /** Show member count */
  showMemberCount?: boolean;
  /** Maximum name length before truncating */
  maxNameLength?: number;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { msg_count: number; mention_count: number }>;
}

/**
 * Team item component for grid view
 */
const TeamItemGrid: React.FC<TeamItemGridProps> = ({
  team,
  isSelected = false,
  onClick,
  showIcon = true,
  showDescription = false,
  showMemberCount = false,
  maxNameLength = 0,
  unreadCounts,
  className,
  sx,
  id,
}) => {
  // Check for unread messages or mentions
  const hasMessages =
    unreadCounts &&
    unreadCounts[team.id] &&
    unreadCounts[team.id].msg_count > 0;
  const hasMentions =
    unreadCounts &&
    unreadCounts[team.id] &&
    unreadCounts[team.id].mention_count > 0;

  // Get the mention count if any
  const mention_count =
    hasMentions && unreadCounts ? unreadCounts[team.id].mention_count : 0;

  return (
    <BaseTeamItem
      team={team}
      isSelected={isSelected}
      onClick={() => {
        /* BaseTeamItem handles this */
      }}
      showDescription={showDescription}
      showMemberCount={showMemberCount}
      maxNameLength={maxNameLength}
      unreadCounts={unreadCounts}
      className={className}
      sx={sx}
      id={id}
    >
      <Card
        elevation={isSelected ? 3 : hasMentions ? 2 : 1}
        sx={{
          borderRadius: 2,
          position: "relative",
          border: isSelected ? 2 : hasMessages ? 1 : 0,
          borderColor: isSelected
            ? "primary.main"
            : hasMentions
              ? "error.main"
              : hasMessages
                ? "primary.light"
                : "transparent",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: 3,
          },
        }}
      >
        <CardActionArea
          onClick={() => {
            if (onClick) onClick(team);
          }}
          sx={{ height: "100%" }}
        >
          <CardContent sx={{ textAlign: "center", pt: 3, pb: 2 }}>
            {showIcon && (
              <Box sx={{ position: "relative", mb: 2 }}>
                <TeamAvatar
                  team={team}
                  size="large"
                  mention_count={mention_count}
                  showMentionBadge={hasMentions}
                  sx={{ mx: "auto" }}
                />
              </Box>
            )}

            <Typography
              component={"div"}
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: isSelected || hasMessages ? 600 : 400,
                minHeight: showDescription ? 32 : "auto",
              }}
            >
              {formatTeamName(team.display_name, maxNameLength)}
            </Typography>

            {showDescription && team.description && (
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

            {showMemberCount && team.member_count && !hasMentions && (
              <Chip
                icon={<MembersIcon />}
                label={team.member_count}
                size="small"
                sx={{ mt: 1 }}
              />
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
        {!isSelected && hasMessages && !hasMentions && (
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
    </BaseTeamItem>
  );
};

export default TeamItemGrid;
