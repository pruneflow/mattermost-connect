/**
 * Search bar component with live channel filtering and results dropdown
 * Provides real-time search functionality with relevance-based sorting
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Collapse,
  List,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import { SearchInput } from '../atoms/SearchInput';
import { ChannelItem } from './ChannelItem';
import type { Channel } from '../../api/types';

export interface SearchBarProps {
  placeholder?: string;
  channels?: Channel[];
  onChannelSelect?: (channelId: string) => void;
  onSearch?: (query: string) => void;
  disabled?: boolean;
  maxResults?: number;
  sx?: SxProps<Theme>;
}

/**
 * SearchBar component following Mattermost patterns
 * Provides search functionality with live results
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search channels...',
  channels = [],
  onChannelSelect,
  onSearch,
  disabled = false,
  maxResults = 10,
  sx,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Filter channels based on search query
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = channels.filter(channel => {
      // Search in display name and name
      const displayName = channel.display_name?.toLowerCase() || '';
      const channelName = channel.name?.toLowerCase() || '';
      const purpose = channel.purpose?.toLowerCase() || '';
      
      return (
        displayName.includes(query) ||
        channelName.includes(query) ||
        purpose.includes(query)
      );
    });

    // Sort by relevance (exact matches first, then partial matches)
    return filtered
      .sort((a, b) => {
        const aDisplayName = a.display_name?.toLowerCase() || '';
        const bDisplayName = b.display_name?.toLowerCase() || '';
        
        // Exact match in display name gets highest priority
        if (aDisplayName === query && bDisplayName !== query) return -1;
        if (bDisplayName === query && aDisplayName !== query) return 1;
        
        // Starts with query gets second priority
        if (aDisplayName.startsWith(query) && !bDisplayName.startsWith(query)) return -1;
        if (bDisplayName.startsWith(query) && !aDisplayName.startsWith(query)) return 1;
        
        // Alphabetical for the rest
        return aDisplayName.localeCompare(bDisplayName);
      })
      .slice(0, maxResults);
  }, [searchQuery, channels, maxResults]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearchActive(query.length > 0);
    
    if (onSearch) {
      onSearch(query);
    }
  }, [onSearch]);

  const handleChannelSelect = useCallback((channelId: string) => {
    // Clear search when channel is selected
    setSearchQuery('');
    setIsSearchActive(false);
    
    if (onChannelSelect) {
      onChannelSelect(channelId);
    }
  }, [onChannelSelect]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setIsSearchActive(false);
  }, []);

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      {/* Search Input */}
      <SearchInput
        value={searchQuery}
        placeholder={placeholder}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={disabled}
        size="small"
        autoFocus={false}
      />

      {/* Search Results */}
      <Collapse in={isSearchActive && filteredChannels.length > 0}>
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            maxHeight: 400,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <List dense sx={{ p: 0 }}>
            {filteredChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                onClick={handleChannelSelect}
                compact
                sx={{
                  '& .MuiListItemButton-root': {
                    margin: 0,
                    borderRadius: 0,
                    '&:not(:last-child)': {
                      borderBottom: '1px solid',
                      borderBottomColor: 'divider',
                    },
                  },
                }}
              />
            ))}
          </List>
        </Paper>
      </Collapse>

      {/* No Results Message */}
      <Collapse in={isSearchActive && filteredChannels.length === 0 && searchQuery.length > 0}>
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No channels found for "{searchQuery}"
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default SearchBar;