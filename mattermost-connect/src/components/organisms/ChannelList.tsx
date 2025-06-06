import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  List,
  Typography,
  Divider,
  SxProps,
  Theme,
} from '@mui/material';
import { ChannelItem } from '../molecules/ChannelItem';
import { SearchInput } from '../atoms/SearchInput';
import { TeamHeader } from '../molecules/TeamHeader';
import { useChannels } from '../../hooks/useChannels';
import { useChannelLoader } from '../../hooks/useChannelLoader';
import { useAutoChannelSelection } from '../../hooks/useAutoChannelSelection';
import { useNavigation } from '../../hooks/useNavigation';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentTeam, selectCurrentChannelId } from '../../store/selectors';
import type { Channel } from '../../api/types';

export interface ChannelListProps {
  showSearch?: boolean;
  onChannelSelect?: (channelId: string) => void;
  compact?: boolean;
  showTeamHeader?: boolean; // Show team name and menu at top
  sx?: SxProps<Theme>;
}

/**
 * ChannelList component following Mattermost sidebar patterns
 * Displays categorized channel list for current team with search functionality
 */
export const ChannelList: React.FC<ChannelListProps> = ({
  showSearch = true,
  onChannelSelect,
  compact = false,
  showTeamHeader = false,
  sx,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Use current team and channel
  const currentTeam = useAppSelector(selectCurrentTeam);
  const currentChannelId = useAppSelector(selectCurrentChannelId);

  // Auto-load channels for current team
  useChannelLoader();

  // Auto-select channel after loading
  useAutoChannelSelection();

  // Get channels data (read-only)
  const {
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,
  } = useChannels();

  // Get navigation
  const { navigateToChannel } = useNavigation();

  // Filter function for search
  const filterChannels = useCallback((channels: Channel[], query: string) => {
    if (!query.trim()) return channels;
    
    const q = query.toLowerCase().trim();
    return channels.filter(channel => 
      channel.display_name?.toLowerCase().includes(q) ||
      channel.name?.toLowerCase().includes(q) ||
      channel.purpose?.toLowerCase().includes(q)
    );
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle channel selection
  const handleChannelSelect = (channelId: string) => {
    if (currentTeam?.id) {
      navigateToChannel(currentTeam.id, channelId);
    }
    if (onChannelSelect) {
      onChannelSelect(channelId);
    }
  };

  // Categorize and filter channels for display
  const channelCategories = useMemo(() => {

    // Apply search filter to all categories
    return {
      public: filterChannels(publicChannels, searchQuery),
      private: filterChannels(privateChannels, searchQuery),
      direct: filterChannels(directChannels, searchQuery),
      group: filterChannels(groupChannels, searchQuery),
    };
  }, [publicChannels, privateChannels, directChannels, groupChannels, searchQuery, filterChannels]);


  return (
    <Box sx={{ width: '100%', ...sx }}>
      {/* Team Header */}
      {showTeamHeader && (
        <TeamHeader team={currentTeam} compact={compact} />
      )}
      
      {/* Search Bar */}
      {showSearch && (
        <Box sx={{ p: 1 }}>
          <SearchInput
            placeholder="Find channels"
            value={searchQuery}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            size="small"
          />
        </Box>
      )}

      {/* Channel Categories */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Public Channels */}
        {channelCategories.public.length > 0 && (
          <>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                px: 2,
                py: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Public Channels
            </Typography>
            <List dense sx={{ py: 0 }}>
              {channelCategories.public.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={{
                    ...channel,
                    isActive: channel.id === currentChannelId,
                  }}
                  onClick={handleChannelSelect}
                  compact={compact}
                />
              ))}
            </List>
          </>
        )}

        {/* Private Channels */}
        {channelCategories.private.length > 0 && (
          <>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                px: 2,
                py: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Private Channels
            </Typography>
            <List dense sx={{ py: 0 }}>
              {channelCategories.private.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={{
                    ...channel,
                    isActive: channel.id === currentChannelId,
                  }}
                  onClick={handleChannelSelect}
                  compact={compact}
                />
              ))}
            </List>
          </>
        )}

        {/* Direct Messages */}
        {channelCategories.direct.length > 0 && (
          <>
            {(channelCategories.public.length > 0 || channelCategories.private.length > 0) && (
              <Divider sx={{ my: 1 }} />
            )}
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                px: 2,
                py: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Direct Messages
            </Typography>
            <List dense sx={{ py: 0 }}>
              {channelCategories.direct.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={{
                    ...channel,
                    isActive: channel.id === currentChannelId,
                  }}
                  onClick={handleChannelSelect}
                  compact={compact}
                />
              ))}
            </List>
          </>
        )}

        {/* Group Messages */}
        {channelCategories.group.length > 0 && (
          <>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                px: 2,
                py: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Group Messages
            </Typography>
            <List dense sx={{ py: 0 }}>
              {channelCategories.group.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={{
                    ...channel,
                    isActive: channel.id === currentChannelId,
                  }}
                  onClick={handleChannelSelect}
                  compact={compact}
                />
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChannelList;