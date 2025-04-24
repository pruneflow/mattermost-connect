// src/internal/containers/users/UserAvatarContainer.tsx
/**
 * Container for user avatar that manages user data and status
 */
import React, { useMemo } from "react";
import { BaseComponentProps } from "../../types/componentTypes";
import { useUser } from "../../../hooks/useUsers";
import UserAvatarUI from "../../components/users/UserAvatarUI";
import { formatUserName } from "../../../core/store/userStore";

export interface UserAvatarContainerProps extends BaseComponentProps {
  /** User ID */
  userId: string;
  /** Size of the avatar */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show the status indicator */
  showStatus?: boolean;
  /** Whether the avatar is clickable */
  clickable?: boolean;
  /** Callback when avatar is clicked */
  onClick?: () => void;
}

const UserAvatarContainer: React.FC<UserAvatarContainerProps> = ({
  userId,
  size = "medium",
  showStatus = true,
  clickable = false,
  onClick,
  className,
  sx,
  id,
}) => {
  // Fetch user data and status
  const { user, status, displayName } = useUser(userId);

  // Get image URL (if user has a profile image)
  const imageUrl = useMemo(() => {
    if (!user || !user.last_picture_update) return undefined;

    // In a real implementation, this would likely use a configured base URL
    // This is a placeholder that assumes the API client will resolve relative URLs
    return `users/${user.id}/image?_=${user.last_picture_update}`;
  }, [user]);

  // Format display name based on available user data
  const formattedName = useMemo(() => {
    if (displayName) return displayName;
    if (user) return formatUserName(user);
    return "";
  }, [user, displayName]);

  return (
    <UserAvatarUI
      displayName={formattedName}
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

export default UserAvatarContainer;
