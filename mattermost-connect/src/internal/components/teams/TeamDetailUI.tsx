// src/internal/components/teams/TeamDetailUI.tsx
/**
 * Component that displays detailed information about a team
 */
import React from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Link,
  Grid,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExitToApp as LeaveIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { Team } from "../../../index";
import { BaseComponentProps } from "../../types/componentTypes";
import { getInitials, stringToColor } from "../../utils/helpers";

export interface TeamDetailUIProps extends BaseComponentProps {
  /** Team data */
  team: Team;
  /** Team member count */
  memberCount?: number;
  /** Whether the current user is an admin in this team */
  isAdmin?: boolean;
  /** Whether to show team actions */
  showActions?: boolean;
  /** Size variant */
  variant?: "compact" | "normal" | "expanded";
  /** Callback when edit button is clicked */
  onEdit?: () => void;
  /** Callback when delete button is clicked */
  onDelete?: () => void;
  /** Callback when leave button is clicked */
  onLeave?: () => void;
  /** Callback when members button is clicked */
  onViewMembers?: () => void;
  /** Callback when settings button is clicked */
  onSettings?: () => void;
}

const TeamDetailUI: React.FC<TeamDetailUIProps> = ({
  team,
  memberCount = 0,
  isAdmin = false,
  showActions = true,
  variant = "normal",
  onEdit,
  onDelete,
  onLeave,
  onViewMembers,
  onSettings,
  className,
  sx,
  id,
}) => {
  // Generate background color from team name
  const bgColor = stringToColor(team.name);
  const initials = getInitials(team.display_name);

  // Determine if we should show expanded content
  const isExpanded = variant === "expanded";
  const isCompact = variant === "compact";

  return (
    <Card
      className={className}
      elevation={2}
      sx={{
        width: "100%",
        ...sx,
      }}
      id={id}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: isExpanded ? 2 : 0,
          }}
        >
          <Avatar
            sx={{
              bgcolor: bgColor,
              width: isExpanded ? 80 : 56,
              height: isExpanded ? 80 : 56,
              fontSize: isExpanded ? "2rem" : "1.5rem",
              mr: 2,
            }}
          >
            {initials}
          </Avatar>

          <Box>
            <Typography
              variant={isExpanded ? "h4" : "h6"}
              gutterBottom={isExpanded}
            >
              {team.display_name}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center" }}
            >
              @{team.name}
              {memberCount > 0 && (
                <Chip
                  icon={<PeopleIcon fontSize="small" />}
                  label={memberCount}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </Box>
        </Box>

        {(isExpanded || (!isCompact && team.description)) && (
          <>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Description
            </Typography>

            <Typography variant="body1" paragraph>
              {team.description || "No description provided."}
            </Typography>
          </>
        )}

        {isExpanded && (
          <>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Team Type
                </Typography>
                <Chip
                  label={team.type === "O" ? "Open" : "Invite Only"}
                  size="small"
                  color={team.type === "O" ? "success" : "primary"}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(team.create_at).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>
          </>
        )}
      </CardContent>

      {showActions && (
        <CardActions
          sx={{
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 1,
            px: 2,
            pb: 2,
          }}
        >
          <Button
            size="small"
            startIcon={<PeopleIcon />}
            onClick={onViewMembers}
          >
            Members
          </Button>

          {isAdmin && (
            <>
              <Button size="small" startIcon={<EditIcon />} onClick={onEdit}>
                Edit
              </Button>

              <Button
                size="small"
                startIcon={<SettingsIcon />}
                onClick={onSettings}
              >
                Settings
              </Button>
            </>
          )}

          <Button
            size="small"
            startIcon={<LeaveIcon />}
            color="error"
            variant="outlined"
            onClick={onLeave}
          >
            Leave
          </Button>

          {isAdmin && (
            <Button
              size="small"
              startIcon={<DeleteIcon />}
              color="error"
              variant="outlined"
              onClick={onDelete}
            >
              Delete
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

export default TeamDetailUI;
