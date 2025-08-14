/**
 * Add channel members dialog for inviting team members to channels
 * Provides user search, member selection, and permission-based access control
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { UserSearchAutocomplete } from '../atoms/UserSearchAutocomplete';
import { useUserSearch } from '../../hooks/useUserSearch';
import { useChannelInvitations } from '../../hooks/useChannelInvitations';
import { canManageChannelMembers } from '../../services/permissionService';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectChannelById, selectChannelMembers } from '../../store/selectors';
import { loadChannelMembers, loadTeamMembers } from '../../store/slices/entitiesSlice';
import { Chip } from '@mui/material';
import { InvitationResultsTable, type InvitationResultRow } from '../molecules/InvitationResultsTable';
import type { ChannelInvitationResult } from '../../hooks/useChannelInvitations';

const generateInvitationResultRows = (invitationResult: ChannelInvitationResult): InvitationResultRow[] => {
  const rows: InvitationResultRow[] = [];
  
  // Users added to team and channel
  invitationResult.addedToTeam?.forEach((userId: string) => {
    rows.push({
      userId,
      status: 'success',
      message: 'This member has been added to the team and the channel'
    });
  });

  // Users added to channel only
  invitationResult.addedToChannel?.forEach((userId: string) => {
    // Skip if already added to team (to avoid duplicates)
    if (!invitationResult.addedToTeam?.includes(userId)) {
      rows.push({
        userId,
        status: 'success',
        message: 'This member has been added to the channel'
      });
    }
  });

  // Users already in channel
  invitationResult.alreadyInChannel?.forEach((userId: string) => {
    rows.push({
      userId,
      status: 'success',
      message: 'This member is already in the channel'
    });
  });

  // Failed users
  invitationResult.failedUsers?.forEach((userId: string) => {
    let errorMessage = 'Failed to add this member';
    if (invitationResult.noTeamPermission) {
      errorMessage = 'Cannot add: not part of team and you don\'t have permission';
    } else if (invitationResult.noChannelPermission) {
      errorMessage = 'You do not have permission to add members to this channel';
    }
    
    rows.push({
      userId,
      status: 'error',
      message: errorMessage
    });
  });

  return rows;
};

const STATIC_STYLES = {
  container: {
    p: 3,
    minHeight: 400,
  } as const,
  
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    mb: 2,
  } as const,
  
  section: {
    mb: 3,
  } as const,
  
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    mb: 1,
  } as const,
  
  description: {
    fontSize: '0.875rem',
    color: 'text.secondary',
    mb: 2,
  } as const,
  
  actions: {
    gap: 1,
  } as const,
};

export interface AddChannelMembersDialogProps {
  channelId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for adding members to a channel
 * Based on InvitePeopleDialog pattern but simplified for channel members only
 */
export const AddChannelMembersDialog: React.FC<AddChannelMembersDialogProps> = ({
  channelId,
  open,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; details?: any } | null>(null);
  
  // Get channel data
  const channel = useAppSelector(state => selectChannelById(state, channelId));
  const teamId = channel?.team_id || '';
  const channelMembers = useAppSelector(state => selectChannelMembers(state, channelId));
  // Load team and channel members when dialog opens (always fresh data)
  useEffect(() => {
    if (open && channel && channel.type !== 'D' && teamId) {
      dispatch(loadTeamMembers(teamId));
      dispatch(loadChannelMembers(channelId));
    }
  }, [dispatch, open, channelId, teamId]);
  
  const { searchUsersToAddInChannel } = useUserSearch();
  const { addMembersToChannel, isAddingMembers } = useChannelInvitations(channelId);
  
  // Check permissions
  const canAddMembers = channel ? canManageChannelMembers(channel) : false;
  
  // Handle user selection change
  const handleUserSelectionChange = useCallback((userIds: string[]) => {
    setSelectedUserIds(userIds);
  }, []);

  // Handle user search
  const handleUserSearch = useCallback((term: string) => {
    if (!teamId) return;
    const channelMemberIds = Object.keys(channelMembers || {});
    searchUsersToAddInChannel(term, teamId, channelId, channelMemberIds);
  }, [searchUsersToAddInChannel, teamId, channelId, channelMembers]);

  // Handle adding members
  const handleAddMembers = useCallback(async () => {
    if (selectedUserIds.length === 0) return;
    
    const inviteResult = await addMembersToChannel(selectedUserIds);
    
    if (inviteResult.success) {
      setResult({ 
        type: 'success', 
        message: inviteResult.message || 'Members added successfully',
        details: inviteResult
      });
      setSelectedUserIds([]);
      onSuccess?.();
      
    } else {
      setResult({ 
        type: 'error', 
        message: inviteResult.message || 'Failed to add members',
        details: inviteResult
      });
    }
  }, [selectedUserIds, addMembersToChannel, onSuccess, onClose]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (isAddingMembers) return; // Prevent closing while adding
    setSelectedUserIds([]);
    setResult(null);
    onClose();
  }, [isAddingMembers, onClose]);

  // Handle add other members (reset to search mode)
  const handleAddOtherMembers = useCallback(() => {
    setResult(null);
    setSelectedUserIds([]);
  }, []);

  // Render custom chip for users already in channel
  const renderCustomChip = useCallback((userId: string) => {
    const isInChannel = channelMembers[userId];
    if (isInChannel) {
      return (
        <Chip
          label="Already in channel"
          size="small"
          color="info"
          variant="outlined"
          sx={{ fontSize: "0.65rem", height: 20 }}
        />
      );
    }
    return null;
  }, [channelMembers]);


  // Don't render if no permission or no channel
  if (!canAddMembers || !channel) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle>
        <Box sx={STATIC_STYLES.header}>
          <PersonAdd color="primary" />
          <Box>
            <Typography variant="h6" component="div">
              Add Members to {channel.display_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add existing team members to this channel
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={STATIC_STYLES.container}>
        {/* Results Table */}
        {result?.details && (
          <>
            <InvitationResultsTable 
              title="Invitation Results"
              rows={generateInvitationResultRows(result.details)}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Button 
                variant="outlined" 
                onClick={handleAddOtherMembers}
                startIcon={<PersonAdd />}
              >
                Add Other Members
              </Button>
            </Box>
          </>
        )}

        {/* Add Existing Users Section - only show when no results */}
        {!result?.details && (
          <Box sx={STATIC_STYLES.section}>
            <Typography sx={STATIC_STYLES.sectionTitle}>
              Add Team Members
            </Typography>
            <Typography sx={STATIC_STYLES.description}>
              Search and select team members to add to this channel.
            </Typography>
            
            <UserSearchAutocomplete
              teamId={teamId}
              selectedUserIds={selectedUserIds}
              onUserSelectionChange={handleUserSelectionChange}
              search={handleUserSearch}
              renderCustomChip={renderCustomChip}
            />
          </Box>
        )}

        <Divider />
      </DialogContent>

      <DialogActions sx={STATIC_STYLES.actions}>
        <Button 
          onClick={handleClose}
          disabled={isAddingMembers}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddMembers}
          variant="contained"
          disabled={selectedUserIds.length === 0 || isAddingMembers}
          startIcon={<PersonAdd />}
        >
          {isAddingMembers ? 'Adding...' : `Add ${selectedUserIds.length} Member${selectedUserIds.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddChannelMembersDialog;