// src/internal/components/common/Tooltip.tsx
/**
 * A reusable tooltip component
 */
import React from "react";
import {
  Tooltip as MuiTooltip,
  TooltipProps as MuiTooltipProps,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface TooltipProps
  extends BaseComponentProps,
    Omit<MuiTooltipProps, "className" | "sx"> {
  /** Whether to show an arrow */
  arrow?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  title,
  arrow = true,
  className,
  sx,
  id,
  ...tooltipProps
}) => {
  // Don't render a tooltip if there's no title
  if (!title) {
    return <>{children}</>;
  }

  return (
    <MuiTooltip
      title={title}
      arrow={arrow}
      className={className}
      sx={sx}
      id={id}
      {...tooltipProps}
    >
      {/* Tooltip requires a DOM element that can receive focus */}
      {React.isValidElement(children) ? children : <span>{children}</span>}
    </MuiTooltip>
  );
};

export default Tooltip;
