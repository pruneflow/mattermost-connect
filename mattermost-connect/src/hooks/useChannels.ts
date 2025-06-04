import { useCallback, useEffect, useMemo } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  setChannels,
  setChannel,
  setCurrentChannelId,
  setChannelsInTeam,
  setChannelMember,
  addChannelToTeam,
  removeChannelFromTeam
} from '../store/slices/entitiesSlice';
import { 
  selectCurrentChannel,
  selectCurrentChannelId,
  selectCurrentUserId,
  selectCurrentTeamId,
  selectChannelsForCurrentTeam,
  selectChannelsWithUnreadsForCurrentTeam,
  selectPublicChannelsInCurrentTeam,
  selectPrivateChannelsInCurrentTeam,
  selectDirectChannelsInCurrentTeam,
  selectGroupChannelsInCurrentTeam,
  selectMyChannelMember
} from '../store/selectors';
import { client } from '../api/client';
import { useErrorHandler } from './useErrorHandler';
import { useUsers } from './useUsers';
import { getUserIdsFromDirectChannel } from '../utils/channelUtils';
import type { Channel, ChannelMember } from '../api/types';

/**
 * Hook for managing channels in the current team
 * Provides channel data and actions for the currently selected team
 */
export const useChannels = () => {
  const dispatch = useAppDispatch();
  const { handleError } = useErrorHandler();

  // Current state
  const currentChannelId = useAppSelector(selectCurrentChannelId);
  const currentChannel = useAppSelector(selectCurrentChannel);
  const currentUserId = useAppSelector(selectCurrentUserId);
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  
  // Current team channels with enriched data (following Mattermost pattern)
  const channelsInTeam = useAppSelector(selectChannelsForCurrentTeam);
  const channelsWithUnreads = useAppSelector(selectChannelsWithUnreadsForCurrentTeam);
  
  // Use new enriched selectors that include display names and user data
  const publicChannels = useAppSelector(selectPublicChannelsInCurrentTeam);
  const privateChannels = useAppSelector(selectPrivateChannelsInCurrentTeam);
  const directChannels = useAppSelector(selectDirectChannelsInCurrentTeam);
  const groupChannels = useAppSelector(selectGroupChannelsInCurrentTeam);
  
  // Load missing users for direct channels
  const { loadUsers } = useUsers();
  
  // Current channel member info
  const currentChannelMember = useAppSelector(state => 
    currentChannelId ? selectMyChannelMember(currentChannelId)(state) : null
  );

  // Load all channels for the current team
  const loadChannels = useCallback(async () => {
    if (!currentUserId || !currentTeamId) return;

    try {
      // Skip if already loaded
      if (channelsInTeam.length > 0) return;

      // Fetch channels and members in parallel
      const [teamChannels, myChannelMembers] = await Promise.all([
        client.getMyChannels(currentTeamId),
        client.getMyChannelMembers(currentTeamId)
      ]);

      // Normalize channels data
      const channelsById: Record<string, Channel> = {};
      const channelIds: string[] = [];
      teamChannels.forEach((channel: Channel) => {
        channelsById[channel.id] = channel;
        channelIds.push(channel.id);
      });

      // Normalize members data
      const membersById: Record<string, ChannelMember> = {};
      myChannelMembers.forEach((member: ChannelMember) => {
        membersById[member.channel_id] = member;
      });

      // Update store
      dispatch(setChannels(channelsById));
      dispatch(setChannelsInTeam({ teamId: currentTeamId, channelIds }));
      
      // Set member data
      Object.values(membersById).forEach(member => {
        dispatch(setChannelMember(member));
      });

      // Load missing users for direct channels (following Mattermost pattern)
      const directChannels = teamChannels.filter((channel: Channel) => channel.type === 'D');
      if (directChannels.length > 0) {
        const allUserIds = new Set<string>();
        directChannels.forEach((channel: Channel) => {
          const userIds = getUserIdsFromDirectChannel(channel.name);
          userIds.forEach(id => allUserIds.add(id));
        });

        if (allUserIds.size > 0) {
          await loadUsers(Array.from(allUserIds));
        }
      }

    } catch (error) {
      handleError(error, { action: 'Failed to load team channels' });
    }
  }, [currentUserId, currentTeamId, channelsInTeam.length, dispatch, handleError, loadUsers]);


  // Create a new channel in the current team
  const createChannel = useCallback(async (channelData: Partial<Channel>) => {
    if (!currentTeamId) return null;

    try {
      const newChannel = await client.createChannel({
        team_id: currentTeamId,
        name: channelData.name!,
        display_name: channelData.display_name!,
        purpose: channelData.purpose || '',
        header: channelData.header || '',
        type: channelData.type || 'O'
      });

      dispatch(setChannel(newChannel));
      dispatch(addChannelToTeam({ teamId: currentTeamId, channelId: newChannel.id }));

      return newChannel;
    } catch (error) {
      handleError(error, { action: 'Failed to create channel' });
      return null;
    }
  }, [currentTeamId, dispatch, handleError]);

  // Join an existing channel
  const joinChannel = useCallback(async (channelId: string) => {
    if (!currentUserId) return false;

    try {
      const member = await client.addToChannel(currentUserId, channelId);
      dispatch(setChannelMember(member));
      return true;
    } catch (error) {
      handleError(error, { action: 'Failed to join channel' });
      return false;
    }
  }, [currentUserId, dispatch, handleError]);

  // Leave a channel
  const leaveChannel = useCallback(async (channelId: string) => {
    if (!currentUserId || !currentTeamId) return false;

    try {
      await client.removeFromChannel(currentUserId, channelId);
      dispatch(removeChannelFromTeam({ teamId: currentTeamId, channelId }));
      return true;
    } catch (error) {
      handleError(error, { action: 'Failed to leave channel' });
      return false;
    }
  }, [currentUserId, currentTeamId, dispatch, handleError]);

  // Switch to a different channel
  const switchToChannel = useCallback((channelId: string) => {
    dispatch(setCurrentChannelId(channelId));
  }, [dispatch]);

  // Auto-load channels when team changes
  useEffect(() => {
    if (currentTeamId) {
      loadChannels();
    }
  }, [currentTeamId, loadChannels]);

  // Auto-select first channel when channels are loaded and no channel is selected
  useEffect(() => {
    if (channelsInTeam.length > 0 && !currentChannelId) {
      dispatch(setCurrentChannelId(channelsInTeam[0].id));
    }
  }, [channelsInTeam, currentChannelId, dispatch]);

  return {
    // Current state
    currentChannel,
    currentChannelId,
    currentChannelMember,

    // Channels with all data (sorted, unread info, etc.)
    channels: channelsWithUnreads,
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,

    // Actions
    loadChannels,
    createChannel,
    joinChannel,
    leaveChannel,
    switchToChannel,
  };
};

export default useChannels;