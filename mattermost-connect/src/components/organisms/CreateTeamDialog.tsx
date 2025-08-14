/**
 * Create team dialog with form validation and URL generation
 * Provides team creation form with auto-generated URL and validation following Mattermost rules
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAppSelector, useLayout } from '../../hooks';
import { handleError } from '../../services/errorService';
import { selectServerUrl } from '../../store/selectors';

export interface CreateTeamData {
  name: string;
  display_name: string;
  description?: string;
  type: 'O' | 'I'; // O = Open, I = Invite only
}

export interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateTeam: (teamData: CreateTeamData) => Promise<void>;
  loading?: boolean;
}

// Utility function to generate team URL from display name (following Mattermost rules)
const cleanUpUrlable = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove all non-alphanumeric except spaces and dashes
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .substring(0, 64); // Limit to 64 characters
};

export const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open,
  onClose,
  onCreateTeam,
  loading = false,
}) => {
  const { isMobile } = useLayout();
  const serverUrl = useAppSelector(selectServerUrl) || '';
  
  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    display_name: '',
    description: '',
    type: 'O',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUrlManuallyEdited, setIsUrlManuallyEdited] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Display name validation
    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Team name is required';
    } else if (formData.display_name.length < 2 || formData.display_name.length > 64) {
      newErrors.display_name = 'Team name must be 2-64 characters';
    }

    // URL name validation (following Mattermost rules exactly)
    if (!formData.name.trim()) {
      newErrors.name = 'Team URL is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = 'Use lowercase letters, numbers and dashes only';
    } else if (formData.name.length < 2 || formData.name.length > 64) {
      newErrors.name = 'Must be 2-64 characters';
    } else if (formData.name.startsWith('-') || formData.name.endsWith('-')) {
      newErrors.name = 'Cannot start or end with a dash';
    } else if (!/^[a-z]/.test(formData.name)) {
      newErrors.name = 'Must start with a letter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onCreateTeam(formData);
      handleClose();
    } catch (error) {
      handleError(error, {
        component: 'CreateTeamModal',
        action: 'createTeam',
        showToast: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        type: 'O',
      });
      setErrors({});
      setIsUrlManuallyEdited(false);
      onClose();
    }
  };

  const handleChange = (field: keyof CreateTeamData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    
    // Track if user manually edits the URL field
    if (field === 'name') {
      setIsUrlManuallyEdited(true);
    }
    
    setFormData(prev => ({ 
      ...prev, 
      [field]: value,
      // Auto-generate URL from display name only if URL hasn't been manually edited
      ...(field === 'display_name' && !isUrlManuallyEdited ? {
        name: cleanUpUrlable(value)
      } : {})
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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
          minHeight: '400px',
          width: { xs: '100%', sm: 'auto' },
          height: { xs: '100%', sm: 'auto' },
          m: { xs: 0, sm: 2 },
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: 1,
          borderColor: 'divider',
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
        }}
      >
        <Box sx={{ flex: 1, pr: 2 }}>
          <Typography variant={isMobile ? "h6" : "h5"} component="div" fontWeight={600}>
            Create a new team
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Teams are a digital workspace for you and your teammates to collaborate.
          </Typography>
        </Box>
        <IconButton 
          onClick={handleClose}
          size={isMobile ? "medium" : "small"}
          disabled={isSubmitting}
          sx={{ 
            color: 'text.secondary',
            minWidth: { xs: 44, sm: 'auto' },
            minHeight: { xs: 44, sm: 'auto' },
            '&:hover': { 
              bgcolor: 'action.hover'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ pt: 1 }}>
          <TextField
            label="Team Name"
            placeholder="Enter a name for your team"
            value={formData.display_name}
            onChange={handleChange('display_name')}
            error={!!errors.display_name}
            helperText={errors.display_name || 'This is the display name of your team (2-64 characters)'}
            fullWidth
            margin="normal"
            disabled={isSubmitting}
            autoFocus
          />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.primary" sx={{ mb: 1, fontWeight: 500 }}>
              Choose the web address of your new team:
            </Typography>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" component="div">
                <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
                  <li>Short and memorable is best</li>
                  <li>Use lowercase letters, numbers and dashes</li>
                  <li>Must start with a letter and can't end in a dash</li>
                </Box>
              </Typography>
            </Box>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                border: '1px solid', 
                borderColor: errors.name ? 'error.main' : 'divider', 
                borderRadius: 1, 
                overflow: 'hidden',
                flexDirection: { xs: 'column', sm: 'row' },
                minWidth: 0,
              }}
            >
              <Typography 
                color="text.secondary" 
                sx={{ 
                  px: 1.5, 
                  py: 1.75, 
                  backgroundColor: 'action.hover', 
                  borderRight: { xs: 'none', sm: '1px solid' },
                  borderBottom: { xs: '1px solid', sm: 'none' },
                  borderColor: 'divider',
                  fontSize: '14px',
                  width: { xs: '100%', sm: 'auto' },
                  textAlign: { xs: 'center', sm: 'left' },
                  wordBreak: 'break-all',
                }}
              >
                {serverUrl ? `${serverUrl}/` : 'https://your-server.com/'}
              </Typography>
              <TextField
                placeholder="team-url"
                value={formData.name}
                onChange={handleChange('name')}
                disabled={isSubmitting}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { 
                    px: 1.5, 
                    py: 0.5,
                    '& input': { fontSize: '14px' },
                    minWidth: 0,
                  }
                }}
                sx={{ flex: 1, minWidth: 0 }}
              />
            </Box>
            {errors.name && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {errors.name}
              </Typography>
            )}
          </Box>

          <TextField
            label="Description (optional)"
            placeholder="What's this team about?"
            value={formData.description}
            onChange={handleChange('description')}
            fullWidth
            margin="normal"
            multiline
            rows={2}
            disabled={isSubmitting}
            helperText="Help others understand what this team is for"
          />

          {(loading || isSubmitting) && (
            <Alert severity="info" sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Creating team...
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        px: { xs: 2, sm: 3 }, 
        pb: { xs: 2, sm: 3 },
        pt: 2,
        borderTop: 1,
        borderColor: 'divider',
        gap: 1,
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        '& > :not(style) + :not(style)': {
          ml: { xs: 0, sm: 1 },
        },
      }}>
        <Button 
          onClick={handleClose} 
          disabled={isSubmitting}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !formData.display_name.trim() || !formData.name.trim()}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
        >
          {isSubmitting ? 'Creating...' : 'Create Team'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTeamDialog;