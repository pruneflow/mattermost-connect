import React, { useState, useCallback } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  SxProps,
  Theme,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Info as InfoIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { usePermissions } from '../../hooks';
import type { Team } from '../../api/types';

export interface TeamMenuOptions {
  showSettings?: boolean;
  showMembers?: boolean;
  showInvite?: boolean;
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
  onOpenInvite?: (team: Team) => void;
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
  options = { showSettings: true, showMembers: true, showInvite: true, showInfo: true, showLeave: true },
  onOpenSettings,
  onOpenMembers,
  onOpenInvite,
  onOpenInfo,
  onLeaveTeam,
}) => {
  const { canManageTeam, canInviteUser, canAddUserToTeam } = usePermissions();
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

  const handleInviteClick = useCallback(() => {
    if (team && onOpenInvite) {
      onOpenInvite(team);
    }
    handleMenuClose();
  }, [team, onOpenInvite, handleMenuClose]);

  const handleLeaveClick = useCallback(() => {
    if (team && onLeaveTeam) {
      onLeaveTeam(team);
    }
    handleMenuClose();
  }, [team, onLeaveTeam, handleMenuClose]);

  if (!team) return null;

  // Check invite permissions
  const canInvite = canInviteUser(team.id) || canAddUserToTeam(team.id);

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
        PaperProps={{
          sx: {
            minWidth: 200,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
            },
          },
        }}
      >
        {/* Team Management Section */}
        {options.showSettings && onOpenSettings && canManageTeam(team.id) && (
          <MenuItem onClick={handleSettingsClick}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Team Settings</ListItemText>
          </MenuItem>
        )}
        {options.showMembers && onOpenMembers && canManageTeam(team.id) && (
          <MenuItem onClick={handleMembersClick}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Members</ListItemText>
          </MenuItem>
        )}
        {options.showInvite && onOpenInvite && canInvite && (
          <MenuItem onClick={handleInviteClick}>
            <ListItemIcon>
              <PersonAddIcon fontSize="small" sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText>Invite People</ListItemText>
          </MenuItem>
        )}
        
        {/* Divider if any management options are shown */}
        {((options.showSettings && onOpenSettings && canManageTeam(team.id)) ||
          (options.showMembers && onOpenMembers && canManageTeam(team.id)) ||
          (options.showInvite && onOpenInvite && canInvite)) &&
          options.showInfo && onOpenInfo && (
            <Divider />
          )}
        
        {/* Information Section */}
        {options.showInfo && onOpenInfo && (
          <MenuItem onClick={handleInfoClick}>
            <ListItemIcon>
              <InfoIcon fontSize="small" sx={{ color: 'info.main' }} />
            </ListItemIcon>
            <ListItemText>View Team Info</ListItemText>
          </MenuItem>
        )}
        
        {/* Divider before leave action */}
        {options.showLeave && onLeaveTeam && (
          <>
            <Divider />
            <MenuItem onClick={handleLeaveClick} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <ExitToAppIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Leave Team</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default TeamMenu;