// src/internal/components/users/UserAvatarUI.tsx
/**
 * User avatar component that displays a user's profile image or initials
 */
import React from "react";
import { Avatar, Badge, Box, Tooltip, Typography } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { stringToColor } from "../../../utils/mattermostUtils";
import UserStatusIndicatorUI from "./UserStatusIndicatorUI";
import { UserStatus } from "../../../types";

/**
 * Gets initials from a name
 * @param name Full name of the user
 * @returns Up to 2 characters of initials
 */
const getInitials = (name: string): string => {
  if (!name) return "?";

  const nameParts = name.split(" ").filter(Boolean);
  if (nameParts.length === 0) return "?";

  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }

  return (
    nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
  ).toUpperCase();
};

export interface UserAvatarUIProps extends BaseComponentProps {
  /** User's display name */
  displayName?: string;
  /** URL to user's profile image */
  imageUrl?: string;
  /** User's initials (calculated from displayName if not provided) */
  initials?: string;
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
  /** Whether to show the user's name */
  showName?: boolean;
  /** Position of the name relative to the avatar */
  namePosition?: "right" | "bottom";
  /** Typography variant for the name */
  textVariant?: "body1" | "body2" | "subtitle1" | "subtitle2" | "caption";
  /** Whether to show a tooltip with user info */
  tooltipDisabled?: boolean;
}

/**
 * User Avatar UI component
 * Displays a user's avatar with optional status indicator and name
 */
const UserAvatarUI: React.FC<UserAvatarUIProps> = ({
  displayName = "",
  imageUrl,
  initials: providedInitials,
  status,
  size = "medium",
  showStatus = true,
  clickable = false,
  onClick,
  showName = false,
  namePosition = "right",
  textVariant = "body2",
  tooltipDisabled = false,
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
  const initials =
    providedInitials || (displayName ? getInitials(displayName) : "?");
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

  // Avatar with name layout
  const nameComponent =
    showName && displayName ? (
      <Typography
        variant={textVariant}
        sx={{
          ml: namePosition === "right" ? 1 : 0,
          mt: namePosition === "bottom" ? 0.5 : 0,
          maxWidth: 120,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {displayName}
      </Typography>
    ) : null;

  // Avatar with status
  const avatarWithStatus =
    !showStatus || !status ? (
      avatarComponent
    ) : (
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        badgeContent={
          <UserStatusIndicatorUI
            status={status}
            size={pixelSize <= 32 ? "small" : "medium"}
            showTooltip={false}
          />
        }
      >
        {avatarComponent}
      </Badge>
    );

  // Full component with optional tooltip and name
  const fullComponent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: namePosition === "bottom" ? "column" : "row",
        alignItems: "center",
      }}
    >
      {avatarWithStatus}
      {nameComponent}
    </Box>
  );

  // Wrap in tooltip if needed
  if (tooltipDisabled || !displayName) {
    return fullComponent;
  }

  return (
    <Tooltip title={displayName} arrow>
      {fullComponent}
    </Tooltip>
  );
};

export default UserAvatarUI;
