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
  Paper,
  Tooltip
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
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import { Channel } from '../../api/types';
import ChannelIndicators from '../common/ChannelIndicators';
import StatusIndicator from '../common/StatusIndicator';

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
  
  // Get unread counts for channels in this team
  const { getChannelUnreadCount } = useUnreadCounts(teamId);
  
  // Status pour le tri des canaux directs
  const statusOrder = { online: 0, away: 1, dnd: 2, offline: 3 };

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

  // Filtrer les canaux en fonction du terme de recherche
  const filteredChannels = useMemo(() => {
    // Filtrer par terme de recherche si nécessaire
    let filteredPublic = publicChannels;
    let filteredPrivate = privateChannels;
    let filteredDirect = directChannels;
    let filteredGroup = groupChannels;
    
    if (searchTerm) {
      // Fonction de filtrage par terme de recherche
      const filterBySearchTerm = (channel: Channel) => {
        const displayName = getChannelDisplayName(channel);
        return displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      // Appliquer le filtre
      filteredPublic = publicChannels.filter(filterBySearchTerm);
      filteredPrivate = privateChannels.filter(filterBySearchTerm);
      filteredDirect = directChannels.filter(filterBySearchTerm);
      filteredGroup = groupChannels.filter(filterBySearchTerm);
    }
    
    // Retourner les canaux filtrés par catégorie (sans tri par statut)
    return {
      publicChannels: filteredPublic,
      privateChannels: filteredPrivate,
      directChannels: filteredDirect,
      groupChannels: filteredGroup
    };
  }, [publicChannels, privateChannels, directChannels, groupChannels, searchTerm]);

  // Handle channel selection
  const handleChannelClick = (channel: Channel) => {
    if (onSelectChannel) {
      onSelectChannel(channel);
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
        p: 1.2, 
        pl: 2, 
        cursor: 'pointer',
        bgcolor: theme => theme.palette.mode === 'light' 
          ? 'rgba(0,0,0,0.03)' 
          : 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: theme => theme.palette.mode === 'light' 
            ? 'rgba(0,0,0,0.06)' 
            : 'rgba(255,255,255,0.05)',
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
          letterSpacing: '0.8px',
          opacity: 0.9,
          color: theme => theme.palette.mode === 'light' 
            ? theme.palette.primary.dark 
            : theme.palette.primary.light
        }}
      >
        {title} ({count})
      </Typography>
      {expanded ? <ExpandLessIcon fontSize="small" color="primary" /> : <ExpandMoreIcon fontSize="small" color="primary" />}
    </Box>
  );

  // Fonctions pour afficher les canaux d'une catégorie
  const renderChannelItem = (channel: Channel) => {
    // Récupérer les infos spécifiques pour les canaux directs
    const isDirectMsg = channel.type === 'D';
    const directInfo = isDirectMsg ? getDirectChannelInfo(channel.id) : null;
    const otherUserId = directInfo?.otherUserId;
    
    // Get unread count for this channel
    const unreadCount = getChannelUnreadCount(channel.id);
    
    return (
      <ListItem key={channel.id} disablePadding dense>
        <ListItemButton
          selected={selectedChannelId === channel.id}
          onClick={() => handleChannelClick(channel)}
          sx={{ 
            py: 0.75,
            borderRadius: 1,
            mx: 0.5,
            pl: isDirectMsg ? 1 : 2, // Moins de padding à gauche pour les DM pour l'indicateur de statut
            width: '100%',
            '&.Mui-selected': {
              bgcolor: 'action.selected',
              '&:hover': {
                bgcolor: 'action.selected',
              }
            },
            // Ajout d'effet de survol amélioré
            '&:hover': {
              backgroundColor: theme => 
                theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.04)' 
                  : 'rgba(255, 255, 255, 0.08)'
            },
            transition: 'background-color 0.2s'
          }}
        >
          {/* Indicateur de statut uniquement pour les messages directs */}
          {isDirectMsg && otherUserId && (
            <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
              <StatusIndicator userId={otherUserId} />
            </Box>
          )}
          
          <ListItemText 
            primary={getChannelDisplayName(channel)} 
            slotProps={{
              primary: {
                sx: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.9rem',
                  fontWeight: unreadCount > 0 ? 600 : 400, // Use our unread count instead
                  color: theme => 
                    unreadCount > 0
                      ? theme.palette.text.primary 
                      : theme.palette.text.secondary
                }
              }
            }}
          />
          
          <ChannelIndicators channelId={channel.id} unreadCount={unreadCount} />
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        width: '100%', 
        maxWidth: 360, 
        bgcolor: theme => theme.palette.mode === 'light' 
            ? 'rgba(255,255,255,0.9)' 
            : 'rgba(30,35,40,0.9)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: theme => theme.palette.mode === 'light' 
          ? '0 4px 20px rgba(0,0,0,0.08)' 
          : '0 4px 20px rgba(0,0,0,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
        border: theme => `1px solid ${theme.palette.mode === 'light' 
          ? 'rgba(0,0,0,0.06)' 
          : 'rgba(255,255,255,0.06)'}`
      }}
    >
      {/* Barre de recherche */}
      <Box 
        sx={{ 
          p: 1.2, 
          display: 'flex', 
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme => theme.palette.mode === 'light' 
            ? 'rgba(0,0,0,0.02)'
            : 'rgba(0,0,0,0.2)'
        }}
      >
        <InputBase
          placeholder="Search channels..."
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ 
            ml: 1, 
            flex: 1,
            fontSize: '0.9rem',
            '& input': {
              transition: 'all 0.2s',
              '&:focus': {
                color: 'primary.main'
              }
            }
          }}
          inputProps={{ 'aria-label': 'search channels' }}
        />
        <IconButton 
          size="small" 
          sx={{ 
            p: '8px',
            color: 'primary.main',
            opacity: 0.7,
            '&:hover': {
              opacity: 1,
              bgcolor: 'action.hover'
            },
            transition: 'all 0.2s'
          }} 
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
              <PublicIcon fontSize="small" sx={{ color: '#4caf50' }} />
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
              <LockIcon fontSize="small" sx={{ color: '#ff9800' }} />
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
              <PersonIcon fontSize="small" sx={{ color: '#2196f3' }} />
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
              <GroupIcon fontSize="small" sx={{ color: '#9c27b0' }} />
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