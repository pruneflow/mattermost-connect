import React, { useState, useCallback } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  SxProps,
  Theme,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { usePermissions } from '../../hooks';
import type { Team } from '../../api/types';

export interface TeamMenuOptions {
  showSettings?: boolean;
  showMembers?: boolean;
  showInfo?: boolean;
  showLeave?: boolean;
}

export interface TeamMenuProps {
  team?: Team | null;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps<Theme>;
  options?: TeamMenuOptions; // Contrôle de visibilité en plus des permissions
  onOpenSettings?: (team: Team) => void;
  onOpenMembers?: (team: Team) => void;
  onOpenInfo?: (team: Team) => void;
  onLeaveTeam?: (team: Team) => void;
}

/**
 * TeamMenu component for team actions dropdown
 * Reusable in TeamHeader and TeamTabs - only handles menu, dialogs managed by parent
 */
export const TeamMenu: React.FC<TeamMenuProps> = ({
  team,
  size = 'small',
  sx,
  options = { showSettings: true, showMembers: true, showInfo: true, showLeave: true },
  onOpenSettings,
  onOpenMembers,
  onOpenInfo,
  onLeaveTeam,
}) => {
  const { canManageTeam } = usePermissions();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  // Stable menu handlers
  const handleSettingsClick = useCallback(() => {
    if (team && onOpenSettings) {
      onOpenSettings(team);
    }
    handleMenuClose();
  }, [team, onOpenSettings, handleMenuClose]);

  const handleMembersClick = useCallback(() => {
    if (team && onOpenMembers) {
      onOpenMembers(team);
    }
    handleMenuClose();
  }, [team, onOpenMembers, handleMenuClose]);

  const handleInfoClick = useCallback(() => {
    if (team && onOpenInfo) {
      onOpenInfo(team);
    }
    handleMenuClose();
  }, [team, onOpenInfo, handleMenuClose]);

  const handleLeaveClick = useCallback(() => {
    if (team && onLeaveTeam) {
      onLeaveTeam(team);
    }
    handleMenuClose();
  }, [team, onLeaveTeam, handleMenuClose]);

  if (!team) return null;

  return (
    <>
      <IconButton
        size={size}
        onClick={handleMenuOpen}
        aria-label="team options"
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'text.primary',
          },
          ...sx,
        }}
      >
        <MoreVertIcon fontSize={size} />
      </IconButton>

      {/* Team Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {options.showSettings && onOpenSettings && canManageTeam(team.id) && (
          <MenuItem onClick={handleSettingsClick}>Team Settings</MenuItem>
        )}
        {options.showMembers && onOpenMembers && canManageTeam(team.id) && (
          <MenuItem onClick={handleMembersClick}>Manage Members</MenuItem>
        )}
        {options.showInfo && onOpenInfo && (
          <MenuItem onClick={handleInfoClick}>View Team Info</MenuItem>
        )}
        {options.showLeave && onLeaveTeam && (
          <MenuItem onClick={handleLeaveClick}>Leave Team</MenuItem>
        )}
      </Menu>
    </>
  );
};

export default TeamMenu;