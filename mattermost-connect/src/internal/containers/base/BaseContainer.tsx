// src/internal/containers/base/BaseContainer.tsx
/**
 * Base Container
 * Provides a foundation for all container components with standardized patterns
 * for loading state, error handling, and common functionality
 */
import React, { useMemo, useCallback } from "react";
import { BaseComponentProps } from "../../types/componentTypes";
import {
  useContainerLoadingState,
  LoadingStateOptions,
} from "../../hooks/useContainerLoadingState";
import { useDialog } from "../../hooks/useDialog";
import { mergeBaseProps } from "../../utils/containerUtils";
import { useMemoizedProps } from "../../utils/performanceUtils";

/**
 * Base container options for standardized behavior
 */
export interface BaseContainerOptions {
  /** Loading state options */
  loadingOptions?: LoadingStateOptions;
  /** Whether to use dialog system */
  useDialogSystem?: boolean;
  /** Automatically track loading state for async operations */
  autoTrackLoading?: boolean;
  /** Whether to memoize props to prevent unnecessary re-renders */
  memoizeProps?: boolean;
}

/**
 * Base container state
 */
export interface BaseContainerState {
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether there is an error */
  hasError: boolean;
}

// Define type for withLoading function to avoid JSX confusion with generics
export type WithLoadingFunction = {
  <TResult>(fn: () => Promise<TResult>): Promise<TResult>;
};

/**
 * Base container API with standardized methods
 */
export interface BaseContainerAPI {
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  /** Set error state */
  setError: (error: Error | null) => void;
  /** Reset loading and error states */
  reset: () => void;
  /** Execute function with loading tracking */
  withLoading: WithLoadingFunction;
  /** Show confirmation dialog */
  showConfirmation: (
    title: string,
    message: string,
    options?: any,
  ) => Promise<boolean>;
  /** Show error dialog */
  showError: (title: string, message: string) => Promise<void>;
  /** Show success dialog */
  showSuccess: (title: string, message: string) => Promise<void>;
  /** Create props for the UI component */
  createUIProps: (additionalProps?: Record<string, any>) => Record<string, any>;
}

/**
 * Base container props that all containers should implement
 */
export interface BaseContainerProps extends BaseComponentProps {
  /** ID for the container */
  id?: string;
  /** Additional CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** Initial loading state */
  initialLoading?: boolean;
  /** Initial error */
  initialError?: Error | null;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Callback when loading state changes */
  onLoadingChange?: (isLoading: boolean) => void;
  /** Callback when error state changes */
  onError?: (error: Error | null) => void;
}

/**
 * Base hook for all container components
 * Provides standardized state management and common functionality
 *
 * @param props - Component props
 * @param options - Container options
 * @returns Container API and state
 */
export function useBaseContainer(
  props: BaseContainerProps,
  options: BaseContainerOptions = {},
): [BaseContainerState, BaseContainerAPI] {
  const {
    initialLoading,
    initialError,
    onLoadingChange,
    onError,
    className,
    sx,
    id,
    disabled = false,
  } = props;

  const {
    loadingOptions = {},
    useDialogSystem = true,
    autoTrackLoading = true,
    memoizeProps = true,
  } = options;

  // Use loading state hook
  const {
    loadingState,
    loadingActions,
    loadingProps,
    errorProps,
    withLoading: trackLoading,
  } = useContainerLoadingState({
    initialLoading,
    initialError,
    onLoadingChange,
    onError,
    ...loadingOptions,
  });

  // Use dialog system if enabled
  const dialog = useDialogSystem ? useDialog() : null;

  // Container state
  const containerState: BaseContainerState = useMemo(
    () => ({
      isLoading: loadingState.isLoading,
      error: loadingState.error,
      hasError: loadingState.hasError,
    }),
    [loadingState.isLoading, loadingState.error, loadingState.hasError],
  );

  // Show confirmation dialog
  const showConfirmation = useCallback(
    async (
      title: string,
      message: string,
      options: any = {},
    ): Promise<boolean> => {
      if (!dialog) return false;
      return dialog.confirmAsync({
        title,
        message,
        confirmText: options.confirmText || "OK",
        cancelText: options.cancelText || "Cancel",
        isDestructive: options.isDestructive || false,
        ...options,
      });
    },
    [dialog],
  );

  // Show error dialog
  const showError = useCallback(
    async (title: string, message: string): Promise<void> => {
      if (!dialog) return;
      return dialog.showError(title, message);
    },
    [dialog],
  );

  // Show success dialog
  const showSuccess = useCallback(
    async (title: string, message: string): Promise<void> => {
      if (!dialog) return;
      return dialog.showSuccess(title, message);
    },
    [dialog],
  );

  // Create UI props
  const createUIProps = useCallback(
    (additionalProps: Record<string, any> = {}): Record<string, any> => {
      const baseProps = {
        className,
        sx,
        id,
        disabled: disabled || loadingState.isLoading,
        isLoading: loadingState.isLoading,
        error: loadingState.error,
        hasError: loadingState.hasError,
        loadingProps,
        errorProps,
      };

      const mergedProps = mergeBaseProps(baseProps, additionalProps);
      return memoizeProps ? useMemoizedProps(mergedProps) : mergedProps;
    },
    [
      className,
      sx,
      id,
      disabled,
      loadingState.isLoading,
      loadingState.error,
      loadingState.hasError,
      loadingProps,
      errorProps,
      memoizeProps,
    ],
  );

  // Track loading automatically if enabled
  // Using the appropriate generic implementation but avoiding JSX confusion
  const withLoading: WithLoadingFunction = useCallback(
    // Implementation with concrete type parameter
    (fn) => {
      return autoTrackLoading ? trackLoading(fn) : fn();
    },
    [autoTrackLoading, trackLoading],
  );

  // Container API
  const containerAPI: BaseContainerAPI = useMemo(
    () => ({
      setLoading: loadingActions.setLoading,
      setError: loadingActions.setError,
      reset: loadingActions.reset,
      withLoading,
      showConfirmation,
      showError,
      showSuccess,
      createUIProps,
    }),
    [
      loadingActions.setLoading,
      loadingActions.setError,
      loadingActions.reset,
      withLoading,
      showConfirmation,
      showError,
      showSuccess,
      createUIProps,
    ],
  );

  return [containerState, containerAPI];
}

/**
 * Base container component
 * This is a basic implementation that can be extended by specific containers
 */
export const BaseContainer: React.FC<
  BaseContainerProps & {
    children?: React.ReactNode;
    render?: (
      api: BaseContainerAPI,
      state: BaseContainerState,
    ) => React.ReactNode;
  }
> = (props) => {
  const { children, render } = props;
  const [state, api] = useBaseContainer(props);

  // Either use render prop or children
  if (render) {
    return <>{render(api, state)}</>;
  }

  return <>{children}</>;
};

export default BaseContainer;
