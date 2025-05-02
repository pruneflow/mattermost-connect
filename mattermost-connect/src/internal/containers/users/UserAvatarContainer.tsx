// src/internal/containers/users/UserAvatarContainer.tsx
/**
 * User Avatar Container
 * Container component that handles user avatar logic and state
 */
import React from "react";
import { BaseContainer, BaseContainerProps } from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { default as UserAvatarUI } from "../../components/users/UserAvatarUI";

// Keep the existing props interface
export interface UserAvatarContainerProps extends BaseContainerProps {
  /** User ID */
  userId?: string;
  /** Avatar size (default: 40) */
  size?: number;
  /** Whether to show status indicator (default: true) */
  showStatus?: boolean;
  /** Whether to show user name (default: false) */
  showName?: boolean;
  /** Whether to show tooltip (default: true) */
  showTooltip?: boolean;
  /** Prefer username over full name (default: false) */
  preferUsername?: boolean;
  /** Override status */
  status?: string;
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

  // Keep the useContainerUser hook for logic
  const { displayName, initials, imageUrl, status, isLoading, error } =
    useContainerUser(userId, {
      avatarSize: size,
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

  // Handle click event, maintaining container logic
  const handleClick = React.useCallback(() => {
    if (onClick && userId) {
      onClick(userId);
    }
  }, [onClick, userId]);

  // Prepare UI props - this is the key transformation between container and UI
  const avatarUiProps = {
    displayName: finalDisplayName,
    initials: finalInitials,
    src: finalSrc,
    status: showStatus ? finalStatus : undefined,
    size,
    showName,
    namePosition,
    textVariant,
    isLoading,
    error,
    showTooltip,
    onClick: clickable ? handleClick : undefined,
    avatarClassName,
    nameClassName,
    badgeClassName,
  };

  // Render the UI component with the prepared props
  return (
    <BaseContainer
      {...restProps}
      render={(api, state) => <UserAvatarUI {...avatarUiProps} />}
    />
  );
};

export default UserAvatarContainer;
