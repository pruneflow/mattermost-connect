/**
 * User menu component with avatar, status management, and user actions
 * Provides dropdown menu with status options, profile access, settings, and logout
 */
import React, { useState, useCallback } from "react";
import {
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { UserAvatar } from "../atoms/UserAvatar";
import { StatusBadge } from "../atoms/StatusBadge";
import { UserMenuSkeleton } from "../atoms/SkeletonLoader";
import { UserProfile } from "./UserProfile";
import { SettingsDialog } from "./SettingsDialog";
import { useUserStatus } from "../../hooks/useUserStatus";
import { displayUsername } from "../../utils/userUtils";
import { STATUS_OPTIONS } from "../../utils/statusUtils";
import type {
  UserProfile as UserProfileType,
  UserStatus,
} from "../../api/types";
import { logout } from "../../services/authService";

export interface UserMenuProps {
  user?: UserProfileType;
  size?: "small" | "medium" | "large";
  showStatus?: boolean;
  showProfile?: boolean;
  onLogout?: () => void;
  loading?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  size = "medium",
  showStatus = true,
  showProfile = true,
  onLogout,
  loading = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { status, updateStatus } = useUserStatus();
  // Using logout from authService directly

  const handleAvatarClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setMenuAnchor(event.currentTarget);
    },
    [],
  );

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleStatusChange = useCallback(
    async (newStatus: UserStatus["status"]) => {
      setIsUpdatingStatus(true);
      try {
        await updateStatus(newStatus);
        handleCloseMenu();
      } catch (error) {
        // Status update failed - UI will show current status
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [updateStatus, handleCloseMenu],
  );

  const handleLogout = useCallback(() => {
    void logout();
    if (onLogout) {
      onLogout();
    }
    handleCloseMenu();
  }, [onLogout, handleCloseMenu]);

  const handleProfileOpen = useCallback(() => {
    setProfileOpen(true);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleProfileClose = useCallback(() => {
    setProfileOpen(false);
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setSettingsOpen(true);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleSettingsClose = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleStatusSelect = (e: React.MouseEvent<HTMLLIElement>) => {
    const status = e.currentTarget.dataset.status as UserStatus["status"];
    if (status) {
      handleStatusChange(status);
    }
  };

  // Show skeleton loader when loading or no user
  if (loading || !user) {
    return (
      <Box
        sx={{
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          borderRadius: "50%",
          minWidth: { xs: 44, sm: "auto" },
          minHeight: { xs: 44, sm: "auto" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <UserMenuSkeleton />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          borderRadius: "50%",
          // Mobile touch target
          minWidth: { xs: 44, sm: "auto" },
          minHeight: { xs: 44, sm: "auto" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": {
            transform: { xs: "none", sm: "scale(1.05)" }, // No scale on mobile
            boxShadow: { xs: "none", sm: 4 },
          },
          "&:active": {
            transform: { xs: "scale(0.95)", sm: "scale(1.05)" }, // Mobile tactile feedback
          },
        }}
        onClick={handleAvatarClick}
      >
        <UserAvatar userId={user.id} size={size} showStatus={showStatus} />
      </Box>

      <Menu
        anchorEl={menuAnchor}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        sx={{
          "& .MuiPaper-root": {
            minWidth: { xs: 200, sm: 240 },
            maxWidth: { xs: 280, sm: 320 },
          },
        }}
      >
        {/* User info */}
        <Box sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {displayUsername(user, "full_name", true)}
          </Typography>
          {user.username && (
            <Typography variant="body2" color="text.secondary">
              @{user.username}
            </Typography>
          )}
        </Box>
        <Divider />

        {/* Status options */}
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 0.5,
            display: "block",
            color: "text.secondary",
          }}
        >
          SET STATUS
        </Typography>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            data-status={option.value}
            onClick={handleStatusSelect}
            selected={status === option.value}
            disabled={isUpdatingStatus}
            sx={{ display: "flex", justifyContent: "space-between" }}
          >
            <Box display="flex" alignItems="center">
              <ListItemIcon sx={{ color: option.color }}>
                {isUpdatingStatus && status === option.value ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <StatusBadge status={option.value} />
                )}
              </ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </Box>
            {status === option.value && (
              <CheckIcon
                fontSize="small"
                sx={{
                  color: option.color,
                  ml: 1,
                }}
              />
            )}
          </MenuItem>
        ))}
        <Divider />

        {/* Profile, Settings and logout */}
        {showProfile && (
          <MenuItem onClick={handleProfileOpen}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleSettingsOpen}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>

        {/* Logout section */}
        <>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </>
      </Menu>

      {/* User Profile Dialog */}
      {profileOpen && (
        <UserProfile user={user} editable onClose={handleProfileClose} />
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={handleSettingsClose} />
    </>
  );
};

export default UserMenu;
