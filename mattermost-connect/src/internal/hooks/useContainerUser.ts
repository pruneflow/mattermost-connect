// src/internal/hooks/useContainerUser.ts
/**
 * User container hook
 * Provides standardized user functionality for container components
 */
import React, { useCallback, useMemo, useState } from "react";
import { useUser, useUserProfile } from "../../hooks";
import { User, UserProfileUpdate, UserStatus } from "../../types";
import { useContainerLoadingState } from "./useContainerLoadingState";
import { useDialog } from "./useDialog";
import { useMemoizedProps } from "../utils";

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
  /** Whether to auto fetch user data */
  autoFetch?: boolean;
  /** Whether to show actions menu */
  showActions?: boolean;
  /** Available actions */
  availableActions?: string[];
}

/**
 * User container hook result
 */
export interface UseUserContainerResult {
  /** User state */
  userState: {
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
    /** Whether data is loaded */
    isLoaded: boolean;
    /** Loading state */
    isLoading: boolean;
    /** Refreshing state */
    isRefreshing: boolean;
    /** Error state */
    error: Error | null;
    /** Whether the container has an error */
    hasError: boolean;
    /** Current action being processed */
    currentAction: string | null;
    /** Whether user is in edit mode */
    isEditMode: boolean;
  };

  /** User actions */
  userActions: {
    /** Refresh user function */
    refreshUser: () => Promise<User | null>;
    /** Update user profile */
    updateProfile: (data: UserProfileUpdate) => Promise<User | null>;
    /** Update user status */
    updateStatus: (status: UserStatus) => Promise<boolean>;
    /** Upload profile image */
    uploadProfileImage: (file: File) => Promise<boolean>;
    /** Start editing user profile */
    startEdit: () => void;
    /** Cancel editing user profile */
    cancelEdit: () => void;
    /** Perform a custom action */
    performAction: (action: string, data?: any) => Promise<any>;
  };

  /** UI prop generators */
  uiProps: {
    /** Generate standardized props for the avatar */
    getAvatarProps: () => Record<string, any>;
    /** Generate standardized props for the user card */
    getCardProps: () => Record<string, any>;
    /** Generate standardized props for the profile */
    getProfileProps: () => Record<string, any>;
  };
}

