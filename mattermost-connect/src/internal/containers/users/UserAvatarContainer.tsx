// src/internal/containers/users/UserAvatarContainer.tsx
/**
 * User Avatar Container
 * Container component for user avatars
 * Delegates business logic to useContainerUser hook
 */
import React, { useMemo } from "react";
import { BaseContainerProps, useBaseContainer } from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { User } from "../../../types";
import { useMemoizedProps } from "../../utils/performanceUtils";

/**
 * User avatar container props
 */
export interface UserAvatarContainerProps extends BaseContainerProps {
  /**
   * User ID to display
   */
  userId: string;
  /**
   * User object (optional, will be fetched if not provided)
   */
  user?: User;
  /**
   * Size of the avatar in pixels
   */
  size?: number;
  /**
   * Whether to show the user's status indicator
   */
  showStatus?: boolean;
  /**
   * Whether to show the user's name
   */
  showName?: boolean;
  /**
   * Whether to show a tooltip with user information
   */
  showTooltip?: boolean;
  /**
   * Whether to prefer username over full name
   */
  preferUsername?: boolean;
  /**
   * Callback when avatar is clicked
   */
  onClick?: (user: User) => void;
  /**
   * Callback when status is clicked
   */
  onStatusClick?: (user: User, currentStatus: string) => void;
}

/**
 * User Avatar Container
 * Renders a user avatar with optional status indicator and name
 */
export const UserAvatarContainer: React.FC<
  UserAvatarContainerProps & {
    children?: React.ReactNode | ((props: any) => React.ReactNode);
    render?: (props: any) => React.ReactNode;
  }
> = (props) => {
  const {
    userId,
    user: propUser,
    size = 40,
    showStatus = true,
    showName = false,
    showTooltip = true,
    preferUsername = false,
    onClick,
    onStatusClick,
    children,
    render,
    ...restProps
  } = props;

  // Use base container for common functionality
  const [baseState, baseAPI] = useBaseContainer(restProps);

  // Use user container hook
  const { userState, userActions, uiProps } = useContainerUser(userId, {
    avatarSize: size,
    showStatus,
    showName,
    showTooltip,
    preferUsername,
    autoFetch: !propUser,
  });

  // If user prop is provided, prefer it over fetched user
  const user = propUser || userState.user;

  // Handle avatar click
  const handleClick = React.useCallback(() => {
    if (onClick && user) {
      onClick(user);
    }
  }, [onClick, user]);

  // Handle status click
  const handleStatusClick = React.useCallback(
    (event: React.MouseEvent) => {
      // Stop propagation to prevent avatar click handler from firing
      event.stopPropagation();

      if (onStatusClick && user) {
        onStatusClick(user, userState.status);
      }
    },
    [onStatusClick, user, userState.status],
  );

  // Create memoized props for UI component
  const avatarUIProps = useMemo(() => {
    // Get base avatar props from hook
    const baseAvatarProps = uiProps.getAvatarProps();

    // Add click handlers
    return useMemoizedProps({
      ...baseAvatarProps,
      onClick: handleClick,
      onStatusClick: handleStatusClick,
    });
  }, [uiProps, handleClick, handleStatusClick]);

  // Use render prop pattern if provided
  if (render) {
    return <>{render(avatarUIProps)}</>;
  }

  // Use children render function if provided
  if (typeof children === "function") {
    return <>{children(avatarUIProps)}</>;
  }

  // Return children wrapped with context if needed
  return <>{children}</>;
};

export default UserAvatarContainer;
