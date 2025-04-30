// src/internal/hoc/withErrorBoundary.tsx
/**
 * Error Boundary HOC
 * Wraps a component with error catching functionality
 * Provides a standardized way to handle errors in components
 */
import React, { Component, ComponentType, ErrorInfo, ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";

/**
 * Error boundary props including error display customization
 */
export interface ErrorBoundaryProps {
  /** Error handler callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom error component to render */
  errorComponent?: React.ReactNode | ((error: Error) => React.ReactNode);
  /** Error title */
  errorTitle?: string;
  /** Error message */
  errorMessage?: string;
  /** Whether to allow retry */
  allowRetry?: boolean;
  /** Retry button text */
  retryText?: string;
  /** Children to render */
  children?: ReactNode;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error: Error | null;
}

/**
 * Default error component for the error boundary
 */
const DefaultErrorComponent: React.FC<{
  error: Error;
  title?: string;
  message?: string;
  allowRetry?: boolean;
  retryText?: string;
  onRetry: () => void;
}> = ({
  error,
  title = "Something went wrong",
  message,
  allowRetry = true,
  retryText = "Retry",
  onRetry,
}) => (
  <Box
    sx={{
      p: 3,
      borderRadius: 1,
      bgcolor: "error.light",
      color: "error.contrastText",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      gap: 2,
      minHeight: 200,
      width: "100%",
    }}
  >
    <Typography variant="h6" component="h3">
      {title}
    </Typography>

    <Typography variant="body2">
      {message || error.message || "An unexpected error occurred"}
    </Typography>

    {process.env.NODE_ENV === "development" && (
      <Typography
        variant="caption"
        component="pre"
        sx={{
          mt: 2,
          p: 2,
          bgcolor: "rgba(0,0,0,0.1)",
          borderRadius: 1,
          overflowX: "auto",
          maxWidth: "100%",
          textAlign: "left",
        }}
      >
        {error.stack}
      </Typography>
    )}

    {allowRetry && (
      <Button
        variant="contained"
        color="primary"
        onClick={onRetry}
        sx={{ mt: 2 }}
      >
        {retryText}
      </Button>
    )}
  </Box>
);

/**
 * Error Boundary component
 * React component that catches JavaScript errors anywhere in its child component tree
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error or send to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Resets the error state to retry rendering the component
   */
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const {
      children,
      errorComponent,
      errorTitle,
      errorMessage,
      allowRetry,
      retryText,
    } = this.props;

    if (hasError && error) {
      // Render custom error component if provided
      if (errorComponent) {
        if (typeof errorComponent === "function") {
          return errorComponent(error);
        }
        return errorComponent;
      }

      // Otherwise render the default error component
      return (
        <DefaultErrorComponent
          error={error}
          title={errorTitle}
          message={errorMessage}
          allowRetry={allowRetry}
          retryText={retryText}
          onRetry={this.handleRetry}
        />
      );
    }

    return children;
  }
}

/**
 * Options for the withErrorBoundary HOC
 */
export interface WithErrorBoundaryOptions {
  /** Error handler callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom error component to render */
  errorComponent?: React.ReactNode | ((error: Error) => React.ReactNode);
  /** Error title */
  errorTitle?: string;
  /** Error message */
  errorMessage?: string;
  /** Whether to allow retry */
  allowRetry?: boolean;
  /** Retry button text */
  retryText?: string;
}

/**
 * HOC that wraps a component with an error boundary
 *
 * @param Component - Component to wrap with error boundary
 * @param options - Error boundary configuration options
 * @returns Wrapped component with error handling
 *
 * @example
 * ```tsx
 * const UserListWithErrorHandling = withErrorBoundary(UserList, {
 *   errorTitle: "Error loading users",
 *   allowRetry: true,
 *   onError: (error) => {
 *     console.error("Error in UserList:", error);
 *     analytics.trackError(error);
 *   }
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {},
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  // Set display name for debugging
  WithErrorBoundary.displayName = `WithErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithErrorBoundary;
}

export default withErrorBoundary;
