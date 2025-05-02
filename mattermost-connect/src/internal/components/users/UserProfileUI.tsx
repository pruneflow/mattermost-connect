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
  Card,
  Paper,
  CircularProgress,
} from "@mui/material";
import { Edit as EditIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import UserAvatarUI from "./UserAvatarUI";
import { BaseComponentProps } from "../../types/componentTypes";
import { User, UserStatus } from "../../../types";

/**
 * User profile UI props
 */
export interface UserProfileUIProps extends BaseComponentProps {
  // User data
  user: User | null;
  displayName: string;
  status: UserStatus;

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
    className,
    sx,
    id,
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
          <Button
            size="small"
            onClick={onRefresh}
            startIcon={<RefreshIcon />}
            sx={{ mt: 1 }}
          >
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
          imageUrl={
            user.last_picture_update
              ? `${user.id}/image?_=${user.last_picture_update}`
              : undefined
          }
          size={avatarSize}
          showStatus={showStatus}
          status={status}
        />

        <Box sx={{ flexGrow: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Typography
              variant={variant === "compact" ? "h6" : "h4"}
              component="div"
              gutterBottom={variant !== "compact"}
            >
              {displayName}
            </Typography>

            {isCurrentUser && showEditButton && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={onToggleEditMode}
                disabled={!isCurrentUser}
              >
                {isEditMode ? "Cancel" : "Edit Profile"}
              </Button>
            )}
          </Box>

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

  // Render field in edit form
  const renderField = (
    field: "username" | "email" | "firstName" | "lastName" | "nickname",
    label: string,
    autoFocus: boolean = false,
  ) => {
    if (!editableFields.includes(field)) return null;

    // Map field name to formData property
    const fieldMap: Record<string, keyof typeof formData> = {
      username: "username",
      email: "email",
      firstName: "first_name",
      lastName: "last_name",
      nickname: "nickname",
    };

    const formField = fieldMap[field];

    return (
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label={label}
          fullWidth
          value={formData[formField] || ""}
          onChange={(e) => onFieldChange(formField as string, e.target.value)}
          disabled={!isCurrentUser || isLoading}
          variant="outlined"
          autoFocus={autoFocus}
          margin="normal"
        />
      </Grid>
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
              {renderField("username", "Username", true)}
              {renderField("email", "Email Address")}
              {renderField("firstName", "First Name")}
              {renderField("lastName", "Last Name")}
              {renderField("nickname", "Nickname")}

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
                    {isLoading ? (
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                    ) : null}
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

            {user.first_name && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  First Name
                </Typography>
                <Typography variant="body1">{user.first_name}</Typography>
              </Grid>
            )}

            {user.last_name && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Last Name
                </Typography>
                <Typography variant="body1">{user.last_name}</Typography>
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

  // Render based on variant
  const content = (
    <>
      {renderHeader()}
      {renderTabs()}
      {renderContent()}
    </>
  );

  // Wrap in appropriate container based on variant
  if (variant === "card") {
    return (
      <Card
        className={className}
        sx={{
          ...sx,
          overflow: "hidden",
        }}
        id={id}
      >
        {content}
      </Card>
    );
  } else if (variant === "compact") {
    return (
      <Paper
        className={className}
        sx={{
          ...sx,
          overflow: "hidden",
        }}
        id={id}
      >
        {content}
      </Paper>
    );
  } else {
    return (
      <Box className={className} sx={sx} id={id}>
        {content}
      </Box>
    );
  }
};

export default UserProfileUI;
