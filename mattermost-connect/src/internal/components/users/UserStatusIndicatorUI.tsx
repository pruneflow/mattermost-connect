// src/internal/components/users/UserStatusIndicatorUI.tsx
/**
 * Component that displays a user's online status
 */
import React from "react";
import { Box, Tooltip } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { UserStatus } from "../../../index";

export interface UserStatusIndicatorUIProps extends BaseComponentProps {
  /** User status */
  status: UserStatus;
  /** Size of the status indicator */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show the status tooltip */
  showTooltip?: boolean;
  /** Whether to use a bordered style */
  bordered?: boolean;
}

const UserStatusIndicatorUI: React.FC<UserStatusIndicatorUIProps> = ({
  status,
  size = "medium",
  showTooltip = true,
  bordered = true,
  className,
  sx,
  id,
}) => {
  // Map size to pixel values
  const sizeMap = {
    small: 8,
    medium: 12,
    large: 16,
  };

  const pixelSize =
    typeof size === "number" ? size : sizeMap[size as keyof typeof sizeMap];

  // Map status to colors and tooltip text
  const statusMap: Record<UserStatus, { color: string; tooltip: string }> = {
    online: { color: "#4caf50", tooltip: "Online" },
    away: { color: "#ff9800", tooltip: "Away" },
    dnd: { color: "#f44336", tooltip: "Do Not Disturb" },
    offline: { color: "#9e9e9e", tooltip: "Offline" },
  };

  const statusConfig = statusMap[status] || statusMap.offline;

  const statusDot = (
    <Box
      className={className}
      sx={{
        width: pixelSize,
        height: pixelSize,
        borderRadius: "50%",
        backgroundColor: statusConfig.color,
        border: bordered ? "2px solid #fff" : "none",
        boxSizing: "content-box",
        boxShadow: bordered ? "0 0 0 1px rgba(0, 0, 0, 0.1)" : "none",
        ...sx,
      }}
      id={id}
      data-testid={`status-${status}`}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip title={statusConfig.tooltip} arrow>
        {statusDot}
      </Tooltip>
    );
  }

  return statusDot;
};

export default UserStatusIndicatorUI;
