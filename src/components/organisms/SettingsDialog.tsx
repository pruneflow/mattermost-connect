/**
 * Settings dialog with notifications and display preferences
 * Provides tabbed interface for user preference management with real-time updates
 */
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Tab,
  Tabs,
  Paper,
  Switch,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import useUserPreferences from '../../hooks/useUserPreferences';
import { useLayout } from '../../hooks';
import { SettingsDialogSkeleton } from '../atoms/SkeletonLoader';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
  </div>
);

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { isMobile } = useLayout();
  const [activeTab, setActiveTab] = useState(0);
  const [newMentionKey, setNewMentionKey] = useState('');

  const {
    // Current values
    theme: currentTheme,
    language: currentLanguage,
    desktopNotifications,
    soundNotifications,
    emailFrequency,
    mentionKeys,
    
    // State
    isUpdating,
    
    // Actions
    updateTheme,
    updateLanguage,
    updateDesktopNotifications,
    updateSoundNotifications,
    updateEmailNotifications,
    updateMentionKeys,
  } = useUserPreferences();

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleThemeChange = useCallback((event: SelectChangeEvent<string>) => {
    updateTheme(event.target.value as 'light' | 'dark' | 'auto');
  }, [updateTheme]);

  const handleLanguageChange = useCallback((event: SelectChangeEvent<string>) => {
    updateLanguage(event.target.value);
  }, [updateLanguage]);

  const handleEmailFrequencyChange = useCallback((event: SelectChangeEvent<string>) => {
    updateEmailNotifications(event.target.value as 'never' | 'immediate' | 'hourly');
  }, [updateEmailNotifications]);

  const handleAddMentionKey = useCallback(() => {
    if (newMentionKey.trim() && !mentionKeys.includes(newMentionKey.trim())) {
      updateMentionKeys([...mentionKeys, newMentionKey.trim()]);
      setNewMentionKey('');
    }
  }, [newMentionKey, mentionKeys, updateMentionKeys]);

  const handleRemoveMentionKey = useCallback((keyToRemove: string) => {
    updateMentionKeys(mentionKeys.filter((key: string) => key !== keyToRemove));
  }, [mentionKeys, updateMentionKeys]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddMentionKey();
    }
  }, [handleAddMentionKey]);

  const tabs = [
    { label: 'Notifications', icon: <NotificationsIcon /> },
    { label: 'Display', icon: <PaletteIcon /> },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          minHeight: { xs: 56, sm: 'auto' }, // Touch target mobile
        }}
      >
        <Typography
          fontWeight={600}
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          Settings
        </Typography>
        <IconButton 
          onClick={onClose}
          size={isMobile ? "medium" : "small"}
          sx={{ 
            color: 'text.secondary',
            minWidth: { xs: 44, sm: 'auto' }, // Touch target mobile
            minHeight: { xs: 44, sm: 'auto' },
            '&:hover': { 
              backgroundColor: alpha(theme.palette.text.primary, 0.04) 
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        sx={{ 
          p: 0, 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          height: isMobile ? 'auto' : 500,
          overflow: 'hidden',
        }}
      >
        {/* Responsive Tabs */}
        <Box
          sx={{
            width: { xs: '100%', md: 200 },
            borderRight: { xs: 'none', md: 1 },
            borderBottom: { xs: 1, md: 'none' },
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Tabs
            orientation={isMobile ? 'horizontal' : 'vertical'}
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'fullWidth' : 'scrollable'}
            scrollButtons={false}
            sx={{
              minHeight: { xs: 48, md: 'auto' },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
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
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          minHeight: 0,
        }}>
          {/* Notifications Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ 
              p: { xs: 2, md: 3 }, 
              maxWidth: { xs: '100%', md: 600 } 
            }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Control how and when you receive notifications
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.6),
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Desktop & Mobile
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={desktopNotifications}
                      onChange={(e) => updateDesktopNotifications(e.target.checked)}
                      disabled={isUpdating}
                    />
                  }
                  label="Desktop notifications"
                  sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', ml: 0 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={soundNotifications}
                      onChange={(e) => updateSoundNotifications(e.target.checked)}
                      disabled={isUpdating}
                    />
                  }
                  label="Notification sounds"
                  sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', ml: 0 }}
                />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Email notifications
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={emailFrequency}
                      onChange={handleEmailFrequencyChange}
                      disabled={isUpdating}
                    >
                      <MenuItem value="never">Never</MenuItem>
                      <MenuItem value="immediate">Immediately</MenuItem>
                      <MenuItem value="hourly">Hourly</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.6),
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Keywords
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Get notified when these words are mentioned
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add keyword..."
                    value={newMentionKey}
                    onChange={(e) => setNewMentionKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isUpdating}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton 
                            size="small" 
                            onClick={handleAddMentionKey}
                            disabled={!newMentionKey.trim() || isUpdating}
                          >
                            <AddIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {mentionKeys.map((key: string) => (
                    <Chip
                      key={key}
                      label={key}
                      onDelete={() => handleRemoveMentionKey(key)}
                      deleteIcon={<DeleteIcon />}
                      size="small"
                      variant="outlined"
                      disabled={isUpdating}
                    />
                  ))}
                  {mentionKeys.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No keywords added yet
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Box>
          </TabPanel>

          {/* Display Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ 
              p: { xs: 2, md: 3 }, 
              maxWidth: { xs: '100%', md: 600 } 
            }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Display
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Customize the appearance of your Mattermost experience
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.6),
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Theme
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Color scheme
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={currentTheme}
                      onChange={handleThemeChange}
                      disabled={isUpdating}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto (system)</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Auto mode follows your system preferences
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Language
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={currentLanguage}
                      onChange={handleLanguageChange}
                      disabled={isUpdating}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="fr">French</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="de">Deutsch</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Paper>

              {isUpdating && (
                <Alert
                  icon={<CircularProgress size={16} />}
                  severity="info"
                  sx={{ borderRadius: 2 }}
                >
                  Saving preferences...
                </Alert>
              )}
            </Box>
          </TabPanel>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;