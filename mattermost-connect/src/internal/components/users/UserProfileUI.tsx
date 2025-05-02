// src/internal/components/users/UserProfileUI.tsx
/**
 * User Profile UI Component
 * Pure presentational component for displaying user profiles
 */
import React from "react";
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
import { default as UserAvatarUI } from "./UserAvatarUI";
import { User } from "../../../types";

// Define the props interface for the UI component
export interface UserProfileUIProps {
  // User data
  user: User | null;
  displayName: string;
  status: string;

  // UI state
  isLoading: boolean;
  hasError: boolean;
  error: Error | null;
  isEditMode: boolean;

  // UI configuration
  variant?: "standard" | "compact" | "card";
  avatarSize?: number;
  showStatus?: boolean;
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  activeTab: string;
  editableFields?: Array<
    "username" | "email" | "firstName" | "lastName" | "nickname"
  >;
  formData: Partial<User>;
  showEditButton?: boolean;
  isCurrentUser: boolean;

  // Callbacks
  onTabChange: (tabId: string) => void;
  onFieldChange: (field: string, value: string) => void;
  onToggleEditMode: () => void;
  onUpdateProfile: () => void;
  onRefresh: () => void;

  // Custom renderers
  customHeaderRenderer?: (user: User | null) => React.ReactNode;
  customContentRenderer?: (
    user: User | null,
    activeTab: string,
  ) => React.ReactNode;
}

/**
 * User Profile UI component
 * Handles rendering of user profile information and edit form
 */
export const UserProfileUI: React.FC<UserProfileUIProps> = (props) => {
  const {
    user,
    displayName,
    status,
    isLoading,
    hasError,
    error,
    isEditMode,
    variant = "standard",
    avatarSize = 80,
    showStatus = true,
    tabs = [],
    activeTab,
    editableFields = ["firstName", "lastName", "nickname"],
    formData,
    showEditButton = true,
    isCurrentUser,
    onTabChange,
    onFieldChange,
    onToggleEditMode,
    onUpdateProfile,
    onRefresh,
    customHeaderRenderer,
    customContentRenderer,
  } = props;

  // Render header section
  const renderHeader = () => {
    if (customHeaderRenderer && user) {
      return customHeaderRenderer(user);
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
          <Button size="small" onClick={onRefresh}>
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
        <UserAvatarUI
          displayName={displayName}
          size={avatarSize}
          showStatus={showStatus}
          status={status}
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
                onClick={onToggleEditMode}
                disabled={!isCurrentUser}
              >
                {isEditMode ? "Cancel" : "Edit Profile"}
              </Button>
            )}
          </Typography>

          {showStatus && (
            <Typography variant="body1" color="text.secondary">
              {status}
            </Typography>
          )}

          {user.roles && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {user.roles}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  // Render tabs
  const renderTabs = () => {
    if (tabs.length === 0) return null;

    return (
      <>
        <Tabs
          value={activeTab}
          onChange={(e, value) => onTabChange(value)}
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
  };

  // Render content based on active tab and mode
  const renderContent = () => {
    if (customContentRenderer && user) {
      return customContentRenderer(user, activeTab);
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
                    onChange={(e) => onFieldChange("username", e.target.value)}
                    disabled={!isCurrentUser || isLoading}
                    variant="outlined"
                  />
                </Grid>
              )}

              {/* Other editable fields */}
              {/* ... similar TextField components for each editable field ... */}

              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}
                >
                  <Button
                    variant="outlined"
                    onClick={onToggleEditMode}
                    sx={{ mr: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={onUpdateProfile}
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

            {/* Other display fields */}
            {/* ... similar Typography components for each field ... */}
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
  };

  return (
    <Box>
      {renderHeader()}
      {renderTabs()}
      {renderContent()}
    </Box>
  );
};

export default UserProfileUI;
