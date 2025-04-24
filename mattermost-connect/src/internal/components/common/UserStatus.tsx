// src/internal/components/common/UserStatus.tsx
/**
 * A component for displaying user status
 */
import React from "react";
import { Box, Tooltip } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { UserStatus as Status } from "../../../index";

export interface UserStatusProps extends BaseComponentProps {
  /** User status */
  status?: Status;
  /** Size of the status indicator */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show the status tooltip */
  showTooltip?: boolean;
}

const UserStatus: React.FC<UserStatusProps> = ({
  status = "offline",
  size = "medium",
  showTooltip = true,
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

  const pixelSize = typeof size === "number" ? size : sizeMap[size];

  // Map status to colors and tooltip text
  const statusMap: Record<Status, { color: string; tooltip: string }> = {
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
        border: "2px solid #fff",
        boxSizing: "content-box",
        ...sx,
      }}
      id={id}
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

export default UserStatus;
