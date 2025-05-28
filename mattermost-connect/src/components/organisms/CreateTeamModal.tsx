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
} from '@mui/material';
import { useErrorHandler, useAppSelector } from '../../hooks';

export interface CreateTeamData {
  name: string;
  display_name: string;
  description?: string;
  type: 'O' | 'I'; // O = Open, I = Invite only
}

export interface CreateTeamModalProps {
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

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  open,
  onClose,
  onCreateTeam,
  loading = false,
}) => {
  const { handleError } = useErrorHandler();
  const serverUrl = useAppSelector(state => state.auth.serverUrl) || '';
  
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
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Create a new team
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Teams are a digital workspace for you and your teammates to collaborate.
        </Typography>
      </DialogTitle>

      <DialogContent>
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
            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: errors.name ? 'error.main' : 'grey.300', borderRadius: 1, overflow: 'hidden' }}>
              <Typography 
                color="text.secondary" 
                sx={{ 
                  px: 1.5, 
                  py: 1.75, 
                  backgroundColor: 'grey.50', 
                  borderRight: '1px solid', 
                  borderColor: 'grey.300',
                  fontSize: '14px'
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
                    '& input': { fontSize: '14px' }
                  }
                }}
                sx={{ flex: 1 }}
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

      <DialogActions sx={{ px: 3, pb: 3 }}>
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

export default CreateTeamModal;