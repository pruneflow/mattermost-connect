import React, { useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Divider, CircularProgress } from '@mui/material';
import { User, UserStatus } from '../../api/types';
import { UserAvatar } from '../common/UserAvatar';
import { StatusIndicator } from '../common/StatusIndicator';
import { getUserInitials } from '../../utils/formatters';
import { useUserStatus } from '../../hooks/useUserStatus';
import {
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  DoNotDisturb as DoNotDisturbIcon,
  OfflinePin as OfflinePinIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import UserProfile from './UserProfile';

// Import STATUS_OPTIONS from statusConfig to ensure consistency
import { STATUS_OPTIONS as CONFIG_STATUS_OPTIONS } from '../../utils/statusConfig';
import { UserStatusBadge } from '../common/UserStatusBadge';

// Status options config - using the centralized config
export const STATUS_OPTIONS = CONFIG_STATUS_OPTIONS.map(option => ({
  ...option,
  // Convert the React.Element to JSX for direct use in the menu
  icon: option.icon
}));

interface UserMenuProps {
  user?: User | null;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  showMenu?: boolean;
  showProfile?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onStatusChange?: (status: UserStatus) => Promise<void>;
  isUpdatingStatus?: boolean;
  onLogout?: () => void;
}

/**
 * UserMenu component that displays a user's avatar with status indicator and dropdown menu
 * Renamed from UserAvatar to better reflect its expanded functionality
 */
export function UserMenu({ 
  user, 
  size = 'medium',
  showStatus = true,
  showMenu = false,
  showProfile = false,
  onClick,
  onStatusChange,
  isUpdatingStatus = false,
  onLogout
}: UserMenuProps) {
  // Utiliser useUserStatus pour obtenir le statut actuel de l'utilisateur
  const currentStatus = user?.id ? useUserStatus(user.id) as UserStatus : undefined;
  // State for menu and profile
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Import getUserInitials directement depuis utils/formatters

  // Menu handlers
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (showMenu) {
      setMenuAnchor(event.currentTarget);
    } else if (onClick) {
      onClick(event);
    }
  };
  
  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  // Profile handlers
  const handleOpenProfile = () => {
    setProfileOpen(true);
    handleCloseMenu();
  };
  
  const handleCloseProfile = () => {
    setProfileOpen(false);
  };
  
  // Status change handler
  const handleStatusChange = async (newStatus: UserStatus) => {
    if (onStatusChange) {
      try {
        // Update status in backend
        await onStatusChange(newStatus);
        
        // Force a component re-render to refresh UI
        // This relies on parent component to re-render on status change
        
        // Close the menu after changing status
        handleCloseMenu();
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
  };
  
  // Logout handler
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      handleCloseMenu();
    }
  };
  
  // Get display name
  const displayName = user ? 
    `${user.first_name} ${user.last_name}`.trim() || user.username || 'User' 
    : 'User';
  console.debug("UserMenu");
  return (
    <>
      {/* Use the UserAvatar without status */}
      <Box sx={{ position: 'relative' }}>
        <UserAvatar
          user={user}
          size={size}
          onClick={handleOpenMenu}
          showTooltip={currentStatus ? true : false}
          showStatus={false}
        />
        
        {/* Add StatusIndicator separately if showStatus is true */}
        {showStatus && user?.id && (
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: '-6px', 
              right: '-6px',
              zIndex: 2,
              display: 'flex',
              bgcolor: 'background.paper',
              borderRadius: '50%',
              padding: '1px'
            }}
          >
            <StatusIndicator 
              userId={user.id}
              size={size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'}
              variant="icon"
              showTooltip={false}
            />
          </Box>
        )}
      </Box>
      
      {/* Menu component (conditionally rendered) */}
      {showMenu && (
        <Menu
          anchorEl={menuAnchor}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          keepMounted
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={Boolean(menuAnchor)}
          onClose={handleCloseMenu}
        >
          {/* User info */}
          <Box sx={{ py: 1, px: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'User'}
            </Typography>
            {user?.username && (
              <Typography variant="body2" color="text.secondary">
                @{user.username}
              </Typography>
            )}
          </Box>
          <Divider />
          
          {/* Status options */}
          {onStatusChange && (
            <>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>
                SET STATUS
              </Typography>
              {STATUS_OPTIONS.map(option => (
                <MenuItem 
                  key={option.value} 
                  onClick={() => handleStatusChange(option.value as UserStatus)}
                  selected={currentStatus === option.value}
                  disabled={isUpdatingStatus}
                  sx={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Box display="flex" alignItems="center">
                    <ListItemIcon sx={{ color: option.color }}>
                      {isUpdatingStatus && currentStatus === option.value ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        // Toujours utiliser UserStatusBadge pour chaque option avec son propre statut
                        <UserStatusBadge 
                          status={option.value as UserStatus} 
                          variant="icon" 
                          showTooltip={false}
                        />
                      )}
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
            </>
          )}
          
          {/* Profile and logout */}
          {showProfile && (
            <MenuItem onClick={handleOpenProfile}>
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
      )}
      
      {/* Profile dialog (conditionally rendered) */}
      {showProfile && profileOpen && user && (
        <UserProfile
          userId={user.id}
          editable={true}
          onClose={handleCloseProfile}
        />
      )}
    </>
  );
}

export default UserMenu;