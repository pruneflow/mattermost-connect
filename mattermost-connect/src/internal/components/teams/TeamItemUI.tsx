// src/internal/components/teams/TeamItemUI.tsx
/**
 * Component that displays a single team item
 */
import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Typography,
  Box,
  IconButton,
  Card,
  CardActionArea,
  CardContent,
  Tab,
} from "@mui/material";
import { MoreVert as MoreIcon } from "@mui/icons-material";
import { stringToColor, Team } from "../../../index";
import { ItemComponentProps } from "../../types/componentTypes";
import { UnreadBadge } from "../common";
import { getInitials } from "../../utils/helper";

export interface TeamItemUIProps extends ItemComponentProps<Team> {
  /** Display variant */
  variant?: "list" | "grid" | "sidebar" | "tabs";
  /** Unread message count */
  unreadCount?: number;
  /** Unread mention count */
  mention_count?: number;
  /** Whether the item is a compact version */
  compact?: boolean;
}

const TeamItemUI: React.FC<TeamItemUIProps> = ({
  item,
  isActive = false,
  showActions = false,
  isLoading = false,
  variant = "list",
  unreadCount = 0,
  mention_count = 0,
  compact = false,
  onClick,
  onAction,
  className,
  sx,
  id,
}) => {
  // Generate display elements
  const initials = getInitials(item.display_name);
  const bgColor = stringToColor(item.name);

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  // Handle more options click
  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction("more", item);
    }
  };

  // Render different variants
  switch (variant) {
    case "sidebar":
      return (
        <Tooltip title={item.display_name} placement="right" arrow>
          <ListItem
            disablePadding
            className={className}
            sx={{
              mb: 1,
              ...sx,
            }}
            id={id}
          >
            <ListItemButton
              selected={isActive}
              onClick={handleClick}
              disabled={isLoading}
              sx={{
                borderRadius: 2,
                justifyContent: "center",
                p: 1,
              }}
            >
              <UnreadBadge
                count={unreadCount}
                mention_count={mention_count}
                showZero={false}
                mentionPriority={true}
              >
                <Avatar
                  sx={{
                    bgcolor: bgColor,
                    width: 40,
                    height: 40,
                  }}
                >
                  {initials}
                </Avatar>
              </UnreadBadge>
            </ListItemButton>
          </ListItem>
        </Tooltip>
      );

    case "tabs":
      return (
        <Tab
          label={
            <UnreadBadge
              count={unreadCount}
              mention_count={mention_count}
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
                {item.display_name}
              </Typography>
            </UnreadBadge>
          }
          value={item.id}
          disabled={isLoading}
          onClick={handleClick}
          className={className}
          sx={sx}
          id={id}
        />
      );

    case "grid":
      return (
        <Card
          className={className}
          sx={{
            width: "100%",
            maxWidth: 200,
            borderRadius: 2,
            ...(isActive && {
              borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
            }),
            ...sx,
          }}
          id={id}
        >
          <CardActionArea onClick={handleClick} disabled={isLoading}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <UnreadBadge
                  count={unreadCount}
                  mention_count={mention_count}
                  showZero={false}
                  mentionPriority={true}
                >
                  <Avatar
                    sx={{
                      bgcolor: bgColor,
                      width: 60,
                      height: 60,
                      fontSize: "1.5rem",
                      mb: 1,
                    }}
                  >
                    {initials}
                  </Avatar>
                </UnreadBadge>
                <Typography
                  variant="subtitle1"
                  noWrap
                  sx={{
                    textAlign: "center",
                    maxWidth: "100%",
                  }}
                >
                  {item.display_name}
                </Typography>
                {!compact && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{
                      textAlign: "center",
                      maxWidth: "100%",
                    }}
                  >
                    {item.description || `@${item.name}`}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      );

    case "list":
    default:
      return (
        <ListItem
          disablePadding
          secondaryAction={
            showActions && (
              <IconButton
                edge="end"
                onClick={handleMoreClick}
                disabled={isLoading}
                size="small"
              >
                <MoreIcon />
              </IconButton>
            )
          }
          className={className}
          sx={sx}
          id={id}
        >
          <ListItemButton
            selected={isActive}
            onClick={handleClick}
            disabled={isLoading}
            sx={{
              borderRadius: 1,
            }}
          >
            <ListItemIcon>
              <UnreadBadge
                count={unreadCount}
                mention_count={mention_count}
                showZero={false}
                mentionPriority={true}
              >
                <Avatar sx={{ bgcolor: bgColor }}>{initials}</Avatar>
              </UnreadBadge>
            </ListItemIcon>
            <ListItemText
              primary={item.display_name}
              secondary={
                !compact ? item.description || `@${item.name}` : undefined
              }
              primaryTypographyProps={{
                variant: compact ? "body2" : "body1",
                noWrap: true,
              }}
              secondaryTypographyProps={{
                noWrap: true,
              }}
            />
          </ListItemButton>
        </ListItem>
      );
  }
};

export default TeamItemUI;
