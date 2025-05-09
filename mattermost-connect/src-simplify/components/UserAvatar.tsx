import React, { useState } from 'react';
import { Avatar, Box, Badge, styled, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Divider, CircularProgress, Dialog } from '@mui/material';
import { User, UserStatus } from '../api/types';
import { getUserInitials } from '../utils/formatters';
import { api } from '../api/client';
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

// Status options config
export const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4caf50', icon: <CheckCircleIcon /> },
  { value: 'away', label: 'Away', color: '#ff9800', icon: <AccessTimeIcon /> },
  { value: 'dnd', label: 'Do Not Disturb', color: '#f44336', icon: <DoNotDisturbIcon /> },
  { value: 'offline', label: 'Offline', color: '#9e9e9e', icon: <OfflinePinIcon /> }
];

interface UserAvatarProps {
  user?: User | null;
  status?: UserStatus;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  showMenu?: boolean;
  showProfile?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onStatusChange?: (status: UserStatus) => Promise<void>;
  isUpdatingStatus?: boolean;
  onLogout?: () => void;
}

// Custom styled Badge for status indicator
const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    borderRadius: '50%',
    width: 12,
    height: 12,
    right: 2,
    bottom: 2,
  },
}));

/**
 * Unified Avatar component that displays a user's profile picture,
 * with optional status indicator, menu and profile dialog
 */
export function UserAvatar({ 
  user, 
  status, 
  size = 'medium',
  showStatus = true,
  showMenu = false,
  showProfile = false,
  onClick,
  onStatusChange,
  isUpdatingStatus = false,
  onLogout
}: UserAvatarProps) {
  // State for menu and profile
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Get avatar size based on the size prop
  const avatarSize = {
    small: 28,
    medium: 40,
    large: 56
  }[size];
  
  // Get status color
  const statusColor = STATUS_OPTIONS.find(opt => opt.value === status)?.color || '#9e9e9e';
  
  // Generate a color based on username
  const generateColor = (username?: string): string => {
    if (!username) return '#909090';
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    
    return color;
  };
  
  // Get display name
  const displayName = user ? 
    `${user.first_name} ${user.last_name}`.trim() || user.username || 'User' 
    : 'User';
  
  // Generate the complete profile picture URL
  const getProfileImageUrl = (userId?: string) => {
    if (!userId) return undefined;
    
    try {
      // Get base URL from the api client directly
      const baseUrl = api.getBaseUrl();
      
      // Current timestamp for cache busting
      const timestamp = new Date().getTime();
      
      // Get token for authentication
      const token = localStorage.getItem('mattermost_token');
      
      // Check if we need to use a browser cache-busting technique
      const cacheBuster = `?_=${timestamp}`;
      
      // Create the URL with proper authentication
      const url = `${baseUrl}/api/v4/users/${userId}/image${cacheBuster}${token ? `&token=${token}` : ''}`;
      
      return url;
    } catch (error) {
      console.error("Error generating profile image URL:", error);
      // Fallback to a basic URL
      return `/api/v4/users/${userId}/image`;
    }
  };

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
        await onStatusChange(newStatus);
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
  
  // Create the avatar with the proper image URL
  const avatarElement = (
    <Avatar 
      alt={displayName}
      src={user?.id ? getProfileImageUrl(user.id) : undefined}
      sx={{ 
        width: avatarSize, 
        height: avatarSize,
        bgcolor: generateColor(user?.username),
        cursor: (onClick || showMenu) ? 'pointer' : 'default'
      }}
      onClick={handleOpenMenu}
    >
      {getUserInitials(user)}
    </Avatar>
  );
  
  // If no status is needed, return just the avatar
  if (!showStatus) {
    return (
      <>
        {avatarElement}
        
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
                    selected={status === option.value}
                    disabled={isUpdatingStatus}
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Box display="flex" alignItems="center">
                      <ListItemIcon sx={{ color: option.color }}>
                        {isUpdatingStatus && status === option.value ? 
                          <CircularProgress size={20} color="inherit" /> : 
                          option.icon
                        }
                      </ListItemIcon>
                      <ListItemText>{option.label}</ListItemText>
                    </Box>
                    {status === option.value && (
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
  
  // With status badge
  return (
    <>
      <Tooltip title={status ? `Status: ${status}` : ''}>
        <StyledBadge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={<Box sx={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '50%',
            bgcolor: statusColor
          }} />}
        >
          {avatarElement}
        </StyledBadge>
      </Tooltip>
      
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
                  selected={status === option.value}
                  disabled={isUpdatingStatus}
                  sx={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Box display="flex" alignItems="center">
                    <ListItemIcon sx={{ color: option.color }}>
                      {isUpdatingStatus && status === option.value ? 
                        <CircularProgress size={20} color="inherit" /> : 
                        option.icon
                      }
                    </ListItemIcon>
                    <ListItemText>{option.label}</ListItemText>
                  </Box>
                  {status === option.value && (
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

export default UserAvatar;