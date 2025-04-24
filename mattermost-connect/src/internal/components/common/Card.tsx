// src/internal/components/common/Card.tsx
/**
 * A reusable card component with consistent styling
 */
import React, { ReactNode } from "react";
import { Card as MuiCard, CardProps as MuiCardProps } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface CardProps
  extends BaseComponentProps,
    Omit<MuiCardProps, "className" | "sx"> {
  /** Whether the card should have hover effect */
  hoverEffect?: boolean;
  /** Whether the card is selectable */
  selectable?: boolean;
  /** Whether the card is selected */
  selected?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  selectable = false,
  selected = false,
  className,
  sx,
  id,
  ...cardProps
}) => {
  return (
    <MuiCard
      className={className}
      sx={{
        transition: "all 0.2s ease-in-out",
        ...(hoverEffect && {
          "&:hover": {
            boxShadow: (theme) => theme.shadows[4],
            transform: "translateY(-2px)",
          },
        }),
        ...(selectable && {
          cursor: "pointer",
          "&:hover": {
            boxShadow: (theme) => theme.shadows[3],
            borderColor: (theme) => theme.palette.primary.light,
          },
        }),
        ...(selected && {
          borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
          backgroundColor: (theme) => `${theme.palette.primary.main}10`,
        }),
        ...sx,
      }}
      id={id}
      {...cardProps}
    >
      {children}
    </MuiCard>
  );
};

export default Card;
