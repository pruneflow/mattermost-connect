// src/internal/containers/users/UserCardContainer.tsx
/**
 * User Card Container
 * Standardized container for displaying user cards
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useCallback, useMemo } from "react";
import { BaseContainer, BaseContainerProps } from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { default as UserCardUI } from "../../components/users/UserCardUI";

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

  // Use container user hook for data and state management
  const {
    user,
    displayName,
    status,
    isLoading,
    error,
    hasError,
    isCurrentUser,
    refreshUser,
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

  // Prepare props for the UI component
  const cardUiProps = {
    user,
    displayName: finalDisplayName,
    status: finalStatus,
    variant,
    isLoading,
    hasError,
    error,
    isCurrentUser,
    showStatus,
    showActions,
    availableActions,
    showRole,
    showEmail,
    elevation,
    outlined,
    selected,
    onActionClick: handleActionClick,
    onClick: handleCardClick,
    onRefresh: refreshUser,
    actionsRenderer,
    contentRenderer,
    avatarSize: getAvatarSize(),
  };

  // Render the UI component with prepared props
  return (
    <BaseContainer
      {...restProps}
      render={(api, state) => <UserCardUI {...cardUiProps} />}
    />
  );
};

export default UserCardContainer;
