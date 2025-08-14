/**
 * Team settings dialog for editing team information and uploading icons
 * Provides form validation, permission checks, and real-time updates
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Avatar,
  Alert,
  CircularProgress,
  TextField,
  Divider,
  Fab,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useLayout, useTeamCreation } from '../../hooks';
import { handleError } from '../../services/errorService';
import { canManageTeam } from '../../services/permissionService';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeamById } from '../../store/selectors';
import { updateTeam } from '../../store/slices/entitiesSlice';
import { client } from '../../api/client';
import { getTeamInitials, getTeamColor, getTeamIconUrl } from '../../utils/teamUtils';
import type { Team } from '../../api/types';

export interface TeamSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string | null;
}

export const TeamSettingsDialog: React.FC<TeamSettingsDialogProps> = ({
  open,
  onClose,
  teamId,
}) => {
  const { isMobile } = useLayout();
  const { uploadTeamIcon } = useTeamCreation();
  const dispatch = useAppDispatch();
  
  // Get fresh team from store using memoized selector
  const team = useAppSelector(selectTeamById(teamId));
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    description: '',
    allow_open_invite: false,
  });

  const canManageSettings = canManageTeam(team?.id);

  // Initialize form when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        display_name: team.display_name || '',
        description: team.description || '',
        allow_open_invite: team.allow_open_invite || false,
      });
    }
  }, [team]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    onClose();
  }, [onClose]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  }, []);

  const handleEditClick = useCallback(() => {
    if (team) {
      setFormData({
        display_name: team.display_name || '',
        description: team.description || '',
        allow_open_invite: team.allow_open_invite || false,
      });
      setIsEditing(true);
    }
  }, [team]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    if (team) {
      setFormData({
        display_name: team.display_name || '',
        description: team.description || '',
        allow_open_invite: team.allow_open_invite || false,
      });
    }
  }, [team]);

  const handleSave = useCallback(async () => {
    if (!team) return;

    try {
      // Update team via API
      const updatedTeam = await client.patchTeam({
        id: team.id,
        display_name: formData.display_name.trim(),
        description: formData.description.trim(),
        allow_open_invite: formData.allow_open_invite,
      });

      // Update store
      dispatch(updateTeam(updatedTeam));
      setIsEditing(false);
    } catch (error) {
      handleError(error, {
        component: 'TeamSettingsDialog',
        action: 'saveTeam',
        showToast: true
      });
    }
  }, [team, formData, dispatch, handleError]);

  // Handle icon file selection and upload directly
  const handleIconSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !team) return;

    setIsUploadingIcon(true);
    try {
      await uploadTeamIcon(team.id, file);
    } catch (error) {
      handleError(error, {
        component: 'TeamSettingsDialog',
        action: 'uploadIcon',
        showToast: true
      });
    } finally {
      setIsUploadingIcon(false);
    }
  }, [uploadTeamIcon, team?.id, handleError]);

  // Const functions outside render for better memory management
  const handleAvatarClick = () => {
    if (canManageSettings) {
      fileInputRef.current?.click();
    }
  };

  const renderDialog = () => {
    if (!team) return null;
    
    return (
      <>
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <Typography 
            component="span"
            variant={isMobile ? "h6" : "h5"} 
            fontWeight={600}
            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            Team Settings
          </Typography>
          <IconButton 
            onClick={handleClose}
            size={isMobile ? "medium" : "small"}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { 
                bgcolor: 'action.hover'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              General Information
            </Typography>
            
            {/* Team info with avatar and camera icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={getTeamIconUrl(team) || undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: getTeamColor(team.name),
                    fontSize: '32px',
                    fontWeight: 600,
                    cursor: canManageSettings ? 'pointer' : 'default',
                  }}
                  onClick={handleAvatarClick}
                >
                  {getTeamInitials(team)}
                </Avatar>
                
                {/* Camera icon overlay */}
                {canManageSettings && (
                  <Fab
                    size="small"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      width: 32,
                      height: 32,
                      minHeight: 32,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }}
                    onClick={handleAvatarClick}
                    disabled={isUploadingIcon}
                  >
                    {isUploadingIcon ? (
                      <CircularProgress size={16} />
                    ) : (
                      <PhotoCameraIcon sx={{ fontSize: 16 }} />
                    )}
                  </Fab>
                )}
              </Box>
              
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {team.display_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {team.name}
                </Typography>
                {team.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {team.description}
                  </Typography>
                )}
              </Box>
            </Box>

            {!canManageSettings && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You don't have permission to change team settings.
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Team details form */}
            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Team Details
              </Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  label="Team Name"
                  name="display_name"
                  value={isEditing ? formData.display_name : team.display_name}
                  onChange={handleChange}
                  disabled={!canManageSettings || !isEditing}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Team URL"
                  value={team.name}
                  disabled
                  fullWidth
                  size="small"
                  helperText="Team URL cannot be changed"
                />
                <TextField
                  label="Description"
                  name="description"
                  value={isEditing ? formData.description : (team.description || '')}
                  onChange={handleChange}
                  disabled={!canManageSettings || !isEditing}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />
                
                {canManageSettings && (
                  <FormControlLabel
                    control={
                      <Switch
                        name="allow_open_invite"
                        checked={isEditing ? formData.allow_open_invite : team.allow_open_invite}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    }
                    label="Allow anyone to join this team"
                  />
                )}
              </Box>
            </Box>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/bmp"
              onChange={handleIconSelect}
              style={{ display: 'none' }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}>
          {canManageSettings && (
            <>
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    startIcon={<SaveIcon />}
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={handleCancelEdit} 
                    variant="outlined"
                    startIcon={<CancelIcon />}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleEditClick} 
                  variant="contained"
                  startIcon={<EditIcon />}
                >
                  Edit
                </Button>
              )}
            </>
          )}
          <Button onClick={handleClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
        }
      }}
    >
      {renderDialog()}
    </Dialog>
  );
};

export default TeamSettingsDialog;