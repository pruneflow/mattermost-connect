import React, { useState, useRef, useCallback } from 'react';
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
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useErrorHandler, useLayout, useTeamCreation, usePermissions } from '../../hooks';
import { getTeamInitials, getTeamColor, getTeamIconUrl } from '../../utils/teamUtils';
import type { Team } from '../../api/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export interface TeamSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}

export const TeamSettingsDialog: React.FC<TeamSettingsDialogProps> = ({
  open,
  onClose,
  team,
}) => {
  // Ne pas render si pas de team
  if (!team) {
    return null;
  }
  const { isMobile } = useLayout();
  const { handleError } = useErrorHandler();
  const { uploadTeamIcon } = useTeamCreation();
  const { canManageTeam } = usePermissions();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const canManageSettings = canManageTeam(team.id);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedIcon(null);
    setIconPreview('');
    setActiveTab(0);
    onClose();
  }, [onClose]);

  // Handle icon file selection (no validation here - handled in uploadTeamIcon)
  const handleIconSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedIcon(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setIconPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Upload team icon (validation handled in hook)
  const handleUploadIcon = useCallback(async () => {
    if (!selectedIcon) return;

    setIsUploadingIcon(true);
    try {
      await uploadTeamIcon(team.id, selectedIcon);
      setSelectedIcon(null);
      setIconPreview('');
    } catch (error) {
      handleError(error, {
        component: 'TeamSettingsDialog',
        action: 'uploadIcon',
        showToast: true
      });
    } finally {
      setIsUploadingIcon(false);
    }
  }, [selectedIcon, uploadTeamIcon, team.id, handleError]);

  // Const functions outside render for better memory management
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancelIconSelection = () => {
    setSelectedIcon(null);
    setIconPreview('');
  };

  const tabs = [
    { label: 'General', id: 'general' },
    { label: 'Icon', id: 'icon' },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : 600,
          maxHeight: isMobile ? '100%' : '90vh',
        }
      }}
    >
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

      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Sidebar with tabs */}
        <Box
          sx={{
            width: { xs: '100%', md: 200 },
            borderRight: { xs: 'none', md: 1 },
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Tabs
            orientation={isMobile ? 'horizontal' : 'vertical'}
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'fullWidth' : 'scrollable'}
            sx={{
              minHeight: { xs: 48, md: 'auto' },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.id}
                label={tab.label}
                sx={{
                  minHeight: { xs: 48, md: 72 },
                  minWidth: { xs: 'auto', md: '100%' },
                  justifyContent: { xs: 'center', md: 'flex-start' },
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Content area */}
        <DialogContent sx={{ flex: 1, p: 0, overflow: 'auto' }}>
          {/* General Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                General Information
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar
                  src={getTeamIconUrl(team) || undefined}
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: getTeamColor(team.name),
                    fontSize: '24px',
                    fontWeight: 600,
                  }}
                >
                  {getTeamInitials(team)}
                </Avatar>
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

              <Divider sx={{ my: 3 }} />

              <Box>
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Team Details
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <TextField
                    label="Team Name"
                    value={team.display_name}
                    disabled={!canManageSettings}
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
                    value={team.description || ''}
                    disabled={!canManageSettings}
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
          </TabPanel>

          {/* Icon Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Team Icon
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload a custom icon for your team. Recommended size is 128x128 pixels.
              </Typography>

              {!canManageSettings && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  You don't have permission to change team settings.
                </Alert>
              )}

              {/* Current Icon */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Current Icon
                </Typography>
                <Avatar
                  src={getTeamIconUrl(team) || undefined}
                  sx={{
                    width: 128,
                    height: 128,
                    bgcolor: getTeamColor(team.name),
                    fontSize: '48px',
                    fontWeight: 600,
                    border: 2,
                    borderColor: 'divider',
                  }}
                >
                  {getTeamInitials(team)}
                </Avatar>
              </Box>

              {canManageSettings && (
                <>
                  <Divider sx={{ my: 3 }} />

                  {/* Upload New Icon */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                      Upload New Icon
                    </Typography>
                    
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                      onClick={handleFileInputClick}
                    >
                      {iconPreview ? (
                        <Box>
                          <Avatar
                            src={iconPreview}
                            sx={{
                              width: 128,
                              height: 128,
                              mx: 'auto',
                              mb: 2,
                              border: 2,
                              borderColor: 'divider',
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Click to change selected image
                          </Typography>
                        </Box>
                      ) : (
                        <Box>
                          <PhotoCameraIcon 
                            sx={{ 
                              fontSize: 48, 
                              color: 'text.secondary',
                              mb: 2,
                            }} 
                          />
                          <Typography variant="body1" gutterBottom>
                            Click to select an image
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            JPG, PNG, BMP formats • Maximum 10MB • Recommended 128x128px
                          </Typography>
                        </Box>
                      )}
                    </Paper>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/bmp"
                      onChange={handleIconSelect}
                      style={{ display: 'none' }}
                    />
                  </Box>

                  {selectedIcon && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        onClick={handleUploadIcon}
                        variant="contained"
                        disabled={isUploadingIcon}
                        startIcon={isUploadingIcon ? <CircularProgress size={16} /> : <UploadIcon />}
                      >
                        {isUploadingIcon ? 'Uploading...' : 'Upload Icon'}
                      </Button>
                      <Button
                        onClick={handleCancelIconSelection}
                        variant="outlined"
                        disabled={isUploadingIcon}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </TabPanel>
        </DialogContent>
      </Box>

      <DialogActions sx={{ 
        px: { xs: 2, sm: 3 }, 
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
      }}>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamSettingsDialog;