// src/internal/components/common/ContentLoader.tsx
/**
 * A reusable content loader with retry functionality
 */
import React from "react";
import { Box } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import LoadingSpinner from "./LoadingSpinner";
import ErrorState from "./ErrorState";

export interface ContentLoaderProps extends BaseComponentProps {
  /** Whether content is loading */
  isLoading: boolean;
  /** Error object, if any */
  error?: Error | null;
  /** Content to display when loaded */
  children: React.ReactNode;
  /** Loading message */
  loadingMessage?: string;
  /** Retry function for error state */
  onRetry?: () => void;
  /** Minimum height for the loader */
  minHeight?: number | string;
}

const ContentLoader: React.FC<ContentLoaderProps> = ({
  isLoading,
  error,
  children,
  loadingMessage,
  onRetry,
  minHeight = 200,
  className,
  sx,
  id,
}) => {
  return (
    <Box
      className={className}
      sx={{
        minHeight,
        position: "relative",
        ...sx,
      }}
      id={id}
    >
      {isLoading ? (
        <LoadingSpinner centered message={loadingMessage} sx={{ minHeight }} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} sx={{ minHeight }} />
      ) : (
        children
      )}
    </Box>
  );
};

export default ContentLoader;
