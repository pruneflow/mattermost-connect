import React, { useState, useMemo } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemIcon, 
  Typography, 
  Divider, 
  CircularProgress, 
  InputBase, 
  IconButton, 
  Collapse,
  Paper
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Public as PublicIcon, 
  Lock as LockIcon, 
  Person as PersonIcon, 
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AlternateEmail as MentionsIcon
} from '@mui/icons-material';
import { useChannels } from '../../hooks/useChannels';
import { Channel } from '../../api/types';
import ChannelTypingIndicator from '../common/ChannelTypingIndicator';

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
  
  // État des sections dépliées (tout est déplié par défaut)
  const [publicExpanded, setPublicExpanded] = useState(true);
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [directExpanded, setDirectExpanded] = useState(true);
  const [groupExpanded, setGroupExpanded] = useState(false);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Filtrer tous les canaux en fonction du terme de recherche
  const filteredChannels = useMemo(() => {
    if (!searchTerm) {
      // Pas de filtrage en dehors de la recherche, on utilise les listes déjà catégorisées
      return {
        publicChannels,
        privateChannels,
        directChannels,
        groupChannels
      };
    }

    // Filtrer les canaux par le terme de recherche
    const filterBySearchTerm = (channel: Channel) =>
      channel.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Retourner les canaux filtrés par catégorie
    return {
      publicChannels: publicChannels.filter(filterBySearchTerm),
      privateChannels: privateChannels.filter(filterBySearchTerm),
      directChannels: directChannels.filter(filterBySearchTerm),
      groupChannels: groupChannels.filter(filterBySearchTerm)
    };
  }, [channels, publicChannels, privateChannels, directChannels, groupChannels, searchTerm]);

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

  // Fonction pour créer un en-tête de section
  const renderSectionHeader = (
    title: string, 
    count: number, 
    expanded: boolean, 
    setExpanded: (value: boolean) => void,
    icon: React.ReactNode
  ) => (
    <Box 
      onClick={() => setExpanded(!expanded)} 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        pl: 2, 
        cursor: 'pointer',
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: 'action.hover',
        }
      }}
    >
      {icon}
      <Typography 
        variant="subtitle2" 
        sx={{ 
          ml: 1, 
          fontWeight: 600, 
          flexGrow: 1,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          opacity: 0.9
        }}
      >
        {title} ({count})
      </Typography>
      {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
    </Box>
  );

  // Fonctions pour afficher les canaux d'une catégorie
  const renderChannelItem = (channel: Channel) => (
    <ListItem key={channel.id} disablePadding dense>
      <ListItemButton
        selected={selectedChannelId === channel.id}
        onClick={() => handleChannelClick(channel)}
        sx={{ 
          py: 0.75,
          borderRadius: 1,
          mx: 0.5,
          '&.Mui-selected': {
            bgcolor: 'action.selected',
            '&:hover': {
              bgcolor: 'action.selected',
            }
          }
        }}
      >
      
        <ListItemText 
          primary={getChannelDisplayName(channel)} 
          slotProps={ {
            primary: {
              sx: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.9rem'
              }}}}
        />
        <ChannelTypingIndicator channelId={channel.id} />
      </ListItemButton>
    </ListItem>
  );

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        width: '100%', 
        maxWidth: 360, 
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: (theme) => theme.palette.mode === 'light' 
          ? '0 0 10px rgba(0,0,0,0.05)' 
          : 'none'
      }}
    >
      {/* Barre de recherche */}
      <Box 
        sx={{ 
          p: 1, 
          display: 'flex', 
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <InputBase
          placeholder="Search channels..."
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ 
            ml: 1, 
            flex: 1,
            fontSize: '0.9rem'
          }}
          inputProps={{ 'aria-label': 'search channels' }}
        />
        <IconButton 
          size="small" 
          sx={{ p: '8px' }} 
          aria-label="search"
        >
          <SearchIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* État de chargement */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* État absence de résultats */}
      {!isLoading && 
        filteredChannels.publicChannels.length === 0 && 
        filteredChannels.privateChannels.length === 0 && 
        filteredChannels.directChannels.length === 0 && 
        filteredChannels.groupChannels.length === 0 && 
        searchTerm && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No channels found
          </Typography>
        </Box>
      )}

      {/* Container principal avec scroll */}
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        {/* Section canaux publics */}
        {filteredChannels.publicChannels.length > 0 && (
          <>
            {renderSectionHeader(
              'Public Channels', 
              filteredChannels.publicChannels.length, 
              publicExpanded, 
              setPublicExpanded,
              <PublicIcon fontSize="small" color="primary" />
            )}
            <Collapse in={publicExpanded}>
              <List dense disablePadding>
                {filteredChannels.publicChannels.map(renderChannelItem)}
              </List>
            </Collapse>
          </>
        )}

        {/* Section canaux privés */}
        {filteredChannels.privateChannels.length > 0 && (
          <>
            {renderSectionHeader(
              'Private Channels', 
              filteredChannels.privateChannels.length, 
              privateExpanded, 
              setPrivateExpanded,
              <LockIcon fontSize="small" color="primary" />
            )}
            <Collapse in={privateExpanded}>
              <List dense disablePadding>
                {filteredChannels.privateChannels.map(renderChannelItem)}
              </List>
            </Collapse>
          </>
        )}

        {/* Section messages directs */}
        {filteredChannels.directChannels.length > 0 && (
          <>
            {renderSectionHeader(
              'Direct Messages', 
              filteredChannels.directChannels.length, 
              directExpanded, 
              setDirectExpanded,
              <PersonIcon fontSize="small" color="primary" />
            )}
            <Collapse in={directExpanded}>
              <List dense disablePadding>
                {filteredChannels.directChannels.map(renderChannelItem)}
              </List>
            </Collapse>
          </>
        )}

        {/* Section groupes */}
        {filteredChannels.groupChannels.length > 0 && (
          <>
            {renderSectionHeader(
              'Group Messages', 
              filteredChannels.groupChannels.length, 
              groupExpanded, 
              setGroupExpanded,
              <GroupIcon fontSize="small" color="primary" />
            )}
            <Collapse in={groupExpanded}>
              <List dense disablePadding>
                {filteredChannels.groupChannels.map(renderChannelItem)}
              </List>
            </Collapse>
          </>
        )}
      </Box>
    </Paper>
  );
}

export default ChannelList;