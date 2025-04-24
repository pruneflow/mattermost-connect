// src/internal/components/common/TimeAgo.tsx
/**
 * A component for displaying relative time
 */
import React from "react";
import { Typography, TypographyProps } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { formatDate } from "../../../utils/mattermostUtils";

export interface TimeAgoProps extends BaseComponentProps {
  /** Timestamp to format */
  timestamp: number;
  /** Typography variant */
  variant?: TypographyProps["variant"];
  /** Typography color */
  color?: TypographyProps["color"];
}

const TimeAgo: React.FC<TimeAgoProps> = ({
  timestamp,
  variant = "caption",
  color = "textSecondary",
  className,
  sx,
  id,
}) => {
  const formattedTime = formatDate(timestamp, {
    relative: true,
  });

  return (
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
};

export default TimeAgo;
