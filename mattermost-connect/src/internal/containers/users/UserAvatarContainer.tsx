// src/internal/containers/users/UserAvatarContainer.tsx
import React, { useCallback } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import UserAvatarUI from "../../components/users/UserAvatarUI";
import { User } from "../../../types";
import { useUser } from "../../../hooks";
import { SxProps, Theme } from "@mui/material/styles";

export interface UserAvatarContainerProps {
  userId?: string;
  user?: User;
  size?: "small" | "medium" | "large" | number;
  showStatus?: boolean;
  showName?: boolean;
  namePosition?: "right" | "bottom";
  showTooltip?: boolean;
  preferUsername?: boolean;
  clickable?: boolean;
  onClick?: (user: User) => void;
  className?: string;
  sx?: SxProps<Theme>;
  id?: string;
}

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

  const [baseState, baseAPI] = useBaseContainer({
    id,
    className,
    sx,
  });

  const {
    user: fetchedUser,
    status,
    displayName,
    initials,
    profileImageUrl,
    isLoading,
  } = useUser(userId);

  const user = propUser || fetchedUser;

  const handleClick = useCallback(() => {
    if (clickable && onClick && user) {
      onClick(user);
    }
  }, [clickable, onClick, user]);

  const getUserDisplayName = useCallback(() => {
    if (user) {
      if (preferUsername) {
        return user.username;
      }

      if (displayName) {
        return displayName;
      }

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

  const getUserInitials = useCallback(() => {
    if (initials) {
      return initials;
    }

    const name = getUserDisplayName();
    if (!name) return "?";

    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "?";

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [initials, getUserDisplayName]);

  const uiProps = baseAPI.createUIProps({
    displayName: getUserDisplayName(),
    imageUrl: profileImageUrl || undefined,
    initials: getUserInitials(),
    status: showStatus ? status : undefined,
    size,
    showName,
    namePosition,
    tooltipDisabled: !showTooltip,
    clickable,
    onClick: handleClick,
  });

  return <UserAvatarUI {...uiProps} />;
};

export default UserAvatarContainer;
