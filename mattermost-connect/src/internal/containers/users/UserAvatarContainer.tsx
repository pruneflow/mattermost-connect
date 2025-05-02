// src/internal/containers/users/UserAvatarContainer.tsx
/**
 * User Avatar Container
 * Standardized container for displaying user avatars
 */
import React, { useMemo } from "react";
import { BaseContainer, BaseContainerProps } from "../base/BaseContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { Avatar, Badge, Tooltip, Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * User avatar container props
 */
export interface UserAvatarContainerProps extends BaseContainerProps {
  /** User ID */
  userId?: string;
  /** Avatar size (default: 40) */
  size?: number;
  /** Whether to show status indicator (default: true) */
  showStatus?: boolean;
  /** Whether to show user name (default: false) */
  showName?: boolean;
  /** Whether to show tooltip (default: true) */
  showTooltip?: boolean;
  /** Prefer username over full name (default: false) */
  preferUsername?: boolean;
  /** Override status */
  status?: string;
  /** Override display name */
  displayName?: string;
  /** Override initials */
  initials?: string;
  /** Override image src */
  src?: string;
  /** Text variant for name */
  textVariant?: "body1" | "body2" | "subtitle1" | "subtitle2";
  /** Name position relative to avatar (default: "right") */
  namePosition?: "right" | "bottom";
  /** Callback on avatar click */
  onClick?: (userId: string) => void;
  /** Whether avatar is clickable */
  clickable?: boolean;
  /** CSS class for avatar */
  avatarClassName?: string;
  /** CSS class for name */
  nameClassName?: string;
  /** CSS class for status badge */
  badgeClassName?: string;
}

/**
 * Styled components for avatar styling
 */
const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: `2px solid ${theme.palette.background.paper}`,
    padding: 0,
  },
}));

/**
 * Status color mapping
 */
const statusColors = {
  online: "success.main",
  away: "warning.main",
  dnd: "error.main",
  offline: "text.disabled",
};

/**
 * User Avatar Container
 * Displays a user avatar with optional status and name
 *
 * @example
 * ```tsx
 * <UserAvatarContainer
 *   userId="user123"
 *   size={48}
 *   showStatus
 *   showName
 * />
 * ```
 */
export const UserAvatarContainer: React.FC<UserAvatarContainerProps> = (
  props,
) => {
  const {
    userId,
    size = 40,
    showStatus = true,
    showName = false,
    showTooltip = true,
    preferUsername = false,
    status: statusOverride,
    displayName: displayNameOverride,
    initials: initialsOverride,
    src: srcOverride,
    textVariant = "body2",
    namePosition = "right",
    onClick,
    clickable = !!onClick,
    avatarClassName,
    nameClassName,
    badgeClassName,
    ...restProps
  } = props;

  // Use container user hook
  const { displayName, initials, imageUrl, status, isLoading, error } =
    useContainerUser(userId, {
      avatarSize: size,
      showStatus,
      showName,
      showTooltip,
      preferUsername,
    });

  // Use overrides if provided
  const finalDisplayName = displayNameOverride || displayName;
  const finalInitials = initialsOverride || initials;
  const finalSrc = srcOverride || imageUrl;
  const finalStatus = statusOverride || status;

  // Generate avatar content
  const avatarContent = useMemo(() => {
    if (isLoading) {
      return null; // Empty avatar while loading
    }

    if (finalSrc) {
      return null; // Let Avatar component handle image display
    }

    return finalInitials || "?";
  }, [isLoading, finalSrc, finalInitials]);

  // Create avatar component with or without status badge
  const avatarComponent = useMemo(() => {
    const avatarElement = (
      <Avatar
        src={finalSrc}
        alt={finalDisplayName}
        sx={{
          width: size,
          height: size,
          fontSize: size / 2,
          cursor: clickable ? "pointer" : "default",
        }}
        className={avatarClassName}
        onClick={onClick ? () => onClick(userId || "") : undefined}
      >
        {avatarContent}
      </Avatar>
    );

    if (!showStatus) {
      return avatarElement;
    }

    return (
      <StyledBadge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        variant="dot"
        sx={{
          "& .MuiBadge-badge": {
            bgcolor:
              statusColors[finalStatus as keyof typeof statusColors] ||
              statusColors.offline,
          },
        }}
        className={badgeClassName}
      >
        {avatarElement}
      </StyledBadge>
    );
  }, [
    finalSrc,
    finalDisplayName,
    size,
    clickable,
    avatarClassName,
    onClick,
    userId,
    avatarContent,
    showStatus,
    finalStatus,
    badgeClassName,
  ]);

  // Create complete component with name if needed
  const containerContent = useMemo(() => {
    const avatar = showTooltip ? (
      <Tooltip title={finalDisplayName}>{avatarComponent}</Tooltip>
    ) : (
      avatarComponent
    );

    if (!showName) {
      return avatar;
    }

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: namePosition === "right" ? "row" : "column",
          alignItems: namePosition === "right" ? "center" : "flex-start",
          gap: 1,
        }}
      >
        {avatar}
        <Typography
          variant={textVariant}
          className={nameClassName}
          sx={{ fontWeight: 500 }}
        >
          {finalDisplayName}
        </Typography>
      </Box>
    );
  }, [
    showTooltip,
    finalDisplayName,
    avatarComponent,
    showName,
    namePosition,
    textVariant,
    nameClassName,
  ]);

  return (
    <BaseContainer {...restProps} render={(api, state) => containerContent} />
  );
};

export default UserAvatarContainer;
