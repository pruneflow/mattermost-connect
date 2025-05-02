// src/internal/hooks/useContainerUser.ts
/**
 * User container hook
 * Provides standardized user functionality for container components
 */
import { useCallback, useMemo } from "react";
import { useUser, useUsers, useUserProfile } from "../../hooks";
import { userService } from "../../core/services/userService";
import { User, UserStatus } from "../../types";
import { useContainerLoadingState } from "./useContainerLoadingState";
import { useDialog } from "./useDialog";

/**
 * Options for the user container hook
 */
export interface UserContainerOptions {
  /** Size for avatar (default: 40) */
  avatarSize?: number;
  /** Show status indicator on avatar (default: true) */
  showStatus?: boolean;
  /** Show user name with avatar (default: false) */
  showName?: boolean;
  /** Whether to show a tooltip with user information (default: true) */
  showTooltip?: boolean;
  /** Prefer username over full name (default: false) */
  preferUsername?: boolean;
  /** Loading state options */
  loadingOptions?: any;
}

/**
 * User container hook result
 */
export interface UseUserContainerResult {
  /** User display name */
  displayName: string;
  /** User initials for avatar */
  initials: string;
  /** User profile image URL */
  imageUrl: string;
  /** User status */
  status: UserStatus;
  /** Whether the user is the current user */
  isCurrentUser: boolean;
  /** User data */
  user: User | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether the container has an error */
  hasError: boolean;
  /** Loading and error handling functions */
  loading: any;
  /** User service functions */
  userService: any;
  /** Dialog functions */
  dialog: any;
  /** Refresh user function */
  refreshUser: () => Promise<User | null>;
  /** Generate standardized props for the avatar */
  getAvatarProps: () => Record<string, any>;
  /** Generate standardized props for the user card */
  getCardProps: () => Record<string, any>;
  /** Generate standardized props for the profile */
  getProfileProps: () => Record<string, any>;
}

/**
 * Hook for user containers
 * Provides standardized user functionality for container components
 *
 * @param userId - User ID to display
 * @param options - User container options
 * @returns User container hook result
 *
 * @example
 * ```tsx
 * const {
 *   displayName,
 *   imageUrl,
 *   status,
 *   getAvatarProps
 * } = useContainerUser('user123', {
 *   avatarSize: 48,
 *   showStatus: true
 * });
 * ```
 */
export function useContainerUser(
  userId?: string,
  options: UserContainerOptions = {},
): UseUserContainerResult {
  const {
    avatarSize = 40,
    showStatus = true,
    showName = false,
    showTooltip = true,
    preferUsername = false,
    loadingOptions = {},
  } = options;

  // Use user hook to get user data
  const {
    user,
    status,
    displayName,
    initials,
    profileImageUrl,
    isCurrentUser,
    refreshUser,
    isLoading: isUserLoading,
    error: userError,
  } = useUser(userId);

  // Use user profile hook for formatting
  const userProfile = useUserProfile();

  // Use loading state hook for standardized loading management
  const {
    loadingState,
    loadingActions,
    loadingProps,
    errorProps,
    withLoading,
  } = useContainerLoadingState({
    initialLoading: isUserLoading,
    initialError: userError,
    ...loadingOptions,
  });

  // Use dialog hook for user actions
  const dialog = useDialog();

  // Generate avatar props
  const getAvatarProps = useCallback(() => {
    return {
      userId: userId || "",
      displayName,
      initials,
      src: profileImageUrl,
      size: avatarSize,
      status: showStatus ? status : undefined,
      isCurrentUser,
      loading: loadingState.isLoading,
      error: loadingState.error,
      showName,
      preferUsername,
      tooltipDisabled: !showTooltip,
    };
  }, [
    userId,
    displayName,
    initials,
    profileImageUrl,
    avatarSize,
    showStatus,
    status,
    isCurrentUser,
    loadingState.isLoading,
    loadingState.error,
    showName,
    preferUsername,
    showTooltip,
  ]);

  // Generate user card props
  const getCardProps = useCallback(() => {
    return {
      userId: userId || "",
      user,
      displayName,
      status,
      avatarProps: getAvatarProps(),
      isCurrentUser,
      loading: loadingState.isLoading,
      error: loadingState.error,
      onRefresh: refreshUser,
    };
  }, [
    userId,
    user,
    displayName,
    status,
    getAvatarProps,
    isCurrentUser,
    loadingState.isLoading,
    loadingState.error,
    refreshUser,
  ]);

  // Generate user profile props
  const getProfileProps = useCallback(() => {
    return {
      userId: userId || "",
      user,
      displayName,
      status,
      avatarProps: getAvatarProps(),
      isCurrentUser,
      loading: loadingState.isLoading,
      error: loadingState.error,
      onRefresh: refreshUser,
    };
  }, [
    userId,
    user,
    displayName,
    status,
    getAvatarProps,
    isCurrentUser,
    loadingState.isLoading,
    loadingState.error,
    refreshUser,
  ]);

  return {
    displayName,
    initials,
    imageUrl: profileImageUrl,
    status,
    isCurrentUser,
    user,
    isLoading: loadingState.isLoading,
    error: loadingState.error,
    hasError: loadingState.hasError,
    loading: {
      state: loadingState,
      actions: loadingActions,
      props: loadingProps,
      errorProps,
      withLoading,
    },
    userService,
    dialog,
    refreshUser,
    getAvatarProps,
    getCardProps,
    getProfileProps,
  };
}

export default useContainerUser;
