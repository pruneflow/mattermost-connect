import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  DoNotDisturb as DoNotDisturbIcon,
  OfflinePin as OfflinePinIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { UserStatus } from '../api/types';

// Status options config
export const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4caf50', icon: <CheckCircleIcon /> },
  { value: 'away', label: 'Away', color: '#ff9800', icon: <AccessTimeIcon /> },
  { value: 'dnd', label: 'Do Not Disturb', color: '#f44336', icon: <DoNotDisturbIcon /> },
  { value: 'offline', label: 'Offline', color: '#9e9e9e', icon: <OfflinePinIcon /> }
];

export interface UserStatusMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  username?: string;
  fullName?: string;
  currentStatus?: UserStatus;
  onStatusChange: (status: UserStatus) => Promise<void>;
  isLoading?: boolean;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export function UserStatusMenu({
  anchorEl,
  open,
  onClose,
  username,
  fullName,
  currentStatus,
  onStatusChange,
  isLoading = false,
  onOpenProfile,
  onLogout
}: UserStatusMenuProps) {
  // Handle status click
  const handleStatusClick = async (status: UserStatus) => {
    try {
      await onStatusChange(status);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Handle profile click
  const handleOpenProfile = () => {
    onClose();
    onOpenProfile();
  };

  // Handle logout click
  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={open}
      onClose={onClose}
    >
      {/* User info */}
      <Box sx={{ py: 1, px: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {fullName || username || 'User'}
        </Typography>
        {username && (
          <Typography variant="body2" color="text.secondary">
            @{username}
          </Typography>
        )}
      </Box>
      <Divider />
      
      {/* Status options */}
      <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>
        SET STATUS
      </Typography>
      {STATUS_OPTIONS.map(option => (
        <MenuItem 
          key={option.value} 
          onClick={() => handleStatusClick(option.value as UserStatus)}
          selected={currentStatus === option.value}
          disabled={isLoading}
          sx={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <Box display="flex" alignItems="center">
            <ListItemIcon sx={{ color: option.color }}>
              {isLoading && currentStatus === option.value ? 
                <CircularProgress size={20} color="inherit" /> : 
                option.icon
              }
            </ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </Box>
          {currentStatus === option.value && (
            <CheckIcon 
              fontSize="small" 
              sx={{ 
                color: option.color,
                ml: 1
              }} 
            />
          )}
        </MenuItem>
      ))}
      <Divider />
      
      {/* Profile and logout */}
      <MenuItem onClick={handleOpenProfile}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile Settings</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default UserStatusMenu;