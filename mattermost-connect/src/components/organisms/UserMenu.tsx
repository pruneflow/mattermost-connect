import React, { useState, useCallback } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { UserAvatar } from '../atoms/UserAvatar';
import { StatusBadge } from '../atoms/StatusBadge';
import { UserProfile } from './UserProfile';
import { useUserStatus } from '../../hooks/useUserStatus';
import { displayUsername } from '../../utils/userUtils';
import { STATUS_OPTIONS } from '../../utils/statusUtils';
import type { UserProfile as UserProfileType, UserStatus } from '../../api/types';

export interface UserMenuProps {
  user: UserProfileType;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  showProfile?: boolean;
  onLogout?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  size = 'medium',
  showStatus = true,
  showProfile = true,
  onLogout,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { status, updateStatus } = useUserStatus();

  const handleAvatarClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleStatusChange = useCallback(
    async (newStatus: UserStatus['status']) => {
      setIsUpdatingStatus(true);
      try {
        await updateStatus(newStatus);
        handleCloseMenu();
      } catch (error) {
        console.error('Failed to update status:', error);
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [updateStatus, handleCloseMenu],
  );

  const handleLogout = useCallback(() => {
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

  return (
    <>
      <Box 
        sx={{ 
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          borderRadius: '50%',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }
        }} 
        onClick={handleAvatarClick}
      >
        <UserAvatar user={user} size={size} showStatus={showStatus} />
      </Box>

      <Menu
        anchorEl={menuAnchor}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        {/* User info */}
        <Box sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {displayUsername(user, 'full_name', true)}
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
            display: 'block',
            color: 'text.secondary',
          }}
        >
          SET STATUS
        </Typography>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            selected={status === option.value}
            disabled={isUpdatingStatus}
            sx={{ display: 'flex', justifyContent: 'space-between' }}
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

        {/* Profile and logout */}
        {showProfile && (
          <MenuItem onClick={handleProfileOpen}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile Settings</ListItemText>
          </MenuItem>
        )}
        {onLogout && (
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* User Profile Dialog */}
      {profileOpen && (
        <UserProfile
          user={user}
          editable
          onClose={handleProfileClose}
        />
      )}
    </>
  );
};

export default UserMenu;