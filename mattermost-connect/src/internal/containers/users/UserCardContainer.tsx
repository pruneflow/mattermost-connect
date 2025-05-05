// src/internal/containers/users/UserCardContainer.tsx
/**
 * User Card Container
 * Container component for user cards/info display
 * Delegates business logic to useUser hook
 */
import React, { useCallback } from "react";
import UserCardUI from "../../components/users/UserCardUI";
import { User, UserStatus } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useAuth } from "../../../hooks/useAuth";
import { useUser } from "../../../hooks";

/**
 * User card container props
 */
export interface UserCardContainerProps {
  /**
   * User ID to display
   */
  userId: string;
  /**
   * User object (optional, will be fetched if not provided)
   */
  user?: User;
  /**
   * Card variant
   */
  variant?: "default" | "compact" | "expanded";
  /**
   * Size of the avatar
   */
  avatarSize?: number;
  /**
   * Whether to show the user's status indicator
   */
  showStatus?: boolean;
  /**
   * Whether to show detailed information
   */
  showDetails?: boolean;
  /**
   * Whether to show actions menu
   */
  showActions?: boolean;
  /**
   * Available actions
   */
  availableActions?: string[];
  /**
   * Whether card is outlined
   */
  outlined?: boolean;
  /**
   * Card elevation
   */
  elevation?: number;
  /**
   * Whether card is selected
   */
  selected?: boolean;
  /**
   * Callback when action is performed
   */
  onAction?: (action: string, user: User) => void;
  /**
   * Callback when user card is clicked
   */
  onClick?: (user: User) => void;
  /**
   * Callback when status is changed
   */
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
  /**
   * CSS className
   */
  className?: string;
  /**
   * MUI sx prop for styling
   */
  sx?: React.CSSProperties;
  /**
   * Component ID
   */
  id?: string;
}

/**
 * User Card Container
 * Displays user information in a card format
 */
const UserCardContainer: React.FC<UserCardContainerProps> = (props) => {
  const {
    userId,
    user: propUser,
    variant = "default",
    avatarSize,
    showStatus = true,
    showDetails = true,
    showActions = true,
    availableActions = ["message", "profile"],
    outlined = false,
    elevation = 1,
    selected = false,
    onAction,
    onClick,
    onStatusChange,
    className,
    sx,
    id,
  } = props;

  // Use user hook for user data
  const {
    user: fetchedUser,
    status,
    displayName,
    isCurrentUser,
    isLoading,
    error,
    refreshUser,
    updateStatus,
  } = useUser(userId);

  // Use current user info
  const { currentUser } = useAuth();

  // Use dialog for confirmations
  const dialog = useDialog();

  // If user prop is provided, prefer it over fetched user
  const user = propUser || fetchedUser;

  // Handle card click
  const handleClick = useCallback(() => {
    if (onClick && user) {
      onClick(user);
    }
  }, [onClick, user]);

  // Handle action click
  const handleActionClick = useCallback(
    async (action: string) => {
      if (!user) return;

      // Handle action
      if (action === "message" && onAction) {
        onAction("message", user);
      } else if (action === "profile" && onAction) {
        onAction("profile", user);
      } else if (action === "refresh") {
        await refreshUser();
      } else if (action === "more" && onAction) {
        onAction("more", user);
      } else {
        // Pass any other action to the parent
        if (onAction) {
          onAction(action, user);
        }
      }
    },
    [user, onAction, refreshUser],
  );

  // Get available actions based on current user
  const getActions = useCallback(() => {
    const actions = [...availableActions];

    // Add refresh action if not already present
    if (!actions.includes("refresh")) {
      actions.push("refresh");
    }

    // If this is the current user, add status change action
    if (isCurrentUser && !actions.includes("changeStatus")) {
      actions.push("changeStatus");
    }

    return actions;
  }, [availableActions, isCurrentUser]);

  // Calculate avatar size based on variant
  const getAvatarSize = useCallback(() => {
    if (avatarSize) return avatarSize;

    switch (variant) {
      case "compact":
        return 40;
      case "expanded":
        return 80;
      default:
        return 56;
    }
  }, [variant, avatarSize]);

  // Check if we should show the card is loading
  const isCardLoading = isLoading && !user;

  // Check if we have an error and no user
  const hasError = !!error && !user;

  // Render the user card UI component
  return (
    <UserCardUI
      // Card data
      user={user}
      displayName={displayName || user?.username || ""}
      status={status}
      // Card state
      variant={variant}
      isLoading={isCardLoading}
      hasError={hasError}
      error={error}
      isCurrentUser={isCurrentUser}
      // Card configuration
      showStatus={showStatus}
      showActions={showActions}
      availableActions={getActions()}
      showRole={variant === "expanded"}
      showEmail={showDetails}
      elevation={elevation}
      outlined={outlined}
      selected={selected}
      avatarSize={getAvatarSize()}
      // Callbacks
      onActionClick={handleActionClick}
      onClick={handleClick}
      onRefresh={refreshUser}
      // Styling
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserCardContainer;
