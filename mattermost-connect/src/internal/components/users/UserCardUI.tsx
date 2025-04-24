// src/internal/components/users/UserCardUI.tsx
/**
 * Card component that displays user information
 */
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import {
  Message as MessageIcon,
  MoreVert as MoreIcon,
} from "@mui/icons-material";
import { BaseComponentProps } from "../../types/componentTypes";
import UserAvatarUI from "./UserAvatarUI";
import { User, UserStatus } from "../../../index";

export interface UserCardUIProps extends BaseComponentProps {
  /** User data */
  user: User;
  /** User's status */
  status?: UserStatus;
  /** Whether to show the message button */
  showMessageButton?: boolean;
  /** Whether to show the more options button */
  showMoreOptions?: boolean;
  /** Whether to show user roles */
  showRoles?: boolean;
  /** User's roles (array of role names) */
  roles?: string[];
  /** Card size variant */
  variant?: "compact" | "normal" | "expanded";
  /** Callback when message button is clicked */
  onMessageClick?: () => void;
  /** Callback when more options button is clicked */
  onMoreOptionsClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback when card is clicked */
  onClick?: () => void;
}

const UserCardUI: React.FC<UserCardUIProps> = ({
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
  // Format display name
  const displayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;

  // Format subtitle based on variant
  const subtitle =
    variant === "compact"
      ? user.username
      : user.nickname || user.email || user.username;

  // Handle click on message button
  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessageClick) {
      onMessageClick();
    }
  };

  // Handle click on more options button
  const handleMoreOptionsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onMoreOptionsClick) {
      onMoreOptionsClick(e);
    }
  };

  // Define avatar size based on variant
  const avatarSize =
    variant === "compact"
      ? "small"
      : variant === "expanded"
        ? "large"
        : "medium";

  return (
    <Card
      className={className}
      sx={{
        width: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease-in-out",
        "&:hover": onClick
          ? {
              boxShadow: (theme) => theme.shadows[4],
              transform: "translateY(-2px)",
            }
          : {},
        ...sx,
      }}
      id={id}
      onClick={onClick}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <UserAvatarUI
              displayName={displayName}
              imageUrl={
                user.last_picture_update
                  ? `${user.id}/image?_=${user.last_picture_update}`
                  : undefined
              }
              status={status}
              size={avatarSize}
              showStatus
            />
            <Box sx={{ ml: 2 }}>
              <Typography
                variant={variant === "compact" ? "subtitle1" : "h6"}
                component="div"
              >
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Box>

          <Box>
            {showMoreOptions && (
              <IconButton
                size="small"
                onClick={handleMoreOptionsClick}
                aria-label="more options"
              >
                <MoreIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {variant === "expanded" && (
          <>
            <Divider sx={{ my: 2 }} />

            {showRoles && roles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                >
                  Roles
                </Typography>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}
                >
                  {roles.map((role) => (
                    <Chip
                      key={role}
                      label={role}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        {showMessageButton && variant !== "compact" && (
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              size="small"
              startIcon={<MessageIcon />}
              onClick={handleMessageClick}
            >
              Message
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UserCardUI;
