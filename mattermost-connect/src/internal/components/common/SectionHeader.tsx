// src/internal/components/common/SectionHeader.tsx
/**
 * A reusable section header component
 */
import React, { ReactNode } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface SectionHeaderProps extends BaseComponentProps {
  /** Section title */
  title: string;
  /** Additional content to display next to the title */
  action?: ReactNode;
  /** Whether to show a divider */
  divider?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  action,
  divider = true,
  className,
  sx,
  id,
}) => {
  return (
    <>
      <Box
        className={className}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1,
          ...sx,
        }}
        id={id}
      >
        <Typography
          variant="subtitle2"
          color="textSecondary"
          sx={{
            textTransform: "uppercase",
            fontWeight: "fontWeightMedium",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Typography>
        {action && <Box>{action}</Box>}
      </Box>
      {divider && <Divider />}
    </>
  );
};

export default SectionHeader;
