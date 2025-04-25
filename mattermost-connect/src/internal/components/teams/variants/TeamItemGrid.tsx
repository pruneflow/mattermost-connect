// src/internal/components/teams/variants/TeamItemGrid.tsx
/**
 * Grid item component for displaying a team in the TeamGrid variant
 */
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
import { BaseComponentProps } from "../../../types/componentTypes";
import TeamAvatar from "../TeamAvatar";
import { formatTeamName, hasUnreadMessages, hasUnreadMentions } from "../utils";

export interface TeamItemGridProps extends BaseComponentProps {
  /** Team data */
  team: Team;
  /** Whether the team is selected */
  isSelected?: boolean;
  /** Callback when team is clicked */
  onClick?: (team: Team) => void;
  /** Show team avatar/icon */
  showIcon?: boolean;
  /** Show team description */
  showDescription?: boolean;
  /** Show member count */
  showMemberCount?: boolean;
  /** Maximum name length before truncating */
  maxNameLength?: number;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
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
  const hasMessages = hasUnreadMessages(team, unreadCounts);
  const hasMentions = hasUnreadMentions(team, unreadCounts);

  // Get the mention count if any
  const mentionCount =
    hasMentions && unreadCounts && unreadCounts[team.id]
      ? unreadCounts[team.id].mentionCount
      : 0;

  // Handle team click
  const handleClick = () => {
    if (onClick) {
      onClick(team);
    }
  };

  return (
    <Card
      className={className}
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
        ...sx,
      }}
      id={id}
    >
      <CardActionArea onClick={handleClick} sx={{ height: "100%" }}>
        <CardContent sx={{ textAlign: "center", pt: 3, pb: 2 }}>
          {showIcon && (
            <Box sx={{ position: "relative", mb: 2 }}>
              <TeamAvatar
                team={team}
                size="large"
                mentionCount={mentionCount}
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
  );
};

export default TeamItemGrid;
