// src/internal/components/common/RelativeTime.tsx
/**
 * A component for displaying formatted timestamps
 */
import React from "react";
import { Typography, TypographyProps, Tooltip } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { formatDate } from "../../../utils/mattermostUtils";

export interface RelativeTimeProps extends BaseComponentProps {
  /** Timestamp to format */
  timestamp: number;
  /** Whether to show relative time */
  relative?: boolean;
  /** Whether to show date */
  showDate?: boolean;
  /** Whether to show time */
  showTime?: boolean;
  /** Format style */
  format?: "short" | "medium" | "long";
  /** Whether to show tooltip with full date */
  showTooltip?: boolean;
  /** Typography variant */
  variant?: TypographyProps["variant"];
  /** Typography color */
  color?: TypographyProps["color"];
}

const RelativeTime: React.FC<RelativeTimeProps> = ({
  timestamp,
  relative = false,
  showDate = true,
  showTime = true,
  format = "medium",
  showTooltip = true,
  variant = "caption",
  color = "textSecondary",
  className,
  sx,
  id,
}) => {
  const formattedTime = formatDate(timestamp, {
    relative,
    showDate,
    showTime,
    format,
  });

  // For tooltip, always show full date and time
  const tooltipText = formatDate(timestamp, {
    relative: false,
    showDate: true,
    showTime: true,
    format: "long",
  });

  const content = (
    <Typography
      variant={variant}
      color={color}
      className={className}
      sx={sx}
      id={id}
    >
      {formattedTime}
    </Typography>
  );

  if (showTooltip) {
    return (
      <Tooltip title={tooltipText} arrow placement="top">
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default RelativeTime;
