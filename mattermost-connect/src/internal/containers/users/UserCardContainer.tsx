// src/internal/containers/users/UserCardContainer.tsx
/**
 * User Card Container
 * Standardized container for displaying user cards
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useCallback, useMemo } from "react";
import { BaseContainer, BaseContainerProps } from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import UserCardUI, { UserCardUIProps } from "../../components/users/UserCardUI";
import { User } from "../../../types";

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
  actionsRenderer?: (userId: string, user: User | null) => React.ReactNode;
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
  contentRenderer?: (userId: string, user: User | null) => React.ReactNode;
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

  // Transform the custom renderers to match the UI component API
  const transformedActionsRenderer = useMemo(() => {
    if (!actionsRenderer) return undefined;
    return (userParam: User | null) => actionsRenderer(userId || "", userParam);
  }, [actionsRenderer, userId]);

  const transformedContentRenderer = useMemo(() => {
    if (!contentRenderer) return undefined;
    return (userParam: User | null) => contentRenderer(userId || "", userParam);
  }, [contentRenderer, userId]);

  // Prepare UI component renderer function that uses BaseContainer state and API
  const createUI = useCallback(
    (baseState: any, baseApi: any): React.ReactElement => {
      // Combine loading state from container user hook and base container
      const combinedLoading = isLoading || baseState.isLoading;
      const combinedError = error || baseState.error;

      // Create UI props
      const cardUIProps: UserCardUIProps = {
        user,
        displayName: finalDisplayName,
        status: finalStatus,
        variant,
        isLoading: combinedLoading,
        hasError: hasError || !!combinedError,
        error: combinedError || error,
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
        actionsRenderer: transformedActionsRenderer,
        contentRenderer: transformedContentRenderer,
        avatarSize: getAvatarSize(),
        className: restProps.className,
        sx: restProps.sx,
        id: restProps.id,
      };

      return <UserCardUI {...cardUIProps} />;
    },
    [
      user,
      finalDisplayName,
      finalStatus,
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
      handleActionClick,
      handleCardClick,
      refreshUser,
      transformedActionsRenderer,
      transformedContentRenderer,
      getAvatarSize,
      restProps.className,
      restProps.sx,
      restProps.id,
    ],
  );

  // Render the UI component with prepared props
  return <BaseContainer {...restProps} render={createUI} />;
};

export default UserCardContainer;