/**
 * Hook for user containers
 * Provides standardized user functionality for container components
 *
 * @param userId - User ID to display
 * @param options - User container options
 * @returns User container hook result
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
    autoFetch = true,
    showActions = true,
    availableActions = [],
  } = options;

  // Current action being processed
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Use user hook to get user data
  const {
    user,
    status,
    displayName,
    initials,
    profileImageUrl,
    isCurrentUser,
    isLoading: isUserLoading,
    isFetching: isUserFetching,
    error: userError,
    refreshUser: originalRefreshUser,
    updateProfile: originalUpdateProfile,
    updateStatus: originalUpdateStatus,
    uploadProfileImage: originalUploadProfileImage,
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

  // Refresh user with loading state tracking
  const refreshUser = useCallback(async (): Promise<User | null> => {
    return withLoading(async () => {
      try {
        const result = await originalRefreshUser();
        // Extract the User data from the QueryObserverResult
        return result.data || null;
      } catch (error) {
        loadingActions.setError(
          error instanceof Error ? error : new Error("Failed to refresh user"),
        );
        return null;
      }
    });
  }, [originalRefreshUser, withLoading, loadingActions]);

  // Update user profile with confirmation and loading state tracking
  const updateProfile = useCallback(
    async (data: UserProfileUpdate): Promise<User | null> => {
      // Confirm update
      const confirmed = await dialog.confirmAsync({
        title: "Update Profile",
        message: "Are you sure you want to update your profile?",
        confirmText: "Update",
      });

      if (!confirmed) {
        return null;
      }

      setCurrentAction("update");

      return withLoading(async () => {
        try {
          const result = await originalUpdateProfile(data);

          if (result) {
            await dialog.showSuccess("Success", "Profile updated successfully");
            setIsEditMode(false);
          }

          return result;
        } catch (error) {
          dialog.showError(
            "Error",
            error instanceof Error ? error.message : "Failed to update profile",
          );
          return null;
        } finally {
          setCurrentAction(null);
        }
      });
    },
    [originalUpdateProfile, withLoading, dialog],
  );

  // Update user status with loading state tracking
  const updateStatus = useCallback(
    async (newStatus: UserStatus): Promise<boolean> => {
      setCurrentAction("status");

      return withLoading(async () => {
        try {
          return await originalUpdateStatus(newStatus);
        } catch (error) {
          dialog.showError(
            "Error",
            error instanceof Error ? error.message : "Failed to update status",
          );
          return false;
        } finally {
          setCurrentAction(null);
        }
      });
    },
    [originalUpdateStatus, withLoading, dialog],
  );

  // Upload profile image with loading state tracking
  const uploadProfileImage = useCallback(
    async (file: File): Promise<boolean> => {
      setCurrentAction("upload");

      return withLoading(async () => {
        try {
          const result = await originalUploadProfileImage(file);

          if (result) {
            await dialog.showSuccess(
              "Success",
              "Profile image updated successfully",
            );
          }

          return result;
        } catch (error) {
          dialog.showError(
            "Error",
            error instanceof Error
              ? error.message
              : "Failed to upload profile image",
          );
          return false;
        } finally {
          setCurrentAction(null);
        }
      });
    },
    [originalUploadProfileImage, withLoading, dialog],
  );

  // Start editing profile
  const startEdit = useCallback(() => {
    setIsEditMode(true);
  }, []);

  // Cancel editing profile
  const cancelEdit = useCallback(() => {
    setIsEditMode(false);
  }, []);

  // Perform a custom action
  const performAction = useCallback(
    async (action: string, data?: any): Promise<any> => {
      // Check if action is available
      if (
        !availableActions.includes(action) &&
        !["refresh", "update", "status", "upload"].includes(action)
      ) {
        console.warn(`Action ${action} is not available`);
        return null;
      }

      // Handle built-in actions
      if (action === "refresh") {
        return refreshUser();
      } else if (action === "update" && data) {
        return updateProfile(data);
      } else if (action === "status" && data) {
        return updateStatus(data);
      } else if (action === "upload" && data) {
        return uploadProfileImage(data);
      }

      // For custom actions
      setCurrentAction(action);

      // Implement custom action handling here...
      // This would depend on what custom actions you want to support

      setCurrentAction(null);
      return null;
    },
    [
      availableActions,
      refreshUser,
      updateProfile,
      updateStatus,
      uploadProfileImage,
    ],
  );

  // Generate avatar props
  const getAvatarProps = useCallback(() => {
    return useMemoizedProps({
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
    });
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
    return useMemoizedProps({
      userId: userId || "",
      user,
      displayName,
      status,
      avatarProps: getAvatarProps(),
      isCurrentUser,
      loading: loadingState.isLoading,
      error: loadingState.error,
      onRefresh: refreshUser,
      showActions,
      availableActions,
      onAction: performAction,
      isEditMode,
      onStartEdit: startEdit,
      onCancelEdit: cancelEdit,
      onUpdateProfile: updateProfile,
      onUpdateStatus: updateStatus,
      onUploadImage: uploadProfileImage,
    });
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
    showActions,
    availableActions,
    performAction,
    isEditMode,
    startEdit,
    cancelEdit,
    updateProfile,
    updateStatus,
    uploadProfileImage,
  ]);

  // Generate user profile props
  const getProfileProps = useCallback(() => {
    return useMemoizedProps({
      userId: userId || "",
      user,
      displayName,
      status,
      avatarProps: getAvatarProps(),
      isCurrentUser,
      loading: loadingState.isLoading,
      error: loadingState.error,
      onRefresh: refreshUser,
      showActions,
      availableActions,
      onAction: performAction,
      isEditMode,
      onStartEdit: startEdit,
      onCancelEdit: cancelEdit,
      onUpdateProfile: updateProfile,
      onUpdateStatus: updateStatus,
      onUploadImage: uploadProfileImage,
    });
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
    showActions,
    availableActions,
    performAction,
    isEditMode,
    startEdit,
    cancelEdit,
    updateProfile,
    updateStatus,
    uploadProfileImage,
  ]);

  // Create user state
  const userState = useMemo(
    () => ({
      displayName,
      initials,
      imageUrl: profileImageUrl,
      status,
      isCurrentUser,
      user,
      isLoaded: !!user,
      isLoading: loadingState.isLoading,
      isRefreshing: isUserFetching,
      error: loadingState.error,
      hasError: loadingState.hasError,
      currentAction,
      isEditMode,
    }),
    [
      displayName,
      initials,
      profileImageUrl,
      status,
      isCurrentUser,
      user,
      loadingState.isLoading,
      isUserFetching,
      loadingState.error,
      loadingState.hasError,
      currentAction,
      isEditMode,
    ],
  );

  // Create user actions
  const userActions = useMemo(
    () => ({
      refreshUser,
      updateProfile,
      updateStatus,
      uploadProfileImage,
      startEdit,
      cancelEdit,
      performAction,
    }),
    [
      refreshUser,
      updateProfile,
      updateStatus,
      uploadProfileImage,
      startEdit,
      cancelEdit,
      performAction,
    ],
  );

  // Create UI prop generators
  const uiProps = useMemo(
    () => ({
      getAvatarProps,
      getCardProps,
      getProfileProps,
    }),
    [getAvatarProps, getCardProps, getProfileProps],
  );

  // Auto fetch user data if enabled
  React.useEffect(() => {
    if (autoFetch && userId && !user && !isUserLoading) {
      refreshUser();
    }
  }, [autoFetch, userId, user, isUserLoading, refreshUser]);

  return {
    userState,
    userActions,
    uiProps,
  };
}

export default useContainerUser;
