// src/internal/components/common/IconButton.tsx
/**
 * A reusable icon button component with tooltip
 */
import React from "react";
import {
  IconButton as MuiIconButton,
  IconButtonProps as MuiIconButtonProps,
  Tooltip,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface IconButtonProps
  extends BaseComponentProps,
    Omit<MuiIconButtonProps, "className" | "sx"> {
  /** Tooltip text */
  tooltip?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  children,
  tooltip,
  className,
  sx,
  id,
  ...buttonProps
}) => {
  const button = (
    <MuiIconButton className={className} sx={sx} id={id} {...buttonProps}>
      {children}
    </MuiIconButton>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default IconButton;
