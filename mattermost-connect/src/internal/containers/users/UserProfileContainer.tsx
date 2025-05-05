// src/internal/containers/users/UserProfileContainer.tsx
/**
 * User Profile Container
 * Container component for user profile display and editing
 * Extends DetailContainer pattern for standardized behavior
 */
import React, { useCallback, useMemo } from "react";
import {
  DetailContainerProps,
  useDetailContainer,
} from "../base/DetailContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { User, UserProfileUpdate, UserStatus } from "../../../types";
import { useMemoizedProps } from "../../utils/performanceUtils";
import { useDialog } from "../../hooks/useDialog";
import StatusSelector from "../../components/common/StatusSelector";
import ImageUploader from "../../components/common/ImageUploader";

/**
 * User profile container props
 */
export interface UserProfileContainerProps extends DetailContainerProps<User> {
  /**
   * User ID to display
   */
  userId: string;
  /**
   * User object (optional, will be fetched if not provided)
   */
  user?: User;
  /**
   * Whether to show the user's status indicator
   */
  showStatus?: boolean;
  /**
   * Available tabs to display
   */
  availableTabs?: string[];
  /**
   * Active tab
   */
  activeTab?: string;
  /**
   * Available actions
   */
  availableActions?: string[];
  /**
   * Whether profile is editable
   */
  editable?: boolean;
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
}

/**
 * User Profile Container
 * Displays and manages user profile information
 */
export const UserProfileContainer: React.FC<
  UserProfileContainerProps & {
    children?: React.ReactNode | ((props: any) => React.ReactNode);
    render?: (props: any) => React.ReactNode;
  }
> = (props) => {
  const {
    userId,
    user: propUser,
    showStatus = true,
    availableTabs = ["info", "activity", "settings"],
    activeTab: propActiveTab = "info",
    availableActions = [],
    editable = true,
    onAction,
    onTabChange,
    onStatusChange,
    onProfileUpdate,
    children,
    render,
    ...restProps
  } = props;

  // Use dialog for complex interactions
  const dialog = useDialog();

  // Use user container hook
  const { userState, userActions, uiProps } = useContainerUser(userId, {
    showStatus,
    autoFetch: !propUser,
    availableActions: [
      ...availableActions,
      ...(editable ? ["edit", "uploadImage"] : []),
    ],
  });

  // If user prop is provided, prefer it over fetched user
  const user = propUser || userState.user;

  // Use detail container for standardized behavior
  const [detailState, detailAPI] = useDetailContainer<User>({
    ...restProps,
    itemId: userId,
    item: user,
    initialLoading: userState.isLoading,
    initialError: userState.error,
    editMode: userState.isEditMode,
    onLoadItem: async (id) => {
      return await userActions.refreshUser();
    },
    onUpdateItem: async (id, data) => {
      const result = await userActions.updateProfile(data as UserProfileUpdate);

      if (result && onProfileUpdate) {
        onProfileUpdate(result);
      }

      return result || null;
    },
    onEditRequest: userActions.startEdit,
    onEditCancel: userActions.cancelEdit,
  });

  // Current active tab state
  const [activeTab, setActiveTab] = React.useState<string>(propActiveTab);

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);

      if (onTabChange) {
        onTabChange(tabId);
      }
    },
    [onTabChange],
  );

  // Handle action
  const handleAction = useCallback(
    async (action: string) => {
      if (!user) return;

      // Handle custom actions through callback
      if (onAction) {
        onAction(action, user);
      }

      // Handle built-in actions via detail container
      if (action === "edit") {
        detailAPI.performAction("edit");
      } else if (action === "refresh") {
        await detailAPI.performAction("refresh");
      } else if (action === "uploadImage" && userState.isCurrentUser) {
        const result = await dialog.formAsync<{ file: File | null }>({
          title: "Upload Profile Picture",
          component: <ImageUploader />,
          initialData: { file: null },
          confirmText: "Upload",
          cancelText: "Cancel",
        });

        if (result.confirmed && result.data && result.data.file) {
          await userActions.uploadProfileImage(result.data.file);
        }
      } else if (action === "changeStatus" && userState.isCurrentUser) {
        const newStatus = await dialog.formAsync<{ status: UserStatus }>({
          title: "Change Status",
          component: <StatusSelector initialStatus={userState.status} />,
          initialData: { status: userState.status },
          confirmText: "Update Status",
          cancelText: "Cancel",
        });

        if (newStatus.confirmed && newStatus.data) {
          await userActions.updateStatus(newStatus.data.status);
          if (onStatusChange) {
            onStatusChange(user, newStatus.data.status);
          }
        }
      }
    },
    [user, onAction, userState, userActions, detailAPI, dialog, onStatusChange],
  );

  // Create memoized props for UI component
  const profileUIProps = useMemo(() => {
    // Get base profile props from hook
    const baseProfileProps = uiProps.getProfileProps();

    return useMemoizedProps({
      ...baseProfileProps,

      // Detail container state
      isLoading: detailState.isLoading,
      isEditMode: detailState.isEditMode,
      error: detailState.error,

      // Tab state
      activeTab,
      availableTabs,
      onTabChange: handleTabChange,

      // Actions
      onAction: handleAction,
      onStartEdit: detailAPI.startEdit,
      onCancelEdit: detailAPI.cancelEdit,
      onSubmitEdit: detailAPI.updateItem,
      onRefresh: detailAPI.refresh,

      // Editing capability
      editable: editable && userState.isCurrentUser,
    });
  }, [
    uiProps,
    detailState.isLoading,
    detailState.isEditMode,
    detailState.error,
    activeTab,
    availableTabs,
    handleTabChange,
    handleAction,
    detailAPI.startEdit,
    detailAPI.cancelEdit,
    detailAPI.updateItem,
    detailAPI.refresh,
    editable,
    userState.isCurrentUser,
  ]);

  // Use render prop pattern if provided
  if (render) {
    return <>{render(profileUIProps)}</>;
  }

  // Use children render function if provided
  if (typeof children === "function") {
    return <>{children(profileUIProps)}</>;
  }

  // Return children wrapped with context if needed
  return <>{children}</>;
};

export default UserProfileContainer;
