import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button, 
  IconButton,
  TextField,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge
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
  Language as LanguageIcon
} from '@mui/icons-material';
import { useUser } from '../../hooks/useUsers';
import { useAuth } from '../../context/AuthContext';
import { User, UserStatus } from '../../api/types';
import { api } from '../../api/client';
import { UserAvatar } from '../common/UserAvatar';

// Status options with colors
const statusOptions = [
  { value: 'online', label: 'Online', color: '#4caf50' },
  { value: 'away', label: 'Away', color: '#ff9800' },
  { value: 'dnd', label: 'Do Not Disturb', color: '#f44336' },
  { value: 'offline', label: 'Offline', color: '#9e9e9e' }
];

interface UserProfileProps {
  userId?: string; // If not provided, show current user's profile
  editable?: boolean; // Allow editing if true
  onClose?: () => void; // Close callback for modal view
}

export function UserProfile({ userId, editable = false, onClose }: UserProfileProps) {
  // Get current user if userId is not provided
  const { user: currentUser, updateUser: updateCurrentUser } = useAuth();
  const currentUserId = currentUser?.id;
  
  // Use the provided userId, or fall back to current user
  const profileUserId = userId || currentUserId;
  const isCurrentUser = profileUserId === currentUserId;
  
  // Get user data
  const { user, status, isLoading, error, updateUser, updateStatus, refetch } = useUser(profileUserId || '');
  
  // Type-safe user access
  const typedUser = (user && typeof user === 'object' && 'id' in user) ? user as User : null;
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  
  // Status change
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  // File upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Start editing
  const handleEditClick = () => {
    if (typedUser) {
      setFormData({
        first_name: typedUser.first_name,
        last_name: typedUser.last_name,
        nickname: typedUser.nickname,
        position: typedUser.position,
        email: typedUser.email
      });
      setIsEditing(true);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({});
  };
  
  // Save changes
  const handleSaveProfile = async () => {
    if (!typedUser) return;
    
    try {
      // Choose the right update function based on whether this is current user
      let updatedUser;
      if (isCurrentUser && updateCurrentUser) {
        updatedUser = await updateCurrentUser(formData);
      } else if (updateUser) {
        updatedUser = await updateUser(formData);
      }
      
      // Reset edit state
      setIsEditing(false);
      setFormData({});
      
      // Force refetch user to get the latest data
      if (typedUser) {
        await refetch();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };
  
  // Update status
  const handleStatusChange = async (newStatus: string) => {
    if (updateStatus && isCurrentUser) {
      try {
        await updateStatus(newStatus as UserStatus);
        setShowStatusMenu(false);
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
  };
  
  // Handle profile image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !typedUser) {
      return;
    }
    
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setIsUploadingImage(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      
      // Get authentication token - from localStorage
      const token = localStorage.getItem('mattermost_token');
      
      // Get the base URL from api
      const apiBaseUrl = api.getBaseUrl();
      const url = `${apiBaseUrl}/api/v4/users/${typedUser.id}/image`;
      
      // Use fetch directly to properly handle multipart/form-data
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set 'Content-Type' here - the browser will set it automatically with the boundary parameter
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
      }
      
      // Force refetch to update the UI with the new image
      await refetch();
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      alert('Failed to upload profile image');
    } finally {
      setIsUploadingImage(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!typedUser) return '?';
    
    const firstName = typedUser.first_name || '';
    const lastName = typedUser.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`;
    }
    
    if (firstName) {
      return firstName[0];
    }
    
    if (typedUser.username) {
      return typedUser.username[0].toUpperCase();
    }
    
    return '?';
  };
  
  // Generate avatar color from username
  const getAvatarColor = (): string => {
    if (!typedUser?.username) return '#1976d2';
    
    let hash = 0;
    for (let i = 0; i < typedUser.username.length; i++) {
      hash = typedUser.username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    
    return color;
  };
  
  // Get current status color
  const getStatusColor = (): string => {
    if (!status) return '#9e9e9e';
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || '#9e9e9e';
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (error || !typedUser) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">
          {error ? `Error: ${error.message}` : 'User not found'}
        </Typography>
      </Box>
    );
  }
  
  // Profile view
  const profileContent = (
    <Box sx={{ p: 3 }}>
      {/* Header with avatar and basic info */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            isCurrentUser ? (
              <Tooltip title="Change profile picture">
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                  onClick={() => fileInputRef.current?.click()}
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
          {/* Use the new centralized UserAvatar component with custom styling */}
          <Box sx={{ 
            width: 100, 
            height: 100, 
            border: '3px solid',
            borderColor: getStatusColor(),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <UserAvatar 
              user={typedUser}
              size={94}
              showStatus={false}
              showTooltip={false}
            />
          </Box>
          
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
                value={formData.first_name || ''}
                onChange={handleChange}
                variant="outlined"
                size="small"
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="Last Name"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleChange}
                variant="outlined"
                size="small"
                fullWidth
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="h5">
                {`${typedUser.first_name} ${typedUser.last_name}`.trim() || typedUser.username}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                @{typedUser.username}
                {typedUser.nickname && ` (${typedUser.nickname})`}
              </Typography>
              
              {isCurrentUser && (
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
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: getStatusColor(),
                  mr: 1
                }}
              />
              <Typography 
                variant="body2" 
                onClick={() => setShowStatusMenu(true)}
                sx={{ cursor: 'pointer' }}
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
              value={formData.email || ''}
              onChange={handleChange}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
              }}
            />
            
            <TextField
              label="Nickname"
              name="nickname"
              value={formData.nickname || ''}
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
              value={formData.position || ''}
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
              <Typography>{typedUser.email}</Typography>
            </Box>
            
            {typedUser.position && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon color="action" sx={{ mr: 2 }} />
                <Typography>{typedUser.position}</Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LanguageIcon color="action" sx={{ mr: 2 }} />
              <Typography>{typedUser.locale || 'English (US)'}</Typography>
            </Box>
            
            {typedUser.is_bot && (
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
  
  // Status selection dialog
  const statusDialog = (
    <Dialog open={showStatusMenu} onClose={() => setShowStatusMenu(false)}>
      <DialogTitle>Set Status</DialogTitle>
      <DialogContent>
        <Box sx={{ width: 250 }}>
          {statusOptions.map(option => (
            <Button
              key={option.value}
              fullWidth
              sx={{ 
                justifyContent: 'flex-start', 
                textAlign: 'left',
                py: 1.5,
                mb: 0.5
              }}
              onClick={() => handleStatusChange(option.value)}
              startIcon={
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: option.color
                  }}
                />
              }
            >
              {option.label}
            </Button>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
  
  // If onClose is provided, render in modal form, otherwise inline
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
        {statusDialog}
      </>
    );
  }
  
  // Inline display
  return (
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {profileContent}
      {statusDialog}
    </Paper>
  );
}

export default UserProfile;