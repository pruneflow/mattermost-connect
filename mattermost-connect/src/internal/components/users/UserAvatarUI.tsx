// src/internal/components/users/UserAvatarUI.tsx
/**
 * User avatar component that displays a user's profile image or initials
 */
import React from "react";
import { Avatar, Badge, Box } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { stringToColor } from "../../../index";
import UserStatusIndicator from "./UserStatusIndicatorUI";
import { UserStatus } from "../../../types";

export interface UserAvatarUIProps extends BaseComponentProps {
  /** User's display name */
  displayName?: string;
  /** URL to user's profile image */
  imageUrl?: string;
  /** User's online status */
  status?: UserStatus;
  /** Size of the avatar */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show the status indicator */
  showStatus?: boolean;
  /** Whether the avatar is clickable */
  clickable?: boolean;
  /** Callback when avatar is clicked */
  onClick?: () => void;
}

const UserAvatarUI: React.FC<UserAvatarUIProps> = ({
  displayName = "",
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
  // Convert size to pixel values
  const sizeMap = {
    small: 32,
    medium: 40,
    large: 48,
  };

  const pixelSize =
    typeof size === "number" ? size : sizeMap[size as keyof typeof sizeMap];

  // Generate initials and background color if no image is provided
  const initials = displayName ? getInitials(displayName) : "?";
  const bgColor = displayName ? stringToColor(displayName) : "#757575";

  // Avatar component
  const avatarComponent = (
    <Avatar
      src={imageUrl}
      alt={displayName || "User"}
      sx={{
        width: pixelSize,
        height: pixelSize,
        fontSize: pixelSize * 0.4,
        cursor: clickable ? "pointer" : "default",
        bgcolor: !imageUrl ? bgColor : undefined,
        ...sx,
      }}
      onClick={clickable ? onClick : undefined}
      className={className}
      id={id}
    >
      {!imageUrl && initials}
    </Avatar>
  );

  // If we don't need to show status, just return the avatar
  if (!showStatus || !status) {
    return avatarComponent;
  }

  // Otherwise, wrap the avatar in a badge
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={
        <UserStatusIndicator
          status={status}
          size={pixelSize <= 32 ? "small" : "medium"}
          showTooltip={false}
        />
      }
    >
      {avatarComponent}
    </Badge>
  );
};

export default UserAvatarUI;
