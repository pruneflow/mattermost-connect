// src/internal/components/common/ErrorState.tsx
/**
 * A reusable error state component
 */
import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { ErrorOutline as ErrorIcon } from "@mui/icons-material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface ErrorStateProps extends BaseComponentProps {
  /** Error title */
  title?: string;
  /** Error message */
  message?: string;
  /** Error object */
  error?: Error | null;
  /** Retry button text */
  retryText?: string;
  /** Callback for retry button click */
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  error,
  retryText = "Try Again",
  onRetry,
  className,
  sx,
  id,
}) => {
  const errorMessage =
    message || error?.message || "An unexpected error occurred.";

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
      <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ mb: 2, maxWidth: 400 }}
      >
        {errorMessage}
      </Typography>
      {onRetry && (
        <Button variant="contained" color="primary" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </Box>
  );
};

export default ErrorState;
