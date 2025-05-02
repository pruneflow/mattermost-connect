// src/internal/containers/users/UserProfileContainer.tsx
/**
 * User Profile Container
 * Container component that handles user profile logic and state
 */
import React, { useCallback, useState } from "react";
import { DetailContainer, DetailContainerProps } from "../base/DetailContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { UserProfileUI } from "../../components/users/UserProfileUI";
import { useUser } from "../../../hooks";
import { User } from "../../../types";
import { userService } from "../../../core/services/userService";

// Keep the existing props interface
/**
 * User profile container props
 */
export interface UserProfileContainerProps extends DetailContainerProps {
  /** User ID */
  userId?: string;
  /** Whether to show edit button for current user */
  showEditButton?: boolean;
  /** Tab configuration */
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    renderer?: (userId: string, user: User | null) => React.ReactNode;
    disabled?: boolean;
  }>;
  /** Initial active tab */
  initialActiveTab?: string;
  /** Whether user is editable */
  editable?: boolean;
  /** Available fields for editing */
  editableFields?: Array<
    "username" | "email" | "firstName" | "lastName" | "nickname"
  >;
  /** Callback when user is updated */
  onUpdate?: (user: User) => void;
  /** Callback when tab is selected */
  onTabSelect?: (tabId: string) => void;
  /** Whether to show status */
  showStatus?: boolean;
  /** Avatar size */
  avatarSize?: number;
  /** Layout variant */
  variant?: "standard" | "compact" | "card";
  /** Custom header renderer */
  headerRenderer?: (userId: string, user: User | null) => React.ReactNode;
  /** Custom content renderer */
  contentRenderer?: (
    userId: string,
    user: User | null,
    activeTab: string,
  ) => React.ReactNode;
}

/**
 * Container component for user profiles
 * Handles user data fetching, state, and edit operations
 */
export const UserProfileContainer: React.FC<UserProfileContainerProps> = (
  props,
) => {
  const {
    userId,
    showEditButton = true,
    tabs = [],
    initialActiveTab,
    editable = false,
    editableFields = ["firstName", "lastName", "nickname"],
    onUpdate,
    onTabSelect,
    showStatus = true,
    avatarSize = 80,
    variant = "standard",
    headerRenderer,
    contentRenderer,
    ...restProps
  } = props;

  // Keep all hooks and state for business logic
  const {
    user,
    displayName,
    status,
    isLoading,
    error,
    hasError,
    isCurrentUser,
    refreshUser,
    dialog,
    loading,
  } = useContainerUser(userId, {
    avatarSize,
    showStatus,
  });

  const userHook = useUser(userId);
  const [activeTab, setActiveTab] = useState<string>(
    initialActiveTab || (tabs.length > 0 ? tabs[0].id : "info"),
  );
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<User>>({});

  // Initialize form data when user data changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        nickname: user.nickname,
      });
    }
  }, [user]);

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (onTabSelect) {
        onTabSelect(tabId);
      }
    },
    [onTabSelect],
  );

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);

    // Reset form data when canceling edit
    if (isEditMode && user) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        nickname: user.nickname,
      });
    }
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
      // Validate form data
      const validationResult = userService.validateUserProfile(formData);
      if (!validationResult.isValid) {
        const errorMessages = Object.values(validationResult.errors).join(", ");
        dialog.showError("Validation Error", errorMessages);
        return;
      }

      // Create profile update object
      const profileUpdate = userService.createProfileUpdate(formData);

      // Use the userHook directly for API operations
      const updatedUser = await loading.withLoading(() =>
        userHook.updateProfile(profileUpdate),
      );

      if (updatedUser) {
        dialog.showSuccess(
          "Profile Updated",
          "Your profile has been updated successfully.",
        );
        setIsEditMode(false);

        // Call update callback if provided
        if (onUpdate) {
          onUpdate(updatedUser);
        }
      }
    } catch (error) {
      dialog.showError(
        "Update Failed",
        (error as Error).message || "Failed to update profile",
      );
    }
  }, [user, formData, dialog, userHook, loading.withLoading, onUpdate]);

  // Prepare props for the UI component
  const profileUiProps = {
    user,
    displayName,
    status,
    isLoading,
    hasError,
    error,
    isEditMode,
    variant,
    avatarSize,
    showStatus,
    tabs,
    activeTab,
    editableFields,
    formData,
    showEditButton,
    isCurrentUser,
    onTabChange: handleTabChange,
    onFieldChange: handleFieldChange,
    onToggleEditMode: toggleEditMode,
    onUpdateProfile: handleUpdateProfile,
    onRefresh: refreshUser,
    customHeaderRenderer: headerRenderer,
    customContentRenderer: contentRenderer,
  };

  // Render the UI component with the prepared props
  return (
    <DetailContainer
      {...restProps}
      itemId={userId}
      item={user}
      editMode={isEditMode}
      onEditRequest={() => setIsEditMode(true)}
      onEditCancel={() => setIsEditMode(false)}
      onUpdateItem={async (id, data) => {
        return await userHook.updateProfile(data);
      }}
      onUpdateComplete={onUpdate}
      render={(api, state) => <UserProfileUI {...profileUiProps} />}
    />
  );
};

export default UserProfileContainer;
