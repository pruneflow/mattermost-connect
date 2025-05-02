// src/internal/containers/users/UserAvatarContainer.tsx
/**
 * User Avatar Container
 * Container component that handles user avatar logic and state
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useCallback } from "react";
import {
  BaseContainer,
  BaseContainerProps,
  BaseContainerState,
  BaseContainerAPI,
} from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { default as UserAvatarUI } from "../../components/users/UserAvatarUI";
import { UserStatus } from "../../../types";

/**
 * User avatar container props
 */
export interface UserAvatarContainerProps extends BaseContainerProps {
  /** User ID */
  userId?: string;
  /** Avatar size (default: 40) */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show status indicator (default: true) */
  showStatus?: boolean;
  /** Whether to show user name (default: false) */
  showName?: boolean;
  /** Whether to show tooltip (default: true) */
  showTooltip?: boolean;
  /** Prefer username over full name (default: false) */
  preferUsername?: boolean;
  /** Override status */
  status?: UserStatus;
  /** Override display name */
  displayName?: string;
  /** Override initials */
  initials?: string;
  /** Override image src */
  src?: string;
  /** Text variant for name */
  textVariant?: "body1" | "body2" | "subtitle1" | "subtitle2";
  /** Name position relative to avatar (default: "right") */
  namePosition?: "right" | "bottom";
  /** Callback on avatar click */
  onClick?: (userId: string) => void;
  /** Whether avatar is clickable */
  clickable?: boolean;
  /** CSS class for avatar */
  avatarClassName?: string;
  /** CSS class for name */
  nameClassName?: string;
  /** CSS class for status badge */
  badgeClassName?: string;
}

/**
 * Container component for user avatars
 * Handles user data fetching and state, while delegating rendering to UserAvatarUI
 */
export const UserAvatarContainer: React.FC<UserAvatarContainerProps> = (
  props,
) => {
  const {
    userId,
    size = 40,
    showStatus = true,
    showName = false,
    showTooltip = true,
    preferUsername = false,
    status: statusOverride,
    displayName: displayNameOverride,
    initials: initialsOverride,
    src: srcOverride,
    textVariant = "body2",
    namePosition = "right",
    onClick,
    clickable = !!onClick,
    avatarClassName,
    nameClassName,
    badgeClassName,
    ...restProps
  } = props;

  // Use container user hook for data and state management
  const { displayName, initials, imageUrl, status, isLoading, error } =
    useContainerUser(userId, {
      avatarSize: typeof size === "number" ? size : undefined,
      showStatus,
      showName,
      showTooltip,
      preferUsername,
    });

  // Use overrides if provided
  const finalDisplayName = displayNameOverride || displayName;
  const finalInitials = initialsOverride || initials;
  const finalSrc = srcOverride || imageUrl;
  const finalStatus = statusOverride || status;

  // Handle click event
  const handleClick = useCallback(() => {
    if (onClick && userId) {
      onClick(userId);
    }
  }, [onClick, userId]);

  // Create UI component factory function
  const createUI = useCallback(
    (api: BaseContainerAPI, state: BaseContainerState): React.ReactElement => {
      // Utiliser l'état du container et l'API quand c'est pertinent
      const isComponentLoading = state.isLoading || isLoading;
      const componentError = state.error || error;

      // Créer les props UI en utilisant aussi les états du container
      const avatarUIProps = {
        displayName: finalDisplayName,
        imageUrl: finalSrc,
        status: finalStatus,
        size,
        showStatus,
        clickable,
        onClick: clickable ? handleClick : undefined,
        className: avatarClassName,
        sx: {},
        // Utiliser l'état de chargement et d'erreur du container
        isLoading: isComponentLoading,
        error: componentError,
      };

      return <UserAvatarUI {...avatarUIProps} />;
    },
    [
      finalDisplayName,
      finalSrc,
      finalStatus,
      size,
      showStatus,
      clickable,
      handleClick,
      avatarClassName,
      isLoading,
      error,
    ],
  );

  // Render the UI component with prepared props through the factory function
  return <BaseContainer {...restProps} render={createUI} />;
};

export default UserAvatarContainer;
