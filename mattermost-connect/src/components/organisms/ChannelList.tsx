import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  List,
  Typography,
  Divider,
  SxProps,
  Theme,
} from '@mui/material';
import { SearchInput } from '../atoms/SearchInput';
import { TeamHeader } from '../molecules/TeamHeader';
import { ChannelSection } from '../molecules/ChannelSection';
import { useChannelLoader } from '../../hooks/useChannelLoader';

// Static styles extracted for performance
const STATIC_STYLES = {
  container: {
    width: '100%',
  } as const,
  
  searchBox: {
    p: 1,
  } as const,
  
  channelsContainer: {
    flex: 1,
    overflow: 'auto',
  } as const,
  
  divider: {
    my: 1,
  } as const,
};
import { useAutoChannelSelection } from '../../hooks/useAutoChannelSelection';
import { useNavigation } from '../../hooks/useNavigation';
import { useAppSelector } from '../../hooks/useAppSelector';
import { 
  selectCurrentTeam, 
  selectCurrentChannelId, 
  selectChannelIdsForCurrentTeam,
  createSelectFilteredChannelIds
} from "../../store/selectors";

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

  // Memoized container styles with custom sx
  const containerStyles = useMemo(() => ({
    ...STATIC_STYLES.container,
    ...sx,
  }), [sx]);

  // Use current team and channel
  const currentTeam = useAppSelector(selectCurrentTeam);
  const currentChannelId = useAppSelector(selectCurrentChannelId);

  // Auto-load channels for current team
  useChannelLoader();

  // Auto-select channel after loading
  useAutoChannelSelection();

  // Create search selector instance once  
  const selectFilteredChannelIds = useMemo(() => createSelectFilteredChannelIds(), []);
  
  // Get filtered channel IDs based on search query
  const channelIds = useAppSelector(state => 
    searchQuery.trim() 
      ? selectFilteredChannelIds(state, searchQuery)
      : selectChannelIdsForCurrentTeam(state)
  );

  // Get navigation
  const { navigateToChannel } = useNavigation();

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle channel selection with stable callback
  const handleChannelSelect = useCallback((channelId: string) => {
    const teamId = currentTeam?.id;
    if (teamId) {
      navigateToChannel(teamId, channelId);
    }
    onChannelSelect?.(channelId);
  }, [currentTeam?.id, navigateToChannel, onChannelSelect]);


  return (
    <Box sx={containerStyles}>
      {/* Team Header */}
      {showTeamHeader && (
        <TeamHeader team={currentTeam} compact={compact} />
      )}
      
      {/* Search Bar */}
      {showSearch && (
        <Box sx={STATIC_STYLES.searchBox}>
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
      <Box sx={STATIC_STYLES.channelsContainer}>
        {/* Public Channels */}
        <ChannelSection
          title="Public Channels"
          channelIds={channelIds.public}
          currentChannelId={currentChannelId}
          onChannelSelect={handleChannelSelect}
          compact={compact}
        />

        {/* Private Channels */}
        <ChannelSection
          title="Private Channels"
          channelIds={channelIds.private}
          currentChannelId={currentChannelId}
          onChannelSelect={handleChannelSelect}
          compact={compact}
        />

        {/* Divider before Direct Messages */}
        {(channelIds.public.length > 0 || channelIds.private.length > 0) && channelIds.direct.length > 0 && (
          <Divider sx={STATIC_STYLES.divider} />
        )}

        {/* Direct Messages */}
        <ChannelSection
          title="Direct Messages"
          channelIds={channelIds.direct}
          currentChannelId={currentChannelId}
          onChannelSelect={handleChannelSelect}
          compact={compact}
        />

        {/* Group Messages */}
        <ChannelSection
          title="Group Messages"
          channelIds={channelIds.group}
          currentChannelId={currentChannelId}
          onChannelSelect={handleChannelSelect}
          compact={compact}
        />
      </Box>
    </Box>
  );
};

export default ChannelList;