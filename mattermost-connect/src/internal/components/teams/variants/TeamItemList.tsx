// src/internal/components/teams/variants/TeamItemList.tsx

import React from "react";
import {
  ListItemButton,
  ListItemIcon,
  Badge,
  Typography,
  Box,
} from "@mui/material";
import { People as MembersIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { TeamItemProps } from "../types";
import BaseTeamItem from "../components/BaseTeamItem";
import TeamAvatar from "../components/TeamAvatar";
import { formatTeamName } from "../utils";

export interface TeamItemListProps extends TeamItemProps {
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
 * Team item component for list view
 */
const TeamItemList: React.FC<TeamItemListProps> = ({
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
  return (
    <BaseTeamItem
      team={team}
      isSelected={isSelected}
      onClick={onClick}
      showDescription={showDescription}
      showMemberCount={showMemberCount}
      maxNameLength={maxNameLength}
      unreadCounts={unreadCounts}
      className={className}
      sx={sx}
      id={id}
    >
      <ListItemButton
        selected={isSelected}
        sx={{
          borderRadius: 1,
          mb: 0.5,
          "&.Mui-selected": {
            backgroundColor: (theme) => theme.palette.action.selected,
            color: "primary.main",
            "&:hover": {
              backgroundColor: (theme) => theme.palette.action.hover,
            },
          },
        }}
      >
        {showIcon && (
          <ListItemIcon sx={{ minWidth: 40 }}>
            <TeamAvatar
              team={team}
              size="small"
              mention_count={
                unreadCounts && unreadCounts[team.id]
                  ? unreadCounts[team.id].mention_count
                  : 0
              }
              showMentionBadge={
                unreadCounts && unreadCounts[team.id]
                  ? unreadCounts[team.id].mention_count > 0
                  : false
              }
            />
          </ListItemIcon>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            overflow: "hidden",
            mr: 1,
          }}
        >
          <Typography
            variant="body1"
            component="div"
            noWrap
            fontWeight={
              isSelected
                ? 600
                : unreadCounts &&
                    unreadCounts[team.id] &&
                    unreadCounts[team.id].msg_count > 0
                  ? 600
                  : 400
            }
          >
            {formatTeamName(team.display_name, maxNameLength)}
          </Typography>

          {showDescription && team.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              component="div"
              noWrap
              sx={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {team.description}
            </Typography>
          )}
        </Box>

        {/* Member count badge */}
        {showMemberCount &&
          team.member_count &&
          !(
            unreadCounts &&
            unreadCounts[team.id] &&
            (unreadCounts[team.id].msg_count > 0 ||
              unreadCounts[team.id].mention_count > 0)
          ) && (
            <Badge
              badgeContent={team.member_count}
              color="primary"
              max={999}
              sx={{ ml: 0.5 }}
            >
              <MembersIcon fontSize="small" />
            </Badge>
          )}

        {/* Unread indicators handled via Badge component */}
        {unreadCounts && unreadCounts[team.id] && (
          <>
            {/* Mentions badge */}
            {unreadCounts[team.id].mention_count > 0 && (
              <Badge
                badgeContent={unreadCounts[team.id].mention_count}
                color="error"
                max={99}
                sx={{ ml: 0.5 }}
              />
            )}

            {/* Unread message indicator */}
            {unreadCounts[team.id].msg_count > 0 &&
              unreadCounts[team.id].mention_count === 0 && (
                <Badge variant="dot" color="primary" sx={{ ml: 0.5 }} />
              )}
          </>
        )}
      </ListItemButton>
    </BaseTeamItem>
  );
};

export default TeamItemList;
