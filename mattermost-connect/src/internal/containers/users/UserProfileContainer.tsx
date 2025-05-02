// src/internal/containers/users/UserProfileContainer.tsx
/**
 * User Profile Container
 * Container component that handles user profile logic and state
 * Implements the container pattern with clear separation between logic and UI
 */
import React, { useCallback, useState, useEffect } from "react";
import {
  DetailContainer,
  DetailContainerProps,
  DetailContainerState,
  DetailContainerAPI,
} from "../base/DetailContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { UserProfileUI } from "../../components/users/UserProfileUI";
import { useUser } from "../../../hooks";
import { User, UserStatus } from "../../../types";
import { userService } from "../../../core/services/userService";

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

  // Use container user hook for data and state management
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

  // Use user hook for API operations
  const userHook = useUser(userId);

  // Local state for active tab, edit mode, and form data
  const [activeTab, setActiveTab] = useState<string>(
    initialActiveTab || (tabs.length > 0 ? tabs[0].id : "info"),
  );
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<User>>({});

  // Initialize form data when user data changes
  useEffect(() => {
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

  // Create UI component factory function
  const createUI = useCallback(
    (
      api: DetailContainerAPI,
      state: DetailContainerState,
    ): React.ReactElement => {
      // Utiliser api et state quand c'est pertinent
      const handleUpdateProfile = async () => {
        if (!user) return;

        try {
          // Validate form data
          const validationResult = userService.validateUserProfile(formData);
          if (!validationResult.isValid) {
            const errorMessages = Object.values(validationResult.errors).join(
              ", ",
            );
            dialog.showError("Validation Error", errorMessages);
            return;
          }

          // Create profile update object
          const profileUpdate = userService.createProfileUpdate(formData);

          // Utiliser l'API du DetailContainer pour mettre à jour
          if (state.itemId) {
            await api.updateItem(profileUpdate);

            dialog.showSuccess(
              "Profile Updated",
              "Your profile has been updated successfully.",
            );
            setIsEditMode(false);
          }
        } catch (error) {
          dialog.setError(
            error instanceof Error
              ? error
              : new Error("Failed to update profile"),
          );
        }
      };

      // Create UI props en utilisant state et api
      const profileUIProps = {
        user: state.item as User | null,
        displayName,
        status,
        isLoading: state.isLoading || isLoading,
        hasError: state.hasError || hasError,
        error: state.error || error,
        isEditMode: state.isEditMode,
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
        onToggleEditMode: api.startEdit,
        onUpdateProfile: handleUpdateProfile,
        onRefresh: () => api.refresh(),
        customHeaderRenderer: headerRenderer
          ? (userObj: User | null) => headerRenderer(userId || "", userObj)
          : undefined,
        customContentRenderer: contentRenderer
          ? (userObj: User | null, activeTabId: string) =>
              contentRenderer(userId || "", userObj, activeTabId)
          : undefined,
      };

      return <UserProfileUI {...profileUIProps} />;
    },
    [
      user,
      displayName,
      status,
      isLoading,
      hasError,
      error,
      variant,
      avatarSize,
      showStatus,
      tabs,
      activeTab,
      editableFields,
      formData,
      showEditButton,
      isCurrentUser,
      handleTabChange,
      handleFieldChange,
      dialog,
      userId,
      headerRenderer,
      contentRenderer,
    ],
  );

  // Render the UI component with prepared props through the factory function
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
      render={createUI}
    />
  );
};

export default UserProfileContainer;
