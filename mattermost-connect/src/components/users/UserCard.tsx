// src/components/users/UserCard.tsx
/**
 * User card component that displays user information with various options
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import UserCardContainer from "../../internal/containers/users/UserCardContainer";
import UserCardUI from "../../internal/components/users/UserCardUI";
import { User, UserStatus } from "../../index";

export interface UserCardProps {
  /** User ID - used to fetch user data from store */
  userId?: string;
  /** User data (if no userId is provided) */
  user?: User;
  /** User's status (if no userId is provided) */
  status?: UserStatus;
  /** Whether to show the message button */
  showMessageButton?: boolean;
  /** Whether to show the more options button */
  showMoreOptions?: boolean;
  /** Whether to show user roles */
  showRoles?: boolean;
  /** User's roles (array of role names, if no userId is provided) */
  roles?: string[];
  /** Card size variant */
  variant?: "compact" | "normal" | "expanded";
  /** Callback when message button is clicked */
  onMessageClick?: () => void;
  /** Callback when more options button is clicked */
  onMoreOptionsClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * User card component that displays user information
 *
 * This component can work in two modes:
 * 1. Connected mode (with userId): Fetches user data and status from the store
 * 2. Standalone mode (with user object): Uses provided data directly
 *
 * @example
 * ```tsx
 * // Connected mode
 * <UserCard
 *   userId="user123"
 *   variant="expanded"
 *   showRoles={true}
 *   onMessageClick={() => console.log('Message button clicked')}
 * />
 *
 * // Standalone mode
 * <UserCard
 *   user={userObject}
 *   status="online"
 *   variant="compact"
 *   onClick={() => console.log('Card clicked')}
 * />
 * ```
 */
const UserCard: React.FC<UserCardProps> = ({
  userId,
  user,
  status,
  showMessageButton = true,
  showMoreOptions = true,
  showRoles = false,
  roles = [],
  variant = "normal",
  onMessageClick,
  onMoreOptionsClick,
  onClick,
  className,
  sx,
  id,
}) => {
  // If userId is provided, use the container for connected functionality
  if (userId) {
    return (
      <UserCardContainer
        userId={userId}
        showMessageButton={showMessageButton}
        showMoreOptions={showMoreOptions}
        showRoles={showRoles}
        variant={variant}
        onMessageClick={onMessageClick}
        onMoreOptionsClick={onMoreOptionsClick}
        onClick={onClick}
        className={className}
        sx={sx}
        id={id}
      />
    );
  }

  // If no user data is provided, don't render anything
  if (!user) {
    return null;
  }

  // Otherwise, use the UI component directly with provided props
  return (
    <UserCardUI
      user={user}
      status={status}
      showMessageButton={showMessageButton}
      showMoreOptions={showMoreOptions}
      showRoles={showRoles}
      roles={roles}
      variant={variant}
      onMessageClick={onMessageClick}
      onMoreOptionsClick={onMoreOptionsClick}
      onClick={onClick}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserCard;
