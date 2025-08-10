import { useState, useCallback } from 'react';
import { client } from '../api/client';
import { handleError } from '../services/errorService';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { canAddUserToTeam, canManageChannelMembers } from '../services/permissionService';
import { selectChannelById, selectCurrentTeamId, selectUserProfiles, selectTeamMembers, selectChannelMembers } from '../store/selectors';
import { loadTeamMembers, loadChannelMembers, addUsersToTeam } from '../store/slices/entitiesSlice';

/**
 * Generate Mattermost-style user feedback messages based on invitation results
 */
export const generateMattermostMessage = (result: ChannelInvitationResult, userProfiles: Record<string, any>): string => {
  const messages: string[] = [];
  
  // Helper to get user display names
  const getUserNames = (userIds: string[]): string[] => {
    return userIds.map(id => userProfiles[id]?.username || `User ${id}`);
  };
  
  // Users successfully added to channel
  if (result.addedToChannel.length > 0) {
    const names = getUserNames(result.addedToChannel);
    if (names.length === 1) {
      messages.push(`${names[0]} added to channel`);
    } else {
      messages.push(`${names.length} members added to channel`);
    }
  }
  
  // Users added to team first
  if (result.addedToTeam.length > 0) {
    const names = getUserNames(result.addedToTeam);
    if (names.length === 1) {
      messages.push(`${names[0]} added to team and channel`);
    } else {
      messages.push(`${names.length} members added to team and channel`);
    }
  }
  
  // Users already in channel
  if (result.alreadyInChannel.length > 0) {
    const names = getUserNames(result.alreadyInChannel);
    if (names.length === 1) {
      messages.push(`${names[0]} is already in this channel`);
    } else {
      messages.push(`${names.length} members are already in this channel`);
    }
  }
  
  // Failed users
  if (result.failedUsers.length > 0) {
    const names = getUserNames(result.failedUsers);
    if (result.noTeamPermission) {
      messages.push(`Cannot add ${names.length === 1 ? names[0] : names.length + ' members'}: not part of team and you don't have permission to add them`);
    } else if (result.noChannelPermission) {
      messages.push('You do not have permission to add members to this channel');
    } else {
      messages.push(`Failed to add ${names.length === 1 ? names[0] : names.length + ' members'}`);
    }
  }
  
  return messages.join('. ');
};

export interface ChannelInvitationResult {
  success: boolean;
  message?: string;
  // Detailed results for intelligent cascade logic
  addedToTeam: string[];      // Users added to team first
  addedToChannel: string[];   // Users added to channel
  alreadyInChannel: string[]; // Users already in channel
  failedUsers: string[];      // Users that failed to be added
  // Permission/error details
  noTeamPermission?: boolean;
  noChannelPermission?: boolean;
}

/**
 * Hook for channel invitation functionality following Mattermost patterns
 * Provides intelligent channel member addition with team/channel cascade logic
 */
export const useChannelInvitations = (channelId: string) => {
  const dispatch = useAppDispatch();
  
  // Get current state
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const channel = useAppSelector(state => selectChannelById(state, channelId));
  const userProfiles = useAppSelector(selectUserProfiles);
  const teamMembers = useAppSelector(state => selectTeamMembers(state, currentTeamId || ''));
  const channelMembers = useAppSelector(state => selectChannelMembers(state, channelId));
  
  // Loading state for adding members
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  /**
   * Add existing users to the channel with intelligent team/channel cascade logic
   * Handles: team membership validation, channel permissions, detailed results
   */
  const addMembersToChannel = useCallback(async (userIds: string[]): Promise<ChannelInvitationResult> => {
    if (!channelId || userIds.length === 0 || !currentTeamId || !channel) {
      return { 
        success: false, 
        message: 'Missing channel ID, user IDs, or team context',
        addedToTeam: [],
        addedToChannel: [],
        alreadyInChannel: [],
        failedUsers: userIds
      };
    }

    // Check permissions first
    if (!canManageChannelMembers(channel)) {
      return {
        success: false,
        message: 'You do not have permission to add members to this channel',
        addedToTeam: [],
        addedToChannel: [],
        alreadyInChannel: [],
        failedUsers: userIds,
        noChannelPermission: true
      };
    }

    setIsAddingMembers(true);
    
    try {
      // Load current team and channel members to ensure we have latest data
      await Promise.all([
        dispatch(loadTeamMembers(currentTeamId)).unwrap(),
        dispatch(loadChannelMembers(channelId)).unwrap()
      ]);

      const result: ChannelInvitationResult = {
        success: true,
        addedToTeam: [],
        addedToChannel: [],
        alreadyInChannel: [],
        failedUsers: []
      };

      // Categorize users by their current membership status
      const usersNotInTeam: string[] = [];
      const usersInTeamNotInChannel: string[] = [];
      
      for (const userId of userIds) {
        const isInTeam = !!teamMembers[userId];
        const isInChannel = !!channelMembers[userId];
        
        if (isInChannel) {
          result.alreadyInChannel.push(userId);
        } else if (isInTeam) {
          usersInTeamNotInChannel.push(userId);
        } else {
          usersNotInTeam.push(userId);
        }
      }

      // Handle users not in team - add to team first
      if (usersNotInTeam.length > 0) {
        if (!canAddUserToTeam(currentTeamId)) {
          result.failedUsers.push(...usersNotInTeam);
          result.noTeamPermission = true;
        } else {
          try {
            // Use Redux action instead of direct client call to ensure store sync
            await dispatch(addUsersToTeam({ teamId: currentTeamId, userIds: usersNotInTeam })).unwrap();
            result.addedToTeam.push(...usersNotInTeam);
            // Now these users can be added to channel
            usersInTeamNotInChannel.push(...usersNotInTeam);
          } catch (error) {
            result.failedUsers.push(...usersNotInTeam);
          }
        }
      }

      // Add users to channel (those already in team + those just added to team)
      if (usersInTeamNotInChannel.length > 0) {
        try {
          await client.addToChannels(usersInTeamNotInChannel, channelId);
          result.addedToChannel.push(...usersInTeamNotInChannel);
        } catch (error) {
          result.failedUsers.push(...usersInTeamNotInChannel);
        }
      }

      // Determine overall success
      result.success = result.failedUsers.length === 0;
      
      // Generate user-friendly message
      result.message = generateMattermostMessage(result, userProfiles);
      
      return result;
      
    } catch (error) {
      handleError('Failed to add members to channel', error as any);
      return { 
        success: false, 
        message: 'Failed to add members',
        addedToTeam: [],
        addedToChannel: [],
        alreadyInChannel: [],
        failedUsers: userIds
      };
    } finally {
      setIsAddingMembers(false);
    }
  }, [channelId, currentTeamId, channel, canManageChannelMembers, canAddUserToTeam, dispatch, handleError, teamMembers, channelMembers, userProfiles]);

  return {
    // States
    isAddingMembers,
    
    // Actions
    addMembersToChannel,
  };
};

export default useChannelInvitations;