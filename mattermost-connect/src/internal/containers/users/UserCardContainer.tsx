// src/internal/containers/users/UserCardContainer.tsx
/**
 * Container for user card that manages user data, status, and actions
 */
import React, { useMemo } from "react";
import { BaseComponentProps } from "../../types/componentTypes";
import { useUser } from "../../../hooks/useUsers";
import UserCardUI from "../../components/users/UserCardUI";

export interface UserCardContainerProps extends BaseComponentProps {
  /** User ID */
  userId: string;
  /** Whether to show the message button */
  showMessageButton?: boolean;
  /** Whether to show the more options button */
  showMoreOptions?: boolean;
  /** Whether to show user roles */
  showRoles?: boolean;
  /** Card size variant */
  variant?: "compact" | "normal" | "expanded";
  /** Callback when message button is clicked */
  onMessageClick?: () => void;
  /** Callback when more options button is clicked */
  onMoreOptionsClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback when card is clicked */
  onClick?: () => void;
}

const UserCardContainer: React.FC<UserCardContainerProps> = ({
  userId,
  showMessageButton = true,
  showMoreOptions = true,
  showRoles = false,
  variant = "normal",
  onMessageClick,
  onMoreOptionsClick,
  onClick,
  className,
  sx,
  id,
}) => {
  // Fetch user data and status
  const { user, status } = useUser(userId);

  // Extract roles from user data
  const roles = useMemo(() => {
    if (!user || !user.roles) return [];
    return user.roles.split(" ");
  }, [user]);

  // Handle message click with user ID context
  const handleMessageClick = () => {
    if (onMessageClick) {
      onMessageClick();
    }
  };

  // Don't render anything if we don't have user data
  if (!user) {
    return null;
  }

  return (
    <UserCardUI
      user={user}
      status={status}
      showMessageButton={showMessageButton}
      showMoreOptions={showMoreOptions}
      showRoles={showRoles}
      roles={roles}
      variant={variant}
      onMessageClick={handleMessageClick}
      onMoreOptionsClick={onMoreOptionsClick}
      onClick={onClick}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserCardContainer;
