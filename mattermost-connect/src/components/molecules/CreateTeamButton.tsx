/**
 * Create team button component with multiple layout variants
 * Supports vertical list, horizontal tabs, and compact sidebar displays
 */
import React from 'react';
import { 
  Box, 
  Avatar, 
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export interface CreateTeamButtonProps {
  layout: 'vertical' | 'horizontal' | 'tabs';
  onClick?: () => void;
  compact?: boolean; // For icon-only display in sidebar
  className?: string;
  sx?: any;
}

export const CreateTeamButton: React.FC<CreateTeamButtonProps> = ({
  layout,
  onClick,
  compact = false,
  className,
  sx
}) => {
  // Tabs layout (header tabs)
  if (layout === 'tabs') {
    return (
      <Box
        className={className}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          color: 'common.white',
          cursor: 'pointer',
          fontSize: { xs: '0.875rem', sm: '1rem' },
          '&:hover': {
            bgcolor: 'action.hover',
          },
          ...sx
        }}
        onClick={onClick}
      >
        <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
        Add Team
      </Box>
    );
  }

  // Horizontal layout (avatar based)
  if (layout === 'horizontal') {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', m: 0.5, ...sx }}>
        <Avatar
          sx={{
            bgcolor: 'action.selected',
            cursor: 'pointer',
          }}
          onClick={onClick}
        >
          <AddIcon />
        </Avatar>
      </Box>
    );
  }

  // Vertical layout (list based or icon-only for sidebar)
  if (layout === 'vertical' && compact) {
    // Icon-only mode for sidebar
    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 1,
          ...sx
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'action.selected',
            cursor: 'pointer',
            width: 48,
            height: 48,
          }}
          onClick={onClick}
        >
          <AddIcon />
        </Avatar>
      </Box>
    );
  }

  // Vertical layout (full list based)
  return (
    <ListItem
      className={className}
      sx={sx}
      disablePadding
    >
      <ListItemButton onClick={onClick}>
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'action.selected' }}>
            <AddIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Create New Team" />
      </ListItemButton>
    </ListItem>
  );
};

export default CreateTeamButton;