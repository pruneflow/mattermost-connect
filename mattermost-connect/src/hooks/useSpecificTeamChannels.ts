import { useCallback, useMemo } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  setChannels,
  setChannelsInTeam,
  setChannelMember,
} from '../store/slices/entitiesSlice';
import { 
  selectCurrentUserId,
  makeSelectChannelsInTeam,
  makeSelectChannelsWithUnreads
} from '../store/selectors';
import { client } from '../api/client';
import { useErrorHandler } from './useErrorHandler';
import type { Channel, ChannelMember } from '../api/types';

/**
 * Hook for managing channels in a specific team (not current team)
 * Use this when you need channels for a team other than the current one
 */
export const useSpecificTeamChannels = (teamId: string) => {
  const dispatch = useAppDispatch();
  const { handleError } = useErrorHandler();
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Create stable selector instances for this specific team
  const selectChannelsInTeam = useMemo(() => makeSelectChannelsInTeam(), []);
  const selectChannelsWithUnreads = useMemo(() => makeSelectChannelsWithUnreads(), []);

  // Get channels for this specific team
  const channelsInTeam = useAppSelector(state => selectChannelsInTeam(state, teamId));
  const channelsWithUnreads = useAppSelector(state => selectChannelsWithUnreads(state, teamId));

  // Filter by channel type locally (more efficient than separate selectors)
  const publicChannels = useMemo(() => 
    channelsInTeam.filter(channel => channel.type === 'O'), 
    [channelsInTeam]
  );

  const privateChannels = useMemo(() => 
    channelsInTeam.filter(channel => channel.type === 'P'), 
    [channelsInTeam]
  );

  // Load channels for this specific team
  const loadChannels = useCallback(async () => {
    if (!currentUserId || !teamId) return;

    try {
      // Skip if already loaded
      if (channelsInTeam.length > 0) return;

      // Fetch channels and members for this team
      const [teamChannels, myChannelMembers] = await Promise.all([
        client.getMyChannels(teamId),
        client.getMyChannelMembers(teamId)
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
      dispatch(setChannelsInTeam({ teamId, channelIds }));
      
      // Set member data
      Object.values(membersById).forEach(member => {
        dispatch(setChannelMember(member));
      });

    } catch (error) {
      handleError(error, { action: `Failed to load channels for team ${teamId}` });
    }
  }, [currentUserId, teamId, channelsInTeam.length, dispatch, handleError]);

  return {
    // Channel lists for this specific team
    channelsInTeam,
    channelsWithUnreads,
    publicChannels,
    privateChannels,

    // Actions
    loadChannels,
  };
};

export default useSpecificTeamChannels;