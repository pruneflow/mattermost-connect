// src/components/users/UserAvatar.tsx
/**
 * User avatar component that displays a user's profile picture or initials
 * with optional status indicator
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import UserAvatarContainer from "../../internal/containers/users/UserAvatarContainer";
import { User, UserStatus } from "../../types";

export interface UserAvatarProps {
  /** User ID - used to fetch user data from store */
  userId?: string;
  /** User data (if no userId is provided) */
  user?: User;
  /** User's display name (if neither userId nor user is provided) */
  displayName?: string;
  /** URL to user's profile image (if neither userId nor user is provided) */
  imageUrl?: string;
  /** User's online status (if neither userId nor user is provided) */
  status?: UserStatus;
  /** Size of the avatar */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show the status indicator */
  showStatus?: boolean;
  /** Whether to show the user's name */
  showName?: boolean;
  /** Position of the name relative to the avatar */
  namePosition?: "right" | "bottom";
  /** Whether to show a tooltip with the user's name */
  showTooltip?: boolean;
  /** Whether to prefer username over full name */
  preferUsername?: boolean;
  /** Whether the avatar is clickable */
  clickable?: boolean;
  /** Callback when avatar is clicked */
  onClick?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Avatar component that displays a user's profile image or initials with status
 *
 * This component can work in three modes:
 * 1. Connected mode (with userId): Fetches user data and status from the store
 * 2. Standalone mode with user object: Uses provided user data directly
 * 3. Basic mode with display name and image: Uses provided text and image directly
 *
 * All modes use the same underlying container to ensure consistent behavior.
 *
 * @example
 * ```tsx
 * // Connected mode
 * <UserAvatar userId="user123" size="large" showStatus={true} />
 *
 * // Standalone mode with user object
 * <UserAvatar user={userObject} showStatus={true} size="medium" />
 *
 * // Basic mode with just display name and image
 * <UserAvatar
 *   displayName="John Doe"
 *   imageUrl="https://example.com/avatar.jpg"
 *   status="online"
 * />
 * ```
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  user,
  displayName,
  imageUrl,
  status,
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
}) => {
  if (!user && !userId) return null;

  // Always use the container to ensure consistent behavior
  return (
    <UserAvatarContainer
      userId={userId}
      user={user}
      size={size}
      showStatus={showStatus}
      showName={showName}
      namePosition={namePosition}
      showTooltip={showTooltip}
      preferUsername={preferUsername}
      clickable={clickable}
      onClick={onClick ? () => onClick() : undefined}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserAvatar;
