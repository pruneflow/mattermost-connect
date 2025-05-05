// src/internal/containers/users/UserProfileContainer.tsx
/**
 * User Profile Container
 * Container component for user profile display and editing
 * Delegates business logic to useUser hook
 */
import React, { useCallback, useEffect, useState } from "react";
import { useUser } from "../../../hooks/";
import UserProfileUI from "../../components/users/UserProfileUI";
import { User, UserProfileUpdate, UserStatus } from "../../../types";
import { useDialog } from "../../hooks/useDialog";

/**
 * User profile container props
 */
export interface UserProfileContainerProps {
  /**
   * User ID to display
   */
  userId: string;
  /**
   * User object (optional, will be fetched if not provided)
   */
  user?: User;
  /**
   * Profile variant
   */
  variant?: "standard" | "compact" | "card";
  /**
   * Size of the avatar
   */
  avatarSize?: number;
  /**
   * Whether to show the user's status indicator
   */
  showStatus?: boolean;
  /**
   * Available tabs to display
   */
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  /**
   * Initial active tab
   */
  activeTab?: string;
  /**
   * Available fields to edit
   */
  editableFields?: Array<
    "username" | "email" | "firstName" | "lastName" | "nickname"
  >;
  /**
   * Whether profile is editable
   */
  editable?: boolean;
  /**
   * Whether to show edit button
   */
  showEditButton?: boolean;
  /**
   * Callback when action is performed
   */
  onAction?: (action: string, user: User) => void;
  /**
   * Callback when tab is changed
   */
  onTabChange?: (tabId: string) => void;
  /**
   * Callback when status is changed
   */
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
  /**
   * Callback when profile is updated
   */
  onProfileUpdate?: (user: User) => void;
  /**
   * CSS className
   */
  className?: string;
  /**
   * MUI sx prop for styling
   */
  sx?: React.CSSProperties;
  /**
   * Component ID
   */
  id?: string;
}

/**
 * User Profile Container
 * Displays and manages user profile information
 */
const UserProfileContainer: React.FC<UserProfileContainerProps> = (props) => {
  const {
    userId,
    user: propUser,
    variant = "standard",
    avatarSize = 80,
    showStatus = true,
    tabs = [],
    activeTab: initialActiveTab = "info",
    editableFields = ["firstName", "lastName", "nickname"],
    editable = true,
    showEditButton = true,
    onAction,
    onTabChange,
    onStatusChange,
    onProfileUpdate,
    className,
    sx,
    id,
  } = props;

  // Local state
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});

  // Use user hook for user data
  const {
    user: fetchedUser,
    status,
    displayName,
    isCurrentUser,
    isLoading,
    error,
    refreshUser,
    updateProfile,
    updateStatus,
    isUpdatingProfile,
    uploadProfileImage,
  } = useUser(userId);

  // Use dialog for confirmations
  const dialog = useDialog();

  // If user prop is provided, prefer it over fetched user
  const user = propUser || fetchedUser;

  // Initialize form data when user changes
  useEffect(() => {
    if (user && !isEditMode) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        nickname: user.nickname,
      });
    }
  }, [user, isEditMode]);

  // Handle tab change
  const handleTabChange = useCallback(
    (newTabId: string) => {
      setActiveTab(newTabId);

      // If in edit mode, cancel it when changing tabs
      if (isEditMode) {
        setIsEditMode(false);
      }

      if (onTabChange) {
        onTabChange(newTabId);
      }
    },
    [isEditMode, onTabChange],
  );

  // Handle edit mode toggle
  const handleToggleEditMode = useCallback(() => {
    // If entering edit mode, reset form data to current user
    if (!isEditMode && user) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        nickname: user.nickname,
      });
    }

    setIsEditMode((prev) => !prev);
  }, [isEditMode, user]);

  // Handle field change
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Handle profile update
  const handleUpdateProfile = useCallback(async () => {
    if (!user) return;

    try {
      // Convert form data to profile update format
      const profileUpdate: UserProfileUpdate = {};

      if (formData.username && formData.username !== user.username) {
        profileUpdate.username = formData.username;
      }

      if (formData.email && formData.email !== user.email) {
        profileUpdate.email = formData.email;
      }

      if (
        formData.first_name !== undefined &&
        formData.first_name !== user.first_name
      ) {
        profileUpdate.first_name = formData.first_name;
      }

      if (
        formData.last_name !== undefined &&
        formData.last_name !== user.last_name
      ) {
        profileUpdate.last_name = formData.last_name;
      }

      if (
        formData.nickname !== undefined &&
        formData.nickname !== user.nickname
      ) {
        profileUpdate.nickname = formData.nickname;
      }

      // Update profile if there are changes
      if (Object.keys(profileUpdate).length > 0) {
        const updatedUser = await updateProfile(profileUpdate);

        if (updatedUser && onProfileUpdate) {
          onProfileUpdate(updatedUser);
        }
      }

      // Exit edit mode
      setIsEditMode(false);
    } catch (error) {
      // Show error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while updating profile";

      dialog.showError("Update Failed", errorMessage);
    }
  }, [user, formData, updateProfile, onProfileUpdate, dialog]);

  // Handle action
  const handleAction = useCallback(
    async (action: string) => {
      if (!user) return;

      // Handle built-in actions
      if (action === "edit") {
        handleToggleEditMode();
      } else if (action === "refresh") {
        await refreshUser();
      } else {
        // Pass other actions to the parent
        if (onAction) {
          onAction(action, user);
        }
      }
    },
    [user, handleToggleEditMode, refreshUser, onAction],
  );

  // Get default tabs if none provided
  const getDefaultTabs = useCallback(() => {
    if (tabs && tabs.length > 0) {
      return tabs;
    }

    return [
      {
        id: "info",
        label: "Info",
      },
      {
        id: "activity",
        label: "Activity",
        disabled: true,
      },
      {
        id: "settings",
        label: "Settings",
        disabled: !isCurrentUser,
      },
    ];
  }, [tabs, isCurrentUser]);

  // Check if we should show the profile is loading
  const isProfileLoading = isLoading && !user;

  // Check if we have an error and no user
  const hasError = !!error && !user;

  // Render the user profile UI component
  return (
    <UserProfileUI
      // Profile data
      user={user}
      displayName={displayName || user?.username || ""}
      status={status}
      // Profile state
      isLoading={isProfileLoading || isUpdatingProfile}
      hasError={hasError}
      error={error}
      isEditMode={isEditMode}
      // Profile configuration
      variant={variant}
      avatarSize={avatarSize}
      showStatus={showStatus}
      tabs={getDefaultTabs()}
      activeTab={activeTab}
      editableFields={editableFields}
      formData={formData}
      showEditButton={showEditButton && isCurrentUser}
      isCurrentUser={isCurrentUser}
      // Callbacks
      onTabChange={handleTabChange}
      onFieldChange={handleFieldChange}
      onToggleEditMode={handleToggleEditMode}
      onUpdateProfile={handleUpdateProfile}
      onRefresh={refreshUser}
      // Styling
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserProfileContainer;
