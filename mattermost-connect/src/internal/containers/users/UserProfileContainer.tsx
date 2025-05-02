// src/internal/containers/users/UserProfileContainer.tsx
/**
 * User Profile Container
 * Standardized container for displaying user profiles
 */
import React, { useCallback, useMemo, useState } from "react";
import { DetailContainer, DetailContainerProps } from "../base/DetailContainer";
import { useContainerUser } from "../../hooks/useContainerUser";
import { UserAvatarContainer } from "./UserAvatarContainer";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Button,
  TextField,
  Grid,
  Skeleton,
} from "@mui/material";
import { userService } from "../../../core/services/userService";
import { useUser } from "../../../hooks";
import { User } from "../../../types";

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
 * User Profile Container
 * Displays a user profile with tabs and editable fields
 *
 * @example
 * ```tsx
 * <UserProfileContainer
 *   userId="user123"
 *   showEditButton
 *   editable
 *   tabs={[
 *     { id: "info", label: "Information" },
 *     { id: "activity", label: "Activity" }
 *   ]}
 * />
 * ```
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

  // Use container user hook
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

  // Get the full user hook for direct API operations
  const userHook = useUser(userId);

  // Track active tab
  const [activeTab, setActiveTab] = useState<string>(
    initialActiveTab || (tabs.length > 0 ? tabs[0].id : "info"),
  );

  // Track edit mode
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
    (event: React.SyntheticEvent, newValue: string) => {
      setActiveTab(newValue);
      if (onTabSelect) {
        onTabSelect(newValue);
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

  // Render header
  const renderHeader = useMemo(() => {
    if (headerRenderer && user) {
      return headerRenderer(userId || "", user);
    }

    if (isLoading) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
          <Skeleton variant="circular" width={avatarSize} height={avatarSize} />
          <Box sx={{ ml: 2 }}>
            <Skeleton width={200} height={32} />
            <Skeleton width={120} height={24} />
          </Box>
        </Box>
      );
    }

    if (hasError || !user) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography color="error">
            {error?.message || "Failed to load user profile"}
          </Typography>
          <Button size="small" onClick={() => refreshUser()}>
            Retry
          </Button>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          p: variant === "compact" ? 1 : 3,
          display: "flex",
          flexDirection: variant === "compact" ? "row" : "column",
          alignItems: variant === "compact" ? "center" : "flex-start",
          gap: 2,
        }}
      >
        <UserAvatarContainer
          userId={userId}
          size={avatarSize}
          showStatus={showStatus}
        />

        <Box>
          <Typography
            variant={variant === "compact" ? "h6" : "h4"}
            component="div"
            gutterBottom={variant !== "compact"}
          >
            {displayName}
            {isCurrentUser && showEditButton && (
              <Button
                variant="outlined"
                size="small"
                sx={{ ml: 2 }}
                onClick={toggleEditMode}
                disabled={!editable || !isCurrentUser}
              >
                {isEditMode ? "Cancel" : "Edit Profile"}
              </Button>
            )}
          </Typography>

          {showStatus && (
            <Typography variant="body1" color="text.secondary">
              {userService.formatUserStatus(status)}
            </Typography>
          )}

          {user.roles && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {userService.getUserRolesText(user)}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }, [
    headerRenderer,
    user,
    userId,
    isLoading,
    avatarSize,
    hasError,
    error,
    refreshUser,
    variant,
    showStatus,
    displayName,
    isCurrentUser,
    showEditButton,
    toggleEditMode,
    editable,
    isEditMode,
    status,
  ]);

  // Render tabs
  const renderTabs = useMemo(() => {
    if (tabs.length === 0) return null;

    return (
      <>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="user profile tabs"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              value={tab.id}
              disabled={tab.disabled || isLoading}
            />
          ))}
        </Tabs>
        <Divider />
      </>
    );
  }, [tabs, activeTab, handleTabChange, isLoading]);

  // Render content
  const renderContent = useMemo(() => {
    if (contentRenderer && user) {
      return contentRenderer(userId || "", user, activeTab);
    }

    if (isLoading) {
      return (
        <Box sx={{ p: 3 }}>
          <Skeleton width="100%" height={40} />
          <Skeleton width="100%" height={40} />
          <Skeleton width="80%" height={40} />
        </Box>
      );
    }

    if (hasError || !user) {
      return null; // Error already handled in header
    }

    // Find active tab
    const activeTabConfig = tabs.find((tab) => tab.id === activeTab);

    // If tab has custom renderer, use it
    if (activeTabConfig?.renderer) {
      return activeTabConfig.renderer(userId || "", user);
    }

    // If tab has content, use it
    if (activeTabConfig?.content) {
      return activeTabConfig.content;
    }

    // Default content - profile info or edit form
    if (activeTab === "info" || tabs.length === 0) {
      if (isEditMode) {
        return (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {editableFields.includes("username") && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Username"
                    fullWidth
                    value={formData.username || ""}
                    onChange={(e) =>
                      handleFieldChange("username", e.target.value)
                    }
                    disabled={!isCurrentUser || isLoading}
                    variant="outlined"
                  />
                </Grid>
              )}

              {editableFields.includes("email") && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email"
                    fullWidth
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    disabled={!isCurrentUser || isLoading}
                    variant="outlined"
                  />
                </Grid>
              )}

              {editableFields.includes("firstName") && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="First Name"
                    fullWidth
                    value={formData.first_name || ""}
                    onChange={(e) =>
                      handleFieldChange("first_name", e.target.value)
                    }
                    disabled={!isCurrentUser || isLoading}
                    variant="outlined"
                  />
                </Grid>
              )}

              {editableFields.includes("lastName") && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    value={formData.last_name || ""}
                    onChange={(e) =>
                      handleFieldChange("last_name", e.target.value)
                    }
                    disabled={!isCurrentUser || isLoading}
                    variant="outlined"
                  />
                </Grid>
              )}

              {editableFields.includes("nickname") && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Nickname"
                    fullWidth
                    value={formData.nickname || ""}
                    onChange={(e) =>
                      handleFieldChange("nickname", e.target.value)
                    }
                    disabled={!isCurrentUser || isLoading}
                    variant="outlined"
                  />
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}
                >
                  <Button
                    variant="outlined"
                    onClick={toggleEditMode}
                    sx={{ mr: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                  >
                    Save Changes
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
      }

      // Display mode
      return (
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1" color="text.secondary">
                Username
              </Typography>
              <Typography variant="body1">{user.username}</Typography>
            </Grid>

            {user.email && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{user.email}</Typography>
              </Grid>
            )}

            {(user.first_name || user.last_name) && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">
                  {[user.first_name, user.last_name].filter(Boolean).join(" ")}
                </Typography>
              </Grid>
            )}

            {user.nickname && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Nickname
                </Typography>
                <Typography variant="body1">{user.nickname}</Typography>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1" color="text.secondary">
                Role
              </Typography>
              <Typography variant="body1">
                {userService.getUserRolesText(user)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      );
    }

    // Fallback for unknown tabs
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No content available for this tab.</Typography>
      </Box>
    );
  }, [
    contentRenderer,
    user,
    userId,
    activeTab,
    isLoading,
    hasError,
    tabs,
    isEditMode,
    editableFields,
    formData,
    handleFieldChange,
    isCurrentUser,
    toggleEditMode,
    handleUpdateProfile,
  ]);

  // Combine the elements based on variant
  const renderProfile = useMemo(() => {
    return (
      <>
        {renderHeader}
        {renderTabs}
        {renderContent}
      </>
    );
  }, [renderHeader, renderTabs, renderContent]);

  // Return the detail container with user profile
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
      render={(api, state) => renderProfile}
    />
  );
};

export default UserProfileContainer;
