// src/components/users/UserCard.tsx
/**
 * User card component that displays user information with various options
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import UserCardContainer from "../../internal/containers/users/UserCardContainer";
import { User, UserStatus } from "../../types";

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
  variant?: "default" | "compact" | "expanded";
  /** Size of the avatar */
  avatarSize?: number;
  /** Whether to show the user's status */
  showStatus?: boolean;
  /** Whether to show additional user details */
  showDetails?: boolean;
  /** Whether to add an outline to the card */
  outlined?: boolean;
  /** Card elevation (shadow depth) */
  elevation?: number;
  /** Whether the card is in selected state */
  selected?: boolean;
  /** Callback when message button is clicked */
  onMessageClick?: () => void;
  /** Callback when more options button is clicked */
  onMoreOptionsClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback when action is performed */
  onAction?: (action: string, user: User) => void;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when status is changed */
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
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
 * Both modes use the same underlying container to ensure consistent behavior.
 *
 * The card supports several built-in actions:
 * - Send direct message: Opens a direct message channel with the user
 * - View profile: Shows detailed user profile information
 * - Change status: Allows the current user to change their online status
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
  variant = "default",
  avatarSize,
  showStatus = true,
  showDetails = true,
  outlined = false,
  elevation = 1,
  selected = false,
  onMessageClick,
  onMoreOptionsClick,
  onAction,
  onClick,
  onStatusChange,
  className,
  sx,
  id,
}) => {
  // If no userId and no user provided, don't render anything
  if (!userId && !user) {
    return null;
  }

  // Configure available actions based on props
  const availableActions = [];

  if (showMessageButton) {
    availableActions.push("message");
  }

  if (showMoreOptions) {
    availableActions.push("more");
  }

  // Add standard actions
  availableActions.push("profile");
  availableActions.push("changeStatus");

  // Handler for actions to map to specific callbacks
  const handleAction = (action: string, actionUser: User) => {
    if (action === "message" && onMessageClick) {
      onMessageClick();
    } else if (onAction) {
      onAction(action, actionUser);
    }
  };

  // Always use the container to ensure consistent behavior
  return (
    <UserCardContainer
      userId={userId}
      user={user}
      variant={variant}
      avatarSize={avatarSize}
      showStatus={showStatus}
      showDetails={showDetails}
      showActions={showMessageButton || showMoreOptions}
      availableActions={availableActions}
      outlined={outlined}
      elevation={elevation}
      selected={selected}
      onAction={handleAction}
      onClick={onClick ? () => onClick() : undefined}
      onStatusChange={onStatusChange}
      onMoreOptionsClick={onMoreOptionsClick}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserCard;
