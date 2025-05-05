// src/internal/components/users/UserCardUI.tsx
/**
 * User Card UI Component
 * Pure presentational component for displaying user cards
 */
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  IconButton,
  Skeleton,
  CardActionArea,
  CardActions,
  Alert,
} from "@mui/material";
import {
  Message as MessageIcon,
  MoreVert as MoreIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import UserAvatarUI from "./UserAvatarUI";
import { BaseComponentProps } from "../../types/componentTypes";
import { User, UserStatus } from "../../../types";

/**
 * User card UI props
 */
export interface UserCardUIProps extends BaseComponentProps {
  /** User data */
  user: User | null;
  /** User's display name */
  displayName: string;
  /** User's status */
  status: UserStatus;
  /** Card variant */
  variant?: "default" | "compact" | "expanded";
  /** Whether the component is loading */
  isLoading?: boolean;
  /** Whether the component has an error */
  hasError?: boolean;
  /** Error object if there is an error */
  error?: Error | null;
  /** Whether the user is the current user */
  isCurrentUser?: boolean;
  /** Whether to show user status */
  showStatus?: boolean;
  /** Whether to show actions */
  showActions?: boolean;
  /** Available actions */
  availableActions?: string[];
  /** Whether to show user role */
  showRole?: boolean;
  /** Whether to show user email */
  showEmail?: boolean;
  /** Card elevation */
  elevation?: number;
  /** Whether card is outlined */
  outlined?: boolean;
  /** Whether card is selected */
  selected?: boolean;
  /** Avatar size */
  avatarSize?: number;
  /** Callback when an action is clicked */
  onActionClick?: (actionId: string) => void;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback to refresh user data */
  onRefresh?: () => void;
  /** Custom actions renderer */
  actionsRenderer?: (user: User | null) => React.ReactNode;
  /** Custom content renderer */
  contentRenderer?: (user: User | null) => React.ReactNode;
}

/**
 * User Card UI Component
 * Displays user information in a card format with various layouts
 */
const UserCardUI: React.FC<UserCardUIProps> = (props) => {
  const {
    user,
    displayName,
    status,
    variant = "default",
    isLoading = false,
    hasError = false,
    error,
    isCurrentUser = false,
    showStatus = true,
    showActions = true,
    availableActions = ["message", "profile"],
    showRole = true,
    showEmail = true,
    elevation = 1,
    outlined = false,
    selected = false,
    avatarSize,
    onActionClick,
    onClick,
    onRefresh,
    actionsRenderer,
    contentRenderer,
    className,
    sx,
    id,
  } = props;

  // Determine avatar size based on variant
  const getAvatarSize = () => {
    if (avatarSize) return avatarSize;

    switch (variant) {
      case "compact":
        return 40;
      case "expanded":
        return 80;
      default:
        return 56;
    }
  };

  // Handle action click with action ID
  const handleAction = (actionId: string) => (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    if (onActionClick) {
      onActionClick(actionId);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card
        className={className}
        sx={{
          width: "100%",
          ...sx,
        }}
        id={id}
        elevation={elevation}
        variant={outlined ? "outlined" : undefined}
        raised={selected}
      >
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Skeleton
              variant="circular"
              width={getAvatarSize()}
              height={getAvatarSize()}
            />
            <Box sx={{ ml: 2, flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
          </Box>
          {variant === "expanded" && (
            <>
              <Skeleton
                variant="text"
                width="100%"
                height={20}
                sx={{ mt: 2 }}
              />
              <Skeleton variant="text" width="80%" height={20} />
            </>
          )}
        </CardContent>
        {showActions && variant !== "compact" && (
          <CardActions>
            <Skeleton
              variant="rectangular"
              width={90}
              height={36}
              sx={{ borderRadius: 1 }}
            />
          </CardActions>
        )}
      </Card>
    );
  }

  // Render error state
  if (hasError || !user) {
    return (
      <Card
        className={className}
        sx={{ width: "100%", ...sx }}
        id={id}
        elevation={elevation}
        variant={outlined ? "outlined" : undefined}
      >
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.message || "Failed to load user data"}
          </Alert>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="outlined"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show more options if available in actions
  const showMoreOptions = showActions && availableActions.includes("more");

  // Create card content
  const content = (
    <CardContent>
      {contentRenderer ? (
        contentRenderer(user)
      ) : (
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <UserAvatarUI
                displayName={displayName}
                imageUrl={
                  user.last_picture_update
                    ? `${user.id}/image?_=${user.last_picture_update}`
                    : undefined
                }
                status={showStatus ? status : undefined}
                size={getAvatarSize()}
              />
              <Box sx={{ ml: 2 }}>
                <Typography
                  variant={variant === "compact" ? "subtitle1" : "h6"}
                  component="div"
                >
                  {displayName}
                  {isCurrentUser && (
                    <Chip
                      label="You"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                    />
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {variant === "compact"
                    ? user.username
                    : showEmail && user.email
                      ? user.email
                      : user.username}
                </Typography>
              </Box>
            </Box>

            {showActions && showMoreOptions && (
              <IconButton
                size="small"
                onClick={handleAction("more")}
                aria-label="more options"
              >
                <MoreIcon />
              </IconButton>
            )}
          </Box>

          {variant === "expanded" && (
            <>
              <Divider sx={{ my: 2 }} />

              {showRole && user.roles && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                  >
                    Roles
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    {user.roles.split(" ").map((role) => (
                      <Chip
                        key={role}
                        label={role}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </CardContent>
  );

  // Show message button and custom actions
  const showMessageButton =
    showActions &&
    availableActions.includes("message") &&
    variant !== "compact";

  const showProfileButton =
    showActions &&
    availableActions.includes("profile") &&
    variant === "expanded";

  const showRefreshButton = showActions && availableActions.includes("refresh");

  // Render actions if needed
  const actions =
    showActions &&
    (showMessageButton ||
      showProfileButton ||
      showRefreshButton ||
      actionsRenderer) ? (
      <CardActions>
        {actionsRenderer ? (
          actionsRenderer(user)
        ) : (
          <>
            {showProfileButton && (
              <Button
                size="small"
                startIcon={<PersonIcon />}
                onClick={handleAction("profile")}
              >
                Profile
              </Button>
            )}

            {showMessageButton && (
              <Button
                size="small"
                startIcon={<MessageIcon />}
                onClick={handleAction("message")}
              >
                Message
              </Button>
            )}

            {showRefreshButton && (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleAction("refresh")}
              >
                Refresh
              </Button>
            )}
          </>
        )}
      </CardActions>
    ) : null;

  // Main card component
  return (
    <Card
      className={className}
      sx={{
        width: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease-in-out",
        "&:hover": onClick
          ? {
              boxShadow: (theme) => theme.shadows[4],
              transform: "translateY(-2px)",
            }
          : {},
        ...(selected
          ? {
              border: (theme) => `2px solid ${theme.palette.primary.main}`,
              boxShadow: (theme) => theme.shadows[4],
            }
          : {}),
        ...sx,
      }}
      id={id}
      elevation={elevation}
      variant={outlined ? "outlined" : undefined}
      onClick={onClick}
    >
      {onClick ? <CardActionArea>{content}</CardActionArea> : content}
      {actions}
    </Card>
  );
};

export default UserCardUI;
