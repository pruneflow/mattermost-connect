// src/internal/containers/users/UserProfileContainer.tsx
import React, { useCallback, useEffect } from "react";
import { useDetailContainer } from "../base/DetailContainer";
import { useUser } from "../../../hooks/";
import UserProfileUI from "../../components/users/UserProfileUI";
import { User, UserProfileUpdate, UserStatus } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { SxProps, Theme } from "@mui/material/styles";

export interface UserProfileContainerProps {
  userId?: string;
  user?: User;
  variant?: "standard" | "compact" | "card";
  avatarSize?: number;
  showStatus?: boolean;
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  activeTab?: string;
  editableFields?: Array<
    "username" | "email" | "firstName" | "lastName" | "nickname"
  >;
  editable?: boolean;
  showEditButton?: boolean;
  onAction?: (action: string, user: User) => void;
  onTabChange?: (tabId: string) => void;
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
  onProfileUpdate?: (user: User) => void;
  className?: string;
  sx?: SxProps<Theme>;
  id?: string;
}

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

  const {
    user: fetchedUser,
    status,
    displayName,
    isCurrentUser,
    refreshUser,
    updateProfile,
    isUpdatingProfile,
  } = useUser(userId);

  const user = propUser || fetchedUser;

  const [detailState, detailAPI] = useDetailContainer({
    itemId: userId,
    item: user,
    editMode: false,
    onLoadItem: async (id) => {
      try {
        const result = await refreshUser();
        return result.data || null;
      } catch (error) {
        console.error("Error loading user:", error);
        return null;
      }
    },
    onUpdateItem: async (id, data) => {
      const profileUpdate: UserProfileUpdate = {};

      // Map fields from data to ProfileUpdate format
      if (data.username && data.username !== user?.username) {
        profileUpdate.username = data.username as string;
      }
      if (data.email && data.email !== user?.email) {
        profileUpdate.email = data.email as string;
      }
      if (
        data.first_name !== undefined &&
        data.first_name !== user?.first_name
      ) {
        profileUpdate.first_name = data.first_name as string;
      }
      if (data.last_name !== undefined && data.last_name !== user?.last_name) {
        profileUpdate.last_name = data.last_name as string;
      }
      if (data.nickname !== undefined && data.nickname !== user?.nickname) {
        profileUpdate.nickname = data.nickname as string;
      }

      const updatedUser = await updateProfile(profileUpdate);

      if (updatedUser && onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }

      return updatedUser;
    },
    showActions: editable && isCurrentUser,
    availableActions: ["edit", "refresh"],
    readOnly: !editable || !isCurrentUser,
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user && !detailState.isEditMode) {
      detailAPI.setItem({
        ...user,
      });
    }
  }, [user, detailState.isEditMode, detailAPI]);

  const handleTabChange = useCallback(
    (newTabId: string) => {
      detailAPI.setActiveTab(newTabId);

      if (onTabChange) {
        onTabChange(newTabId);
      }
    },
    [detailAPI, onTabChange],
  );

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      if (detailState.item) {
        detailAPI.setItem({
          ...detailState.item,
          [field]: value,
        });
      }
    },
    [detailState.item, detailAPI],
  );

  const handleUpdateProfile = useCallback(() => {
    detailAPI.updateItem(detailState.item as User);
  }, [detailAPI, detailState.item]);

  const handleAction = useCallback(
    async (action: string) => {
      if (!user) return;

      await detailAPI.performAction(action);

      if (onAction) {
        onAction(action, user);
      }
    },
    [user, detailAPI, onAction],
  );

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

  const uiProps = {
    user: detailState.item as User | null,
    displayName: displayName || (detailState.item as User)?.username || "",
    status,
    isLoading: detailState.isLoading || isUpdatingProfile,
    hasError: detailState.hasError,
    error: detailState.error,
    isEditMode: detailState.isEditMode,
    variant,
    avatarSize,
    showStatus,
    tabs: getDefaultTabs(),
    activeTab: detailState.activeTab || initialActiveTab,
    editableFields,
    formData: detailState.item || {},
    showEditButton: showEditButton && isCurrentUser,
    isCurrentUser,
    onTabChange: handleTabChange,
    onFieldChange: handleFieldChange,
    onToggleEditMode: detailAPI.startEdit,
    onUpdateProfile: handleUpdateProfile,
    onRefresh: detailAPI.refresh,
    className,
    sx,
    id,
  };

  return <UserProfileUI {...uiProps} />;
};

export default UserProfileContainer;
