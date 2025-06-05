import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  SxProps,
  Theme,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import type { Team } from '../../api/types';

export interface TeamHeaderProps {
  team?: Team | null;
  compact?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * TeamHeader component for displaying team name and menu
 * Used in channel sidebar following Mattermost patterns
 */
export const TeamHeader: React.FC<TeamHeaderProps> = ({
  team,
  compact = false,
  sx,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  if (!team) {
    return (
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          ...sx,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No Team Selected
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: compact ? 1 : 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          minHeight: compact ? 48 : 56, // Ensure consistent height
          ...sx,
        }}
      >
        <Typography
          variant={compact ? 'subtitle1' : 'h6'}
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            mr: 1,
          }}
        >
          {team.display_name || team.name}
        </Typography>

        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label="team options"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Team Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleMenuClose}>Team Settings</MenuItem>
        <MenuItem onClick={handleMenuClose}>Manage Members</MenuItem>
        <MenuItem onClick={handleMenuClose}>View Team Info</MenuItem>
        <MenuItem onClick={handleMenuClose}>Leave Team</MenuItem>
      </Menu>
    </>
  );
};

export default TeamHeader;