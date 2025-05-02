// src/internal/containers/users/UserCardContainer.tsx
/**
 * User Card Container
 * Standardized container for displaying user cards
 */
import React, { useCallback, useMemo } from "react";
import { BaseContainer, BaseContainerProps } from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { UserAvatarContainer } from "./UserAvatarContainer";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
  Skeleton,
  Divider,
} from "@mui/material";
import { userService } from "../../../core/services/userService";

/**
 * User card container props
 */
export interface UserCardContainerProps extends BaseContainerProps {
  /** User ID */
  userId?: string;
  /** Card variant */
  variant?: "default" | "compact" | "expanded";
  /** Whether to show actions */
  showActions?: boolean;
  /** Available actions */
  availableActions?: string[];
  /** Custom actions renderer */
  actionsRenderer?: (userId: string, user: any) => React.ReactNode;
  /** Callback when action is clicked */
  onAction?: (actionId: string, userId: string) => void;
  /** Callback when card is clicked */
  onClick?: (userId: string) => void;
  /** Card elevation */
  elevation?: number;
  /** Whether card is outlined */
  outlined?: boolean;
  /** Whether to show user status */
  showStatus?: boolean;
  /** Override display name */
  displayName?: string;
  /** Override status */
  status?: string;
  /** Whether to show user role */
  showRole?: boolean;
  /** Whether to show user email */
  showEmail?: boolean;
  /** Avatar size */
  avatarSize?: number;
  /** Custom content renderer */
  contentRenderer?: (userId: string, user: any) => React.ReactNode;
  /** Whether card is selectable */
  selectable?: boolean;
  /** Whether card is selected */
  selected?: boolean;
  /** On selection change callback */
  onSelectionChange?: (userId: string, selected: boolean) => void;
}

/**
 * User Card Container
 * Displays a card with user information and actions
 *
 * @example
 * ```tsx
 * <UserCardContainer
 *   userId="user123"
 *   variant="default"
 *   showActions
 *   showStatus
 *   showEmail
 * />
 * ```
 */
export const UserCardContainer: React.FC<UserCardContainerProps> = (props) => {
  const {
    userId,
    variant = "default",
    showActions = true,
    availableActions = ["message", "profile"],
    actionsRenderer,
    onAction,
    onClick,
    elevation = 1,
    outlined = false,
    showStatus = true,
    displayName: displayNameOverride,
    status: statusOverride,
    showRole = true,
    showEmail = true,
    avatarSize,
    contentRenderer,
    selectable = false,
    selected = false,
    onSelectionChange,
    ...restProps
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

  // Use container user hook
  const {
    user,
    displayName,
    status,
    isLoading,
    error,
    hasError,
    isCurrentUser,
    refreshUser,
    dialog,
  } = useContainerUser(userId, {
    avatarSize: getAvatarSize(),
    showStatus,
  });

  // Use overrides if provided
  const finalDisplayName = displayNameOverride || displayName;
  const finalStatus = statusOverride || status;

  // Handle card click
  const handleCardClick = useCallback(() => {
    if (selectable && onSelectionChange) {
      onSelectionChange(userId || "", !selected);
    } else if (onClick) {
      onClick(userId || "");
    }
  }, [selectable, onSelectionChange, onClick, userId, selected]);

  // Handle action click
  const handleActionClick = useCallback(
    (actionId: string) => {
      if (onAction) {
        onAction(actionId, userId || "");
      }
    },
    [onAction, userId],
  );

  // Render actions
  const renderActions = useMemo(() => {
    if (!showActions) return null;

    if (actionsRenderer && user) {
      return actionsRenderer(userId || "", user);
    }

    return (
      <CardActions>
        {availableActions.includes("message") && (
          <Button size="small" onClick={() => handleActionClick("message")}>
            Message
          </Button>
        )}
        {availableActions.includes("profile") && (
          <Button size="small" onClick={() => handleActionClick("profile")}>
            View Profile
          </Button>
        )}
        {isCurrentUser && availableActions.includes("edit") && (
          <Button size="small" onClick={() => handleActionClick("edit")}>
            Edit Profile
          </Button>
        )}
      </CardActions>
    );
  }, [
    showActions,
    actionsRenderer,
    user,
    userId,
    availableActions,
    handleActionClick,
    isCurrentUser,
  ]);

  // Render content
  const renderContent = useMemo(() => {
    if (isLoading) {
      return (
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Skeleton
              variant="circular"
              width={getAvatarSize()}
              height={getAvatarSize()}
            />
            <Box sx={{ ml: 2 }}>
              <Skeleton width={120} height={24} />
              <Skeleton width={80} height={16} />
            </Box>
          </Box>
          <Skeleton width="100%" height={20} />
          {variant === "expanded" && (
            <>
              <Skeleton width="100%" height={20} />
              <Skeleton width="80%" height={20} />
            </>
          )}
        </CardContent>
      );
    }

    if (hasError || !user) {
      return (
        <CardContent>
          <Typography color="error">
            {error?.message || "Failed to load user information"}
          </Typography>
          <Button size="small" onClick={() => refreshUser()}>
            Retry
          </Button>
        </CardContent>
      );
    }

    if (contentRenderer) {
      return contentRenderer(userId || "", user);
    }

    return (
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <UserAvatarContainer
            userId={userId}
            size={getAvatarSize()}
            showStatus={showStatus}
            displayName={finalDisplayName}
            status={finalStatus}
            showTooltip={false}
          />

          <Box sx={{ ml: 2 }}>
            <Typography variant="h6" component="div">
              {finalDisplayName}
              {isCurrentUser && (
                <Chip
                  label="You"
                  size="small"
                  color="primary"
                  sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                />
              )}
            </Typography>

            {showStatus && (
              <Typography variant="body2" color="text.secondary">
                {userService.formatUserStatus(finalStatus)}
              </Typography>
            )}
          </Box>
        </Box>

        {variant !== "compact" && (
          <>
            {showRole && user.roles && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Role:</strong> {userService.getUserRolesText(user)}
              </Typography>
            )}

            {showEmail && user.email && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Email:</strong> {user.email}
              </Typography>
            )}

            {variant === "expanded" && (
              <>
                <Divider sx={{ my: 1 }} />
                {user.first_name && user.last_name && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>Name:</strong> {user.first_name} {user.last_name}
                  </Typography>
                )}

                {user.nickname && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>Nickname:</strong> {user.nickname}
                  </Typography>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    );
  }, [
    isLoading,
    getAvatarSize,
    variant,
    hasError,
    user,
    error,
    refreshUser,
    contentRenderer,
    userId,
    showStatus,
    finalDisplayName,
    finalStatus,
    isCurrentUser,
    showRole,
    showEmail,
  ]);

  // Render the card container
  return (
    <BaseContainer
      {...restProps}
      render={(api, state) => (
        <Card
          elevation={elevation}
          variant={outlined ? "outlined" : "elevation"}
          onClick={handleCardClick}
          sx={{
            cursor: onClick || selectable ? "pointer" : "default",
            border: selected ? "2px solid" : undefined,
            borderColor: selected ? "primary.main" : undefined,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              boxShadow: onClick || selectable ? 3 : undefined,
            },
            ...restProps.sx,
          }}
        >
          {renderContent}
          {renderActions}
        </Card>
      )}
    />
  );
};

export default UserCardContainer;
