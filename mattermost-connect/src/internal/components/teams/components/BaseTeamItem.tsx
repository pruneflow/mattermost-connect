// src/internal/components/teams/components/BaseTeamItem.tsx

import React from "react";
import { Box } from "@mui/material";
import { TeamItemProps } from "../types";
import { hasUnreadMessages, hasUnreadMentions } from "../utils";

export interface BaseTeamItemProps extends TeamItemProps {
  /** Whether to show team description */
  showDescription?: boolean;
  /** Whether to show member count */
  showMemberCount?: boolean;
  /** Maximum name length before truncation */
  maxNameLength?: number;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { msg_count: number; mention_count: number }>;
  /** Children to render (item content) */
  children?: React.ReactNode;
}

/**
 * Base component for team items with common functionality
 */
const BaseTeamItem: React.FC<BaseTeamItemProps> = ({
  team,
  isSelected = false,
  showDescription = false,
  showMemberCount = false,
  maxNameLength = 0,
  unreadCounts,
  onClick,
  children,
  className,
  sx,
  id,
}) => {
  // Check for unread messages or mentions
  const hasMessages = hasUnreadMessages(team, unreadCounts);
  const hasMentions = hasUnreadMentions(team, unreadCounts);

  // Get the mention count if any
  const mention_count =
    hasMentions && unreadCounts && unreadCounts[team.id]
      ? unreadCounts[team.id].mention_count
      : 0;

  // Handle team click
  const handleClick = () => {
    if (onClick) {
      onClick(team);
    }
  };

  return (
    <Box
      className={className}
      sx={{
        position: "relative",
        ...(isSelected && {
          // Common selected styles
          fontWeight: "bold",
        }),
        ...(hasMessages &&
          !isSelected && {
            // Common unread styles
            fontWeight: "bold",
          }),
        ...sx,
      }}
      id={id}
      onClick={handleClick}
    >
      {children}
    </Box>
  );
};

export default BaseTeamItem;
