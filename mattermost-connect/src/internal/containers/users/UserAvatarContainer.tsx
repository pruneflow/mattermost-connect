// src/internal/containers/users/UserAvatarContainer.tsx
/**
 * User Avatar Container
 * Container component for user avatars
 * Delegates business logic to useUser hook
 */
import React, { useCallback } from "react";
import UserAvatarUI from "../../components/users/UserAvatarUI";
import { User } from "../../../types";
import { useUser } from "../../../hooks";

/**
 * User avatar container props
 */
export interface UserAvatarContainerProps {
  /**
   * User ID to display
   */
  userId: string;
  /**
   * User object (optional, will be fetched if not provided)
   */
  user?: User;
  /**
   * Size of the avatar
   */
  size?: "small" | "medium" | "large" | number;
  /**
   * Whether to show the user's status indicator
   */
  showStatus?: boolean;
  /**
   * Whether to show the user's name
   */
  showName?: boolean;
  /**
   * Position of the name relative to the avatar
   */
  namePosition?: "right" | "bottom";
  /**
   * Whether to show a tooltip with user information
   */
  showTooltip?: boolean;
  /**
   * Whether to prefer username over full name
   */
  preferUsername?: boolean;
  /**
   * Whether the avatar is clickable
   */
  clickable?: boolean;
  /**
   * Callback when avatar is clicked
   */
  onClick?: (user: User) => void;
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
 * User Avatar Container
 * Renders a user avatar with optional status indicator and name
 */
const UserAvatarContainer: React.FC<UserAvatarContainerProps> = (props) => {
  const {
    userId,
    user: propUser,
    size = "medium",
    showStatus = true,
    showName = false,
    namePosition = "right",
    showTooltip = true,
    preferUsername = false,
    clickable = false,
    onClick,
    className,
    sx,
    id,
  } = props;

  // Use user hook for user data
  const {
    user: fetchedUser,
    status,
    displayName,
    initials,
    profileImageUrl,
    isLoading,
  } = useUser(userId);

  // If user prop is provided, prefer it over fetched user
  const user = propUser || fetchedUser;

  // Handle avatar click
  const handleClick = useCallback(() => {
    if (clickable && onClick && user) {
      onClick(user);
    }
  }, [clickable, onClick, user]);

  // Calculate display name based on preferences
  const userDisplayName = useCallback(() => {
    if (user) {
      if (preferUsername) {
        return user.username;
      }

      // Use the display name from the hook if available
      if (displayName) {
        return displayName;
      }

      // Calculate display name from user object
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";
      const nickname = user.nickname || "";

      if (nickname) {
        return nickname;
      }

      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }

      return user.username;
    }

    return "";
  }, [user, displayName, preferUsername]);

  // Calculate initials if not provided by the hook
  const userInitials = useCallback(() => {
    if (initials) {
      return initials;
    }

    const name = userDisplayName();
    if (!name) return "?";

    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "?";

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [initials, userDisplayName]);

  // Render the avatar UI component
  return (
    <UserAvatarUI
      displayName={userDisplayName()}
      imageUrl={profileImageUrl || undefined}
      initials={userInitials()}
      status={showStatus ? status : undefined}
      size={size}
      showName={showName}
      namePosition={namePosition}
      tooltipDisabled={!showTooltip}
      clickable={clickable}
      onClick={handleClick}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserAvatarContainer;
