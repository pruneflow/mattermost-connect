// src/internal/hoc/withLoading.tsx
/**
 * Loading HOC
 * Wraps a component with loading state management
 * Provides a standardized way to handle loading states in components
 */
import React, { ComponentType, useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import {
  useContainerLoadingState,
  LoadingStateOptions,
  UseLoadingStateResult,
} from "../hooks/useContainerLoadingState";
import { ErrorStateProps, LoadingProps } from "../types/componentTypes";

/**
 * Default loading component that displays a centered spinner
 */
const DefaultLoadingComponent: React.FC<LoadingProps> = ({
  show = true,
  text = "Loading...",
}) => {
  if (!show) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        width: "100%",
        height: "100%",
        minHeight: 200,
      }}
    >
      <CircularProgress size={40} color="primary" />
      {text && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {text}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Default error component that displays an error message
 */
const DefaultErrorComponent: React.FC<ErrorStateProps> = ({
  message,
  showRetry = true,
  retryText = "Retry",
  onRetry,
}) => {
  if (!message) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        width: "100%",
        bgcolor: "error.light",
        color: "error.contrastText",
        borderRadius: 1,
        minHeight: 200,
      }}
    >
      <Typography variant="body1" textAlign="center" gutterBottom>
        {message}
      </Typography>

      {showRetry && onRetry && (
        <Box sx={{ mt: 2 }}>
          <button
            onClick={onRetry}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "#fff",
              color: "#f44336",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {retryText}
          </button>
        </Box>
      )}
    </Box>
  );
};

/**
 * Options for withLoading HOC
 */
export interface WithLoadingOptions extends LoadingStateOptions {
  /** Custom loading component */
  LoadingComponent?: React.ComponentType<LoadingProps>;
  /** Custom error component */
  ErrorComponent?: React.ComponentType<ErrorStateProps>;
  /** Prop name to expose loading state (default: 'loadingState') */
  loadingStatePropName?: string;
  /** Prop name to expose loading actions (default: 'loadingActions') */
  loadingActionsPropName?: string;
  /** Whether to show loading component when loading (default: true) */
  showLoadingComponent?: boolean;
  /** Whether to show error component when error occurs (default: true) */
  showErrorComponent?: boolean;
}

/**
 * Props injected by the withLoading HOC
 */
export type WithLoadingInjectedProps = UseLoadingStateResult;

/**
 * HOC that wraps a component with loading state management
 *
 * @param Component - Component to wrap with loading state
 * @param options - Loading state configuration options
 * @returns Wrapped component with loading state management
 *
 */
export function withLoading<P extends object>(
  Component: ComponentType<P>,
  options: WithLoadingOptions = {},
): React.FC<
  Omit<P, keyof WithLoadingInjectedProps> & Partial<WithLoadingInjectedProps>
> {
  const {
    LoadingComponent = DefaultLoadingComponent,
    ErrorComponent = DefaultErrorComponent,
    loadingStatePropName = "loadingState",
    loadingActionsPropName = "loadingActions",
    showLoadingComponent = true,
    showErrorComponent = true,
    ...loadingStateOptions
  } = options;

  const WithLoading: React.FC<
    Omit<P, keyof WithLoadingInjectedProps> & Partial<WithLoadingInjectedProps>
  > = (props) => {
    // Use the loading state hook
    const {
      loadingState,
      loadingActions,
      loadingProps,
      errorProps,
      withLoading,
      createAbortController,
    } = useContainerLoadingState(loadingStateOptions);

    // Create the injected props
    const injectedProps = useMemo(
      () => ({
        [loadingStatePropName]: loadingState,
        [loadingActionsPropName]: loadingActions,
        loadingProps,
        errorProps,
        withLoading,
        createAbortController,
      }),
      [
        loadingState,
        loadingActions,
        loadingProps,
        errorProps,
        withLoading,
        createAbortController,
      ],
    );

    // Show loading component if loading and showLoadingComponent is true
    if (showLoadingComponent && loadingState.isLoading) {
      return <LoadingComponent {...loadingProps} />;
    }

    // Show error component if there's an error and showErrorComponent is true
    if (showErrorComponent && loadingState.hasError && loadingState.error) {
      return <ErrorComponent {...errorProps} />;
    }

    // Otherwise, render the wrapped component with injected props
    return <Component {...(props as P)} {...injectedProps} />;
  };

  // Set display name for debugging
  WithLoading.displayName = `WithLoading(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithLoading;
}

export default withLoading;
