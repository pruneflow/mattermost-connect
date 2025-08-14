import { useState, useCallback } from 'react';
import type { Team } from '../api/types';

export type TeamDialogType = 'settings' | 'members' | 'info' | 'leave' | 'invite';

/**
 * Hook to manage team dialog state
 * Extracts common logic from TeamList and TeamHeader
 */
export const useTeamDialogs = () => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<TeamDialogType | null>(null);

  const openTeamDialog = useCallback((team: Team, dialogType: TeamDialogType) => {
    setSelectedTeamId(team.id);
    setOpenDialog(dialogType);
  }, []);

  const closeDialog = useCallback(() => {
    setOpenDialog(null);
    setSelectedTeamId(null);
  }, []);

  const openSettings = useCallback((team: Team) => {
    openTeamDialog(team, 'settings');
  }, [openTeamDialog]);

  const openMembers = useCallback((team: Team) => {
    openTeamDialog(team, 'members');
  }, [openTeamDialog]);

  const openInfo = useCallback((team: Team) => {
    openTeamDialog(team, 'info');
  }, [openTeamDialog]);

  const openLeave = useCallback((team: Team) => {
    openTeamDialog(team, 'leave');
  }, [openTeamDialog]);

  const openInvite = useCallback((team: Team) => {
    openTeamDialog(team, 'invite');
  }, [openTeamDialog]);

  return {
    // State
    selectedTeamId,
    openDialog,
    
    // Actions
    openSettings,
    openMembers,
    openInfo,
    openLeave,
    openInvite,
    closeDialog,
    
    // Boolean states for components
    isSettingsOpen: openDialog === 'settings',
    isMembersOpen: openDialog === 'members',
    isInfoOpen: openDialog === 'info',
    isLeaveOpen: openDialog === 'leave',
    isInviteOpen: openDialog === 'invite',
  };
};

export default useTeamDialogs;