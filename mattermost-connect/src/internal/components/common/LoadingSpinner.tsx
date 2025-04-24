// src/internal/components/common/LoadingSpinner.tsx
/**
 * A reusable loading spinner component
 */
import React from "react";
import {
  CircularProgress,
  Box,
  Typography,
  CircularProgressProps,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface LoadingSpinnerProps extends BaseComponentProps {
  /** Size of the spinner */
  size?: CircularProgressProps["size"];
  /** Message to display under the spinner */
  message?: string;
  /** Whether the spinner should be centered */
  centered?: boolean;
  /** CircularProgress color */
  color?: CircularProgressProps["color"];
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message,
  centered = false,
  color = "primary",
  className,
  sx,
  id,
}) => {
  const content = (
    <>
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          {message}
        </Typography>
      )}
    </>
  );

  if (centered) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          ...sx,
        }}
        id={id}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        my: 2,
        ...sx,
      }}
      id={id}
    >
      {content}
    </Box>
  );
};

export default LoadingSpinner;
