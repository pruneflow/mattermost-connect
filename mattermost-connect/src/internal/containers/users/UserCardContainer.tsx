// src/internal/containers/users/UserCardContainer.tsx
/**
 * User Card Container
 * Container component that provides connected functionality for user cards
 */
import React, { useCallback, useState, useRef } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import UserCardUI, { UserCardUIProps } from "../../components/users/UserCardUI";
import UserProfileUI from "../../components/users/UserProfileUI";
import StatusSelector from "../../components/common/StatusSelector";
import { User, UserStatus } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useUser } from "../../../hooks/useUsers";
import { useDirectChannels } from "../../../hooks/useDirectChannels";
import { useChannels } from "../../../hooks/useChannels";
import { SxProps, Theme } from "@mui/material";

export interface UserCardContainerProps {
  /** User ID - used to fetch user data from store */
  userId?: string;
  /** User data (if no userId is provided) */
  user?: User;
  /** Card variant */
  variant?: "default" | "compact" | "expanded";
  /** Size of the avatar */
  avatarSize?: number;
  /** Whether to show the user's status */
  showStatus?: boolean;
  /** Whether to show additional user details */
  showDetails?: boolean;
  /** Whether to show actions */
  showActions?: boolean;
  /** Available actions */
  availableActions?: string[];
  /** Whether to add an outline to the card */
  outlined?: boolean;
  /** Card elevation (shadow depth) */
  elevation?: number;
  /** Whether the card is in selected state */
  selected?: boolean;
  /** Callback when an action is performed */
  onAction?: (action: string, user: User) => void;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when status is changed */
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
  /** Callback when more options button is clicked */
  onMoreOptionsClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * User Card Container Component
 * Provides connected functionality for displaying and interacting with user cards
 */
const UserCardContainer: React.FC<UserCardContainerProps> = (props) => {
  const {
    userId,
    user: propUser,
    variant = "default",
    avatarSize,
    showStatus = true,
    showDetails = true,
    showActions = true,
    availableActions = ["message", "profile"],
    outlined = false,
    elevation = 1,
    selected = false,
    onAction,
    onClick,
    onStatusChange,
    onMoreOptionsClick,
    className,
    sx,
    id,
  } = props;

  // References and state
  const [tempStatus, setTempStatus] = useState<UserStatus | null>(null);

  // Use base container for common functionality
  const [baseState, baseAPI] = useBaseContainer({
    id,
    className,
    sx,
  });

  // Get user data and actions from hooks
  const {
    user: fetchedUser,
    status,
    displayName,
    isCurrentUser,
    isLoading,
    error,
    refreshUser,
    updateStatus,
  } = useUser(userId);

  // Get direct message functionality
  const { createDirectChannel } = useDirectChannels();
  const { selectChannel } = useChannels(undefined);

  // Dialog management
  const dialog = useDialog();

  // Determine which user to use
  const user = propUser || fetchedUser;

  // Handler for card click
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  // Handler for message action
  const handleMessageAction = useCallback(
    async (targetUser: User) => {
      try {
        if (onAction) {
          onAction("message", targetUser);
          return;
        }

        baseAPI.setLoading(true);

        // Feedback visuel optionnel
        const alertId = dialog.alert({
          title: "Opening conversation...",
          message: "Please wait while we connect you with this user.",
          confirmText: "",
          cancelText: "Cancel",
        });

        // Create or get direct channel
        const directChannel = await createDirectChannel(targetUser.id);

        dialog.closeDialog(alertId);

        baseAPI.setLoading(false);

        if (directChannel) {
          // Select the channel to make it active
          await selectChannel(directChannel);

          // Show a confirmation
          dialog.showSuccess(
            "Conversation",
            "Conversation opened successfully",
          );
        } else {
          dialog.showError(
            "Conversation",
            "Could not open conversation with this user",
          );
        }
      } catch (error) {
        console.error("Failed to open direct message:", error);
        dialog.showError("Conversation", "Failed to start conversation");
      }
    },
    [onAction, dialog, createDirectChannel, selectChannel],
  );

  // Handler for profile action
  const handleProfileAction = useCallback(
    (targetUser: User) => {
      if (onAction) {
        onAction("profile", targetUser);
        return;
      }

      // Default implementation for profile action
      // Show user profile in a dialog
      dialog.custom({
        title: "User Profile",
        component: (
          <UserProfileUI
            error={error}
            user={targetUser}
            displayName={targetUser.username || ""}
            status={status || "offline"}
            isLoading={false}
            hasError={false}
            isEditMode={false}
            variant="card"
            showStatus={true}
            tabs={[{ id: "info", label: "Information" }]}
            activeTab="info"
            editableFields={[]}
            formData={targetUser}
            showEditButton={false}
            isCurrentUser={isCurrentUser}
            onTabChange={() => {}}
            onFieldChange={() => {}}
            onToggleEditMode={() => {}}
            onUpdateProfile={() => {}}
            onRefresh={() => {}}
          />
        ),
        maxWidth: "md",
        confirmText: "Close",
        cancelText: "",
        onConfirm: () => {},
      });
    },
    [onAction, dialog, status, isCurrentUser],
  );

  // Handler for change status action
  const handleChangeStatusAction = useCallback(() => {
    if (!isCurrentUser) return;

    const handleStatusChange = (data: { status: UserStatus }) => {
      setTempStatus(data.status);
    };

    const id = dialog.custom({
      title: "Change Status",
      component: (
        <StatusSelector
          initialStatus={status || "offline"}
          onDataChange={handleStatusChange}
        />
      ),
      confirmText: "Save",
      cancelText: "Cancel",
      onConfirm: async () => {
        if (!tempStatus || tempStatus === status) return;

        try {
          const success = await updateStatus(tempStatus);
          if (success) {
            dialog.showSuccess("Status", "Status updated successfully");
            if (onStatusChange && user) {
              onStatusChange(user, tempStatus);
            }
          } else {
            dialog.showError("Status", "Failed to update status");
          }
        } catch (error) {
          console.error("Failed to update status:", error);
          dialog.showError("Status", "An error occurred while updating status");
        }
      },
      onCancel: () => {
        setTempStatus(null);
      },
      maxWidth: "xs",
    });
  }, [
    isCurrentUser,
    status,
    dialog,
    updateStatus,
    tempStatus,
    onStatusChange,
    user,
  ]);

  // Main action handler - routes to specific handlers
  const handleActionClick = useCallback(
    (action: string) => {
      if (!user) return;

      baseAPI.withLoading(async () => {
        switch (action) {
          case "message":
            await handleMessageAction(user);
            break;

          case "profile":
            handleProfileAction(user);
            break;

          case "changeStatus":
            if (isCurrentUser) {
              handleChangeStatusAction();
            }
            break;

          case "more":
            // This case is handled directly in the UI component
            // which passes the event to handleMoreOptionsAction
            break;

          default:
            // For custom actions, call the onAction callback
            if (onAction) {
              onAction(action, user);
            }
            break;
        }
      });
    },
    [
      user,
      baseAPI,
      handleMessageAction,
      handleProfileAction,
      handleChangeStatusAction,
      isCurrentUser,
      onAction,
    ],
  );

  // Get avatar size based on variant
  const getAvatarSize = useCallback(() => {
    if (avatarSize) return avatarSize;

    switch (variant) {
      case "compact":
        return 40;
      case "expanded":
        return 80;
      default:
        return 56;
    }
  }, [variant, avatarSize]);

  // Determine loading and error states
  const isCardLoading = isLoading && !user;
  const hasError = !!error && !user;

  // Prepare UI props
  const uiProps: UserCardUIProps = {
    // Core data
    user,
    displayName: displayName || user?.username || "",
    status,

    // Card appearance
    variant,
    isLoading: isCardLoading || baseState.isLoading,
    hasError,
    error,
    isCurrentUser,
    showStatus,
    showActions,
    availableActions,
    showRole: variant === "expanded",
    showEmail: showDetails,
    elevation,
    outlined,
    selected,
    avatarSize: getAvatarSize(),

    // Callbacks
    onActionClick: handleActionClick,
    onClick: handleClick,
    onRefresh: refreshUser,

    // Style props
    className,
    sx,
    id,
  };

  return <UserCardUI {...uiProps} />;
};

export default UserCardContainer;
