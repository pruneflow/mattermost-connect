/**
 * Team menu component with contextual team actions
 * Provides settings, member management, invitations, and team information options
 */
import React, { useCallback } from 'react';
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
import { canManageTeam, canInviteUser, canAddUserToTeam } from '../../services/permissionService';
import { useMenu } from '../../hooks';
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
  options?: TeamMenuOptions; // Visibility control in addition to permissions
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
  const { anchorEl, isOpen, openMenu, closeMenu } = useMenu(`team-menu-${team?.id || 'unknown'}`);

  // Stable menu handlers
  const handleSettingsClick = useCallback(() => {
    if (team && onOpenSettings) {
      onOpenSettings(team);
    }
    closeMenu();
  }, [team, onOpenSettings, closeMenu]);

  const handleMembersClick = useCallback(() => {
    if (team && onOpenMembers) {
      onOpenMembers(team);
    }
    closeMenu();
  }, [team, onOpenMembers, closeMenu]);

  const handleInfoClick = useCallback(() => {
    if (team && onOpenInfo) {
      onOpenInfo(team);
    }
    closeMenu();
  }, [team, onOpenInfo, closeMenu]);

  const handleInviteClick = useCallback(() => {
    if (team && onOpenInvite) {
      onOpenInvite(team);
    }
    closeMenu();
  }, [team, onOpenInvite, closeMenu]);

  const handleLeaveClick = useCallback(() => {
    if (team && onLeaveTeam) {
      onLeaveTeam(team);
    }
    closeMenu();
  }, [team, onLeaveTeam, closeMenu]);

  if (!team) return null;

  // Check invite permissions
  const canInvite = canInviteUser(team.id) || canAddUserToTeam(team.id);

  return (
    <>
      <IconButton
        size={size}
        onClick={openMenu}
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
        anchorEl={anchorEl}
        open={isOpen}
        onClose={closeMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper:{
            sx: {
              minWidth: 200,
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1,
              },
            },
          }
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