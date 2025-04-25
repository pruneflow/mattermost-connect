// src/internal/components/teams/TeamAvatar.tsx
/**
 * Team avatar component that displays the team's initials or icon
 */
import React from "react";
import { Avatar, Badge } from "@mui/material";
import { Team } from "../../../index";
import { BaseComponentProps } from "../../types/componentTypes";
import { getTeamAvatarColor, getTeamInitials } from "./utils";

export interface TeamAvatarProps extends BaseComponentProps {
  /** Team data */
  team: Team;
  /** Size of the avatar */
  size?: "small" | "medium" | "large" | number;
  /** Number of unread mentions */
  mentionCount?: number;
  /** Whether to display the mention badge */
  showMentionBadge?: boolean;
  /** Maximum number to display on badge */
  badgeMax?: number;
}

/**
 * Avatar component for teams that displays initials with a consistent color
 */
const TeamAvatar: React.FC<TeamAvatarProps> = ({
  team,
  size = "medium",
  mentionCount = 0,
  showMentionBadge = false,
  badgeMax = 99,
  className,
  sx,
  id,
}) => {
  // Map size to pixel values
  const sizeMap = {
    small: 32,
    medium: 40,
    large: 64,
  };

  const pixelSize =
    typeof size === "number" ? size : sizeMap[size as keyof typeof sizeMap];
  const fontSize =
    pixelSize <= 32 ? "0.875rem" : pixelSize >= 64 ? "1.5rem" : "1rem";

  // Generate background color based on team name
  const bgColor = getTeamAvatarColor(team);

  // Get team initials
  const initials = getTeamInitials(team);

  const avatar = (
    <Avatar
      className={className}
      sx={{
        width: pixelSize,
        height: pixelSize,
        bgcolor: bgColor,
        fontSize: fontSize,
        fontWeight: 500,
        ...sx,
      }}
      id={id}
    >
      {initials}
    </Avatar>
  );

  // If we don't need to show the mention badge, just return the avatar
  if (!showMentionBadge || mentionCount <= 0) {
    return avatar;
  }

  // Otherwise, wrap in a badge
  return (
    <Badge
      overlap="circular"
      badgeContent={mentionCount}
      color="error"
      max={badgeMax}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
    >
      {avatar}
    </Badge>
  );
};

export default TeamAvatar;
