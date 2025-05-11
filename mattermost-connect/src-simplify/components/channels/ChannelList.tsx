import React, { useState, useMemo } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Typography, Divider, CircularProgress, InputBase, IconButton } from '@mui/material';
import { Search as SearchIcon, Public as PublicIcon, Lock as LockIcon, Person as PersonIcon, Group as GroupIcon } from '@mui/icons-material';
import { useChannels } from '../../hooks/useChannels';
import { Channel } from '../../api/types';

export interface ChannelListProps {
  teamId: string;
  onSelectChannel?: (channel: Channel) => void;
  selectedChannelId?: string;
}

export function ChannelList({ teamId, onSelectChannel, selectedChannelId }: ChannelListProps) {
  // Use our data hook
  const { 
    channels, 
    publicChannels, 
    privateChannels,
    directChannels,
    groupChannels,
    isLoading,
    getDirectChannelInfo
  } = useChannels(teamId);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'public' | 'private' | 'direct' | 'group'>('public');

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Filter channels based on search term
  const filteredChannels = useMemo(() => {
    if (!searchTerm) {
      // When not searching, return the category-specific channels
      switch (selectedCategoryTab) {
        case 'public': return publicChannels;
        case 'private': return privateChannels;
        case 'direct': return directChannels;
        case 'group': return groupChannels;
        default: return publicChannels;
      }
    }

    // When searching, search across all channels
    return channels.filter(channel => 
      channel.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [channels, publicChannels, privateChannels, directChannels, groupChannels, searchTerm, selectedCategoryTab]);

  // Handle channel selection
  const handleChannelClick = (channel: Channel) => {
    if (onSelectChannel) {
      onSelectChannel(channel);
    }
  };

  // Get channel display name (handling direct channels specially)
  const getChannelDisplayName = (channel: Channel): string => {
    if (channel.type === 'D') {
      const directInfo = getDirectChannelInfo(channel.id);
      if (directInfo) {
        return directInfo.displayName;
      }
    }
    
    return channel.display_name || channel.name;
  };

  // Get icon for channel type
  const getChannelIcon = (channel: Channel) => {
    switch (channel.type) {
      case 'O': return <PublicIcon fontSize="small" />;
      case 'P': return <LockIcon fontSize="small" />;
      case 'D': return <PersonIcon fontSize="small" />;
      case 'G': return <GroupIcon fontSize="small" />;
      default: return <PublicIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
      {/* Search input */}
      <Box sx={{ p: 1, display: 'flex' }}>
        <InputBase
          placeholder="Search channels..."
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ ml: 1, flex: 1 }}
          inputProps={{ 'aria-label': 'search channels' }}
        />
        <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Category tabs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1 }}>
        <IconButton 
          color={selectedCategoryTab === 'public' ? 'primary' : 'default'}
          onClick={() => setSelectedCategoryTab('public')}
        >
          <PublicIcon />
        </IconButton>
        <IconButton 
          color={selectedCategoryTab === 'private' ? 'primary' : 'default'}
          onClick={() => setSelectedCategoryTab('private')}
        >
          <LockIcon />
        </IconButton>
        <IconButton 
          color={selectedCategoryTab === 'direct' ? 'primary' : 'default'}
          onClick={() => setSelectedCategoryTab('direct')}
        >
          <PersonIcon />
        </IconButton>
        <IconButton 
          color={selectedCategoryTab === 'group' ? 'primary' : 'default'}
          onClick={() => setSelectedCategoryTab('group')}
        >
          <GroupIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* No results state */}
      {!isLoading && filteredChannels.length === 0 && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No channels found
          </Typography>
        </Box>
      )}

      {/* Channel list */}
      <List sx={{ pt: 0 }}>
        {filteredChannels.map(channel => (
          <ListItem key={channel.id} disablePadding>
            <ListItemButton
              selected={selectedChannelId === channel.id}
              onClick={() => handleChannelClick(channel)}
            >
              <ListItemIcon>{getChannelIcon(channel)}</ListItemIcon>
              <ListItemText primary={getChannelDisplayName(channel)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default ChannelList;