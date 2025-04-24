// src/internal/components/common/EmptyState.tsx
/**
 * A reusable empty state component
 */
import React, { ReactNode } from "react";
import { Box, Typography, Button, SxProps, Theme } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface EmptyStateProps extends BaseComponentProps {
  /** Icon to display */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button text */
  actionText?: string;
  /** Callback for action button click */
  onAction?: () => void;
  /** Secondary action button text */
  secondaryActionText?: string;
  /** Callback for secondary action button click */
  onSecondaryAction?: () => void;
  /** Additional content */
  children?: ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  children,
  className,
  sx,
  id,
}) => {
  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 3,
        minHeight: 200,
        ...sx,
      }}
      id={id}
    >
      {icon && (
        <Box sx={{ mb: 2, color: "text.secondary", fontSize: 48 }}>{icon}</Box>
      )}
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ mb: 2, maxWidth: 400 }}
        >
          {description}
        </Typography>
      )}
      {children}
      {(actionText || secondaryActionText) && (
        <Box sx={{ mt: 2 }}>
          {actionText && (
            <Button
              variant="contained"
              color="primary"
              onClick={onAction}
              sx={{ mr: secondaryActionText ? 1 : 0 }}
            >
              {actionText}
            </Button>
          )}
          {secondaryActionText && (
            <Button variant="outlined" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default EmptyState;
