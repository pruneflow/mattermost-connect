// src/internal/containers/users/UserCardContainer.tsx
import React, { useCallback } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import UserCardUI, { UserCardUIProps } from "../../components/users/UserCardUI";
import { User, UserStatus } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useAuth } from "../../../hooks/useAuth";
import { useUser } from "../../../hooks";

export interface UserCardContainerProps {
  userId: string;
  user?: User;
  variant?: "default" | "compact" | "expanded";
  avatarSize?: number;
  showStatus?: boolean;
  showDetails?: boolean;
  showActions?: boolean;
  availableActions?: string[];
  outlined?: boolean;
  elevation?: number;
  selected?: boolean;
  onAction?: (action: string, user: User) => void;
  onClick?: (user: User) => void;
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

const UserCardContainer: React.FC<UserCardContainerProps> = (props) => {
  const {
    userId,
    user: propUser,
    variant = "default",
    avatarSize,
    showStatus = true,
    showDetails = true,
    showActions = true,
    availableActions = ["message", "profile"],
    outlined = false,
    elevation = 1,
    selected = false,
    onAction,
    onClick,
    onStatusChange,
    className,
    sx,
    id,
  } = props;

  const [baseState, baseAPI] = useBaseContainer({
    id,
    className,
    sx,
  });

  const {
    user: fetchedUser,
    status,
    displayName,
    isCurrentUser,
    isLoading,
    error,
    refreshUser,
    updateStatus,
  } = useUser(userId);

  const { currentUser } = useAuth();
  const dialog = useDialog();

  const user = propUser || fetchedUser;

  const handleClick = useCallback(() => {
    if (onClick && user) {
      onClick(user);
    }
  }, [onClick, user]);

  const handleActionClick = useCallback(
    async (action: string) => {
      if (!user) return;

      baseAPI.withLoading(async () => {
        if (action === "message" && onAction) {
          onAction("message", user);
        } else if (action === "profile" && onAction) {
          onAction("profile", user);
        } else if (action === "refresh") {
          await refreshUser();
        } else if (action === "more" && onAction) {
          onAction("more", user);
        } else if (action === "changeStatus" && isCurrentUser) {
          // Handle status change - this would require additional UI
          // that's not in the current implementation
          if (onStatusChange && user) {
            onStatusChange(user, status);
          }
        } else {
          if (onAction) {
            onAction(action, user);
          }
        }
      });
    },
    [
      user,
      onAction,
      refreshUser,
      isCurrentUser,
      onStatusChange,
      status,
      baseAPI,
    ],
  );

  const getActions = useCallback(() => {
    const actions = [...availableActions];

    if (!actions.includes("refresh")) {
      actions.push("refresh");
    }

    if (isCurrentUser && !actions.includes("changeStatus")) {
      actions.push("changeStatus");
    }

    return actions;
  }, [availableActions, isCurrentUser]);

  const getAvatarSize = useCallback(() => {
    if (avatarSize) return avatarSize;

    switch (variant) {
      case "compact":
        return 40;
      case "expanded":
        return 80;
      default:
        return 56;
    }
  }, [variant, avatarSize]);

  const isCardLoading = isLoading && !user;
  const hasError = !!error && !user;

  const uiProps: UserCardUIProps = {
    // Propriétés requises
    user,
    displayName: displayName || user?.username || "",
    status,

    // Autres propriétés
    variant,
    isLoading: isCardLoading || baseState.isLoading,
    hasError,
    error,
    isCurrentUser,
    showStatus,
    showActions,
    availableActions: getActions(),
    showRole: variant === "expanded",
    showEmail: showDetails,
    elevation,
    outlined,
    selected,
    avatarSize: getAvatarSize(),
    onActionClick: handleActionClick,
    onClick: handleClick,
    onRefresh: refreshUser,

    // Propriétés de style
    className,
    sx,
    id,
  };

  return <UserCardUI {...uiProps} />;
};

export default UserCardContainer;
