// src/internal/containers/users/UserCardContainer.tsx
/**
 * User Card Container
 * Standardized container for displaying user cards
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useCallback, useMemo } from "react";
import {
  BaseContainer,
  BaseContainerProps,
  BaseContainerState,
  BaseContainerAPI,
} from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { default as UserCardUI } from "../../components/users/UserCardUI";
import { User, UserStatus } from "../../../types";

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
  status?: UserStatus;
  /** Whether to show user role */
  showRole?: boolean;
  /** Whether to show user email */
  showEmail?: boolean;
  /** Avatar size */
  avatarSize?: "small" | "medium" | "large" | number;
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
    variant,
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
    if (avatarSize)
      return typeof avatarSize === "string" ? avatarSize : avatarSize;

    switch (variant) {
      case "compact":
        return "small";
      case "expanded":
        return "large";
      default:
        return "medium";
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
    avatarSize:
      typeof getAvatarSize() === "number"
        ? (getAvatarSize() as number)
        : undefined,
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

  // Create UI component factory function
  const createUI = useCallback(
    (api: BaseContainerAPI, state: BaseContainerState): React.ReactElement => {
      // Utiliser l'état du container et l'API quand c'est pertinent
      const isComponentLoading = state.isLoading || isLoading;
      const componentError = state.error || error;
      const hasComponentError = state.hasError || hasError;

      // Fonction de rafraîchissement qui utilise l'API du container
      const refreshData = () => {
        api.withLoading(async () => {
          await refreshUser();
        });
      };

      // Créer les props UI en utilisant aussi les états du container
      const cardUIProps = {
        user,
        displayName: finalDisplayName,
        status: finalStatus,
        variant,
        showActions,
        availableActions,
        showRole,
        showEmail,
        onActionClick: handleActionClick,
        onClick: handleCardClick,
        selected,
        isLoading: isComponentLoading,
        hasError: hasComponentError,
        error: componentError,
        onRefresh: refreshData,
        actionsRenderer: actionsRenderer
          ? (user: User) => actionsRenderer(userId || "", user)
          : undefined,
        contentRenderer: contentRenderer
          ? (user: User) => contentRenderer(userId || "", user)
          : undefined,
        elevation,
        outlined,
        isCurrentUser,
        avatarSize: getAvatarSize(),
      };

      return <UserCardUI {...cardUIProps} />;
    },
    [
      user,
      finalDisplayName,
      finalStatus,
      variant,
      showActions,
      availableActions,
      showRole,
      showEmail,
      handleActionClick,
      handleCardClick,
      selected,
      isLoading,
      hasError,
      error,
      refreshUser,
      actionsRenderer,
      contentRenderer,
      userId,
      elevation,
      outlined,
      isCurrentUser,
      getAvatarSize,
    ],
  );

  // Render the UI component with prepared props through the factory function
  return <BaseContainer {...restProps} render={createUI} />;
};

export default UserCardContainer;
