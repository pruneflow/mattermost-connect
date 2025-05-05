// src/internal/containers/users/UserCardContainer.tsx
/**
 * User Card Container
 * Container component for user cards/info display
 * Delegates business logic to useContainerUser hook
 * Composes with UserAvatarContainer for avatar display
 */
import React, { useCallback, useMemo } from "react";
import { BaseContainerProps, useBaseContainer } from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { User, UserStatus } from "../../../types";
import { useMemoizedProps } from "../../utils/performanceUtils";
import { useDialog } from "../../hooks/useDialog";
import StatusSelector from "../../components/common/StatusSelector";

/**
 * User card container props
 */
export interface UserCardContainerProps extends BaseContainerProps {
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
  avatarSize?: number;
  /**
   * Whether to show the user's status indicator
   */
  showStatus?: boolean;
  /**
   * Whether to show detailed information
   */
  showDetails?: boolean;
  /**
   * Whether to show actions menu
   */
  showActions?: boolean;
  /**
   * Available actions
   */
  availableActions?: string[];
  /**
   * Whether to enable editing of user profile (for current user)
   */
  allowEdit?: boolean;
  /**
   * Whether card is in compact mode
   */
  compact?: boolean;
  /**
   * Callback when action is performed
   */
  onAction?: (action: string, user: User) => void;
  /**
   * Callback when user card is clicked
   */
  onClick?: (user: User) => void;
  /**
   * Callback when status is changed
   */
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
}

/**
 * User Card Container
 * Displays user information in a card format
 */
export const UserCardContainer: React.FC<
  UserCardContainerProps & {
    children?: React.ReactNode | ((props: any) => React.ReactNode);
    render?: (props: any) => React.ReactNode;
  }
> = (props) => {
  const {
    userId,
    user: propUser,
    avatarSize = 48,
    showStatus = true,
    showDetails = true,
    showActions = true,
    availableActions = [],
    allowEdit = true,
    compact = false,
    onAction,
    onClick,
    onStatusChange,
    children,
    render,
    ...restProps
  } = props;

  // Use base container for common functionality
  const [baseState, baseAPI] = useBaseContainer(restProps);

  // Use dialog for confirmation dialogs
  const dialog = useDialog();

  // Use user container hook
  const { userState, userActions, uiProps } = useContainerUser(userId, {
    avatarSize,
    showStatus,
    autoFetch: !propUser,
    showActions,
    availableActions: [
      ...availableActions,
      ...(allowEdit ? ["edit", "uploadImage"] : []),
    ],
  });

  // If user prop is provided, prefer it over fetched user
  const user = propUser || userState.user;

  // Handle card click
  const handleClick = useCallback(() => {
    if (onClick && user) {
      onClick(user);
    }
  }, [onClick, user]);

  // Handle action
  const handleAction = useCallback(
    async (action: string) => {
      if (!user) return;

      // Handle custom actions through callback
      if (onAction) {
        onAction(action, user);
      }

      // Handle built-in actions
      if (action === "message" && user) {
        // Example of a built-in action that delegates to caller
        if (onAction) {
          onAction("message", user);
        }
      } else if (action === "changeStatus" && user && onStatusChange) {
        const newStatus = await dialog.formAsync<{ status: UserStatus }>({
          title: "Change Status",
          component: <StatusSelector initialStatus={userState.status} />,
          initialData: { status: userState.status },
          confirmText: "Update Status",
          cancelText: "Cancel",
        });

        if (newStatus.confirmed && newStatus.data) {
          await userActions.updateStatus(newStatus.data.status);
          if (onStatusChange) {
            onStatusChange(user, newStatus.data.status);
          }
        }
      }
    },
    [user, onAction, userState.status, userActions, dialog, onStatusChange],
  );

  // Get standard card props from hook
  const baseCardProps = useMemo(() => uiProps.getCardProps(), [uiProps]);

  // Create memoized props for UI component
  const cardUIProps = useMemo(() => {
    return useMemoizedProps({
      ...baseCardProps,
      onClick: handleClick,
      onAction: handleAction,
      showDetails,
      compact,
      allowEdit,
    });
  }, [
    baseCardProps,
    handleClick,
    handleAction,
    showDetails,
    compact,
    allowEdit,
  ]);

  // Use render prop pattern if provided
  if (render) {
    return <>{render(cardUIProps)}</>;
  }

  // Use children render function if provided
  if (typeof children === "function") {
    return <>{children(cardUIProps)}</>;
  }

  // Return children wrapped with context if needed
  return <>{children}</>;
};

export default UserCardContainer;
