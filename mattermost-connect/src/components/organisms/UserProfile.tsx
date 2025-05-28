import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  TextField,
  Divider,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  PhotoCamera as PhotoCameraIcon,
  Verified as VerifiedIcon,
  Email as EmailIcon,
  AccountCircle as AccountCircleIcon,
  Work as WorkIcon,
  Language as LanguageIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { UserAvatar } from '../atoms/UserAvatar';
import { StatusBadge } from '../atoms/StatusBadge';
import { useUserStatus } from '../../hooks/useUserStatus';
import { displayUsername } from '../../utils/userUtils';
import { STATUS_OPTIONS } from '../../utils/statusUtils';
import { setUser } from '../../store/slices/entitiesSlice';
import { Client4 } from 'mattermost-redux/client';
import type { UserProfile as UserProfileType, UserStatus } from '../../api/types';
import type { RootState } from '../../store';

export interface UserProfileProps {
  user: UserProfileType;
  editable?: boolean;
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  editable = false,
  onClose,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.entities.users.currentUserId);
  const isCurrentUser = user.id === currentUser;
  
  // User status
  const { status, updateStatus } = useUserStatus();
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    nickname: user.nickname || '',
    position: user.position || '',
    email: user.email || '',
  });
  
  // Status change
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // File upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEditClick = useCallback(() => {
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      nickname: user.nickname || '',
      position: user.position || '',
      email: user.email || '',
    });
    setIsEditing(true);
  }, [user]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      nickname: user.nickname || '',
      position: user.position || '',
      email: user.email || '',
    });
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      // Update server
      const updatedUser = await Client4.patchUser({ id: user.id, ...formData });
      
      // Update Redux store with server response
      dispatch(setUser(updatedUser));
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }, [dispatch, user, formData]);

  const handleStatusClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setStatusAnchor(event.currentTarget);
  }, []);

  const handleStatusClose = useCallback(() => {
    setStatusAnchor(null);
  }, []);

  const handleStatusChange = useCallback(async (newStatus: UserStatus['status']) => {
    setIsUpdatingStatus(true);
    try {
      await updateStatus(newStatus);
      handleStatusClose();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [updateStatus, handleStatusClose]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }
    
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setIsUploadingImage(true);
    
    try {
      await Client4.uploadProfileImage(user.id, file);
      
      // Force refresh of profile image by updating user with timestamp
      const updatedUser = { ...user, last_picture_update: Date.now() };
      dispatch(setUser(updatedUser));
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      alert('Failed to upload profile image');
    } finally {
      setIsUploadingImage(false);
    }
  }, [user]);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleStatusSelect = (e: React.MouseEvent<HTMLLIElement>) => {
    const status = e.currentTarget.dataset.status as UserStatus['status'];
    if (status) {
      handleStatusChange(status);
    }
  };

  const profileContent = (
    <Box sx={{ p: 3 }}>
      {/* Header with avatar and basic info */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            isCurrentUser && editable ? (
              <Tooltip title="Change profile picture">
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                  onClick={handleCameraClick}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <CircularProgress size={16} />
                  ) : (
                    <PhotoCameraIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : null
          }
        >
          <UserAvatar user={user} size="large" showStatus />
          
          {/* Hidden file input for profile picture upload */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </Badge>
        
        <Box sx={{ ml: 3 }}>
          {isEditing ? (
            <Box sx={{ mb: 2 }}>
              <TextField
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                variant="outlined"
                size="small"
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                variant="outlined"
                size="small"
                fullWidth
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="h5">
                {displayUsername(user, 'full_name', true)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                @{user.username}
                {user.nickname && ` (${user.nickname})`}
              </Typography>
              
              {isCurrentUser && editable && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                  sx={{ mt: 1 }}
                >
                  Edit Profile
                </Button>
              )}
            </Box>
          )}
          
          {/* Status indicator for current user */}
          {isCurrentUser && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <StatusBadge status={status} />
              <Typography 
                variant="body2" 
                onClick={handleStatusClick}
                sx={{ cursor: 'pointer', ml: 1 }}
              >
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Set status'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Profile details */}
      <Box>
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
              }}
              disabled // Usually email is managed by admin
            />
            
            <TextField
              label="Nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <AccountCircleIcon color="action" sx={{ mr: 1 }} />
              }}
            />
            
            <TextField
              label="Position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <WorkIcon color="action" sx={{ mr: 1 }} />
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button 
                variant="outlined" 
                color="inherit"
                startIcon={<CloseIcon />}
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon color="action" sx={{ mr: 2 }} />
              <Typography>{user.email}</Typography>
            </Box>
            
            {user.position && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon color="action" sx={{ mr: 2 }} />
                <Typography>{user.position}</Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LanguageIcon color="action" sx={{ mr: 2 }} />
              <Typography>{user.locale || 'English (US)'}</Typography>
            </Box>
            
            {user.is_bot && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <VerifiedIcon color="primary" sx={{ mr: 2 }} />
                <Typography>Bot Account</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );

  // Status selection menu
  const statusMenu = (
    <Menu
      anchorEl={statusAnchor}
      open={Boolean(statusAnchor)}
      onClose={handleStatusClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      {STATUS_OPTIONS.map((option) => (
        <MenuItem
          key={option.value}
          data-status={option.value}
          onClick={handleStatusSelect}
          selected={status === option.value}
          disabled={isUpdatingStatus}
        >
          <ListItemIcon sx={{ color: option.color }}>
            {isUpdatingStatus && status === option.value ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <StatusBadge status={option.value} />
            )}
          </ListItemIcon>
          <ListItemText>{option.label}</ListItemText>
          {status === option.value && (
            <CheckIcon
              fontSize="small"
              sx={{ color: option.color, ml: 1 }}
            />
          )}
        </MenuItem>
      ))}
    </Menu>
  );

  if (onClose) {
    return (
      <>
        <Dialog 
          open={true} 
          onClose={onClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">User Profile</Typography>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {profileContent}
          </DialogContent>
        </Dialog>
        {statusMenu}
      </>
    );
  }

  return (
    <>
      {profileContent}
      {statusMenu}
    </>
  );
};

export default UserProfile;