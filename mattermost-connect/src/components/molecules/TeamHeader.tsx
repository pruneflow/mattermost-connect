/**
 * Team header component for displaying team information and actions
 * Shows team name with context menu and manages team-related dialogs
 */
import React from 'react';
import {
  Box,
  Typography,
  Divider,
  SxProps,
  Theme,
} from '@mui/material';
import { TeamMenu, type TeamMenuOptions } from './TeamMenu';
import { useTeamDialogs } from '../../hooks';
import type { Team } from '../../api/types';
import TeamSettingsDialog from "../organisms/TeamSettingsDialog";
import ManageMembersDialog from "../organisms/ManageMembersDialog";
import TeamInfoDialog from "../organisms/TeamInfoDialog";
import LeaveTeamDialog from "../organisms/LeaveTeamDialog";

export interface TeamHeaderProps {
  team?: Team | null;
  compact?: boolean;
  sx?: SxProps<Theme>;
  menuOptions?: TeamMenuOptions;
}

/**
 * TeamHeader component for displaying team name and menu
 * Used in channel sidebar following Mattermost patterns
 */
export const TeamHeader: React.FC<TeamHeaderProps> = ({
  team,
  compact = false,
  sx,
  menuOptions,
}) => {
  const {
    selectedTeamId,
    openSettings,
    openMembers,
    openInfo,
    openLeave,
    isSettingsOpen,
    isMembersOpen,
    isInfoOpen,
    isLeaveOpen,
    closeDialog,
  } = useTeamDialogs();
  if (!team) {
    return (
      <Box sx={sx}>
        <Box
          sx={{
            p: 2,
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No Team Selected
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', px: 2 }}>
          <Divider sx={{ width: '100%' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={sx}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: compact ? 1 : 2,
          bgcolor: 'background.paper',
          minHeight: compact ? 48 : 56,
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

        <TeamMenu 
          team={team} 
          size="small" 
          options={menuOptions}
          onOpenSettings={openSettings}
          onOpenMembers={openMembers}
          onOpenInfo={openInfo}
          onLeaveTeam={openLeave}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', px: 2 }}>
        <Divider sx={{ width: '100%' }} />
      </Box>

      <TeamSettingsDialog
        open={isSettingsOpen}
        onClose={closeDialog}
        teamId={selectedTeamId}
      />

      <ManageMembersDialog
        open={isMembersOpen}
        onClose={closeDialog}
        teamId={selectedTeamId}
      />

      <TeamInfoDialog
        open={isInfoOpen}
        onClose={closeDialog}
        teamId={selectedTeamId}
      />

      <LeaveTeamDialog
        open={isLeaveOpen}
        onClose={closeDialog}
        teamId={selectedTeamId}
      />
    </Box>
  );
};

export default TeamHeader;