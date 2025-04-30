// src/internal/hoc/withLoading.tsx
/**
 * Loading HOC
 * Wraps a component with loading state management
 * Provides a standardized way to handle loading states in components
 */
import React, { ComponentType, useMemo } from "react";
import {
  useContainerLoadingState,
  LoadingStateOptions,
  UseLoadingStateResult,
} from "../hooks/useContainerLoadingState";
import { ErrorStateProps, LoadingProps } from "../types/componentTypes";
import { ErrorState, LoadingSpinner } from "../components/common";

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
    LoadingComponent = LoadingSpinner,
    ErrorComponent = ErrorState,
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
