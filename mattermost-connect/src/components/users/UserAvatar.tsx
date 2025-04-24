// src/components/users/UserAvatar.tsx
/**
 * User avatar component that displays a user's profile picture or initials
 * with optional status indicator
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import UserAvatarContainer from "../../internal/containers/users/UserAvatarContainer";
import UserAvatarUI from "../../internal/components/users/UserAvatarUI";
import { UserStatus } from "../../index";

export interface UserAvatarProps {
  /** User ID - used to fetch user data from store */
  userId?: string;
  /** User's display name (if no userId is provided) */
  displayName?: string;
  /** URL to user's profile image (if no userId is provided) */
  imageUrl?: string;
  /** User's online status (if no userId is provided) */
  status?: UserStatus;
  /** Size of the avatar */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show the status indicator */
  showStatus?: boolean;
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
 * This component can work in two modes:
 * 1. Connected mode (with userId): Fetches user data and status from the store
 * 2. Standalone mode (with displayName/imageUrl/status): Uses provided data directly
 *
 * @example
 * ```tsx
 * // Connected mode
 * <UserAvatar userId="user123" size="large" showStatus={true} />
 *
 * // Standalone mode
 * <UserAvatar
 *   displayName="John Doe"
 *   imageUrl="https://example.com/avatar.jpg"
 *   status="online"
 * />
 * ```
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  displayName,
  imageUrl,
  status,
  size = "medium",
  showStatus = true,
  clickable = false,
  onClick,
  className,
  sx,
  id,
}) => {
  // If userId is provided, use the container for connected functionality
  if (userId) {
    return (
      <UserAvatarContainer
        userId={userId}
        size={size}
        showStatus={showStatus}
        clickable={clickable}
        onClick={onClick}
        className={className}
        sx={sx}
        id={id}
      />
    );
  }

  // Otherwise, use the UI component directly with provided props
  return (
    <UserAvatarUI
      displayName={displayName || ""}
      imageUrl={imageUrl}
      status={status}
      size={size}
      showStatus={showStatus}
      clickable={clickable}
      onClick={onClick}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserAvatar;
