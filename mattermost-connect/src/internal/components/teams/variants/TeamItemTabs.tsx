// src/internal/components/teams/variants/TeamItemTabs.tsx

import React from "react";
import { Tab, Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Team } from "../../../../index";
import { TeamItemProps } from "../types";
import BaseTeamItem from "../components/BaseTeamItem";
import TeamAvatar from "../components/TeamAvatar";
import { formatTeamName } from "../utils";
import { UnreadBadge } from "../../../components/common";

export interface TeamItemTabsProps extends TeamItemProps {
  /** Show team avatar/icon */
  showIcon?: boolean;
  /** Maximum name length before truncating */
  maxNameLength?: number;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
}

/**
 * Team item component for tabs view
 */
const TeamItemTabs: React.FC<TeamItemTabsProps> = ({
  team,
  isSelected = false,
  onClick,
  showIcon = true,
  maxNameLength = 0,
  unreadCounts,
  className,
  sx,
  id,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get unread counts
  const unreadState =
    unreadCounts && unreadCounts[team.id]
      ? unreadCounts[team.id]
      : { messageCount: 0, mentionCount: 0 };

  return (
    <BaseTeamItem
      team={team}
      isSelected={isSelected}
      onClick={() => {
        /* BaseTeamItem handles this */
      }}
      unreadCounts={unreadCounts}
      className={className}
      sx={sx}
      id={id}
    >
      <Tab
        value={team.id}
        onClick={(e) => {
          if (onClick) onClick(team);
        }}
        label={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexDirection: isMobile ? "column" : "row",
              gap: 1,
            }}
          >
            {showIcon && <TeamAvatar team={team} size={24} />}

            <UnreadBadge
              count={unreadState.messageCount}
              mentionCount={unreadState.mentionCount}
              showZero={false}
              mentionPriority={true}
            >
              <Typography
                variant="body2"
                noWrap
                sx={{
                  maxWidth: 120,
                  textTransform: "none",
                }}
              >
                {formatTeamName(team.display_name, maxNameLength)}
              </Typography>
            </UnreadBadge>
          </Box>
        }
        sx={{
          minHeight: 48,
          py: 1,
          px: 2,
          fontWeight: isSelected
            ? 600
            : unreadState.messageCount > 0
              ? 600
              : 400,
          color:
            unreadState.messageCount > 0 && !isSelected
              ? "text.primary"
              : undefined,
          "&.Mui-selected": {
            color: "primary.main",
          },
        }}
      />
    </BaseTeamItem>
  );
};

export default TeamItemTabs;
