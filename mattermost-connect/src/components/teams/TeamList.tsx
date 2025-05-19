import React, { useState, useMemo } from 'react';
import { 
  Box, 
  List, 
  Avatar, 
  Tooltip, 
  CircularProgress, 
  Typography,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  InputBase,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useTeams } from '../../hooks/useTeams';
import { Team } from '../../api/types';

// Initial for team avatar
function getTeamInitials(team: Team): string {
  if (!team.display_name) return '?';

  const words = team.display_name.split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

// Generate color based on team name
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  
  return color;
}

export interface TeamListProps {
  onSelectTeam?: (team: Team) => void;
  selectedTeamId?: string;
  onCreateTeam?: () => void;
  layout?: 'vertical' | 'horizontal' | 'tabs';
}

export function TeamList({ 
  onSelectTeam, 
  selectedTeamId, 
  onCreateTeam,
  layout = 'vertical' 
}: TeamListProps) {
  // Get teams
  const { teams, isLoading, error } = useTeams();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeamForMenu, setSelectedTeamForMenu] = useState<Team | null>(null);
  
  // Handle team select
  const handleTeamClick = (team: Team) => {
    if (onSelectTeam) {
      onSelectTeam(team);
    }
  };
  
  // Handle menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, team: Team) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedTeamForMenu(team);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedTeamForMenu(null);
  };
  
  // Handle search
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  // Filter teams by search term
  const filteredTeams = useMemo(() => {
    if (!searchTerm) {
      return teams;
    }
    
    const term = searchTerm.toLowerCase();
    return teams.filter(team => 
      team.display_name.toLowerCase().includes(term) || 
      team.name.toLowerCase().includes(term)
    );
  }, [teams, searchTerm]);
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error" variant="body2">
          Error loading teams
        </Typography>
      </Box>
    );
  }
  
  // Render as tabs (for header tabs)
  if (layout === 'tabs') {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          display: 'flex', 
          overflowX: 'auto',
          bgcolor: 'primary.dark',
          minHeight: 48
        }}
      >
        {filteredTeams.map(team => (
          <Box
            key={team.id}
            sx={{
              px: 3,
              py: 1.5,
              minWidth: 'fit-content',
              textAlign: 'center',
              color: 'white',
              cursor: 'pointer',
              borderBottom: selectedTeamId === team.id ? '3px solid' : '3px solid transparent',
              fontWeight: selectedTeamId === team.id ? 'bold' : 'normal',
              bgcolor: selectedTeamId === team.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
              }
            }}
            onClick={() => handleTeamClick(team)}
          >
            {team.display_name || team.name}
          </Box>
        ))}
        
        {onCreateTeam && (
          <Box
            sx={{
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              color: 'white',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
              }
            }}
            onClick={onCreateTeam}
          >
            <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
            Add Team
          </Box>
        )}
      </Box>
    );
  }
  
  // Render horizontal layout (for top navigation)
  if (layout === 'horizontal') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1, overflowX: 'auto' }}>
        {filteredTeams.map(team => (
          <Tooltip key={team.id} title={team.display_name}>
            <Avatar 
              sx={{ 
                bgcolor: stringToColor(team.name),
                m: 0.5,
                cursor: 'pointer',
                border: selectedTeamId === team.id ? '2px solid' : 'none',
                borderColor: 'primary.main'
              }}
              onClick={() => handleTeamClick(team)}
            >
              {getTeamInitials(team)}
            </Avatar>
          </Tooltip>
        ))}
        
        {onCreateTeam && (
          <Tooltip title="Create new team">
            <Avatar 
              sx={{ 
                bgcolor: 'action.selected',
                m: 0.5,
                cursor: 'pointer'
              }}
              onClick={onCreateTeam}
            >
              <AddIcon />
            </Avatar>
          </Tooltip>
        )}
      </Box>
    );
  }
  
  // Render vertical layout (for sidebar)
  return (
    <Box sx={{ width: '100%' }}>
      {/* Search input */}
      {teams.length > 5 && (
        <>
          <Box sx={{ p: 1, display: 'flex' }}>
            <InputBase
              placeholder="Search teams..."
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ ml: 1, flex: 1 }}
              inputProps={{ 'aria-label': 'search teams' }}
            />
            <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
              <SearchIcon />
            </IconButton>
          </Box>
          <Divider />
        </>
      )}
      
      {/* Teams list */}
      <List sx={{ width: '100%' }}>
        {filteredTeams.map(team => (
          <ListItem 
            key={team.id} 
            disablePadding 
            secondaryAction={
              <IconButton 
                edge="end" 
                aria-label="team options"
                onClick={(e) => handleMenuOpen(e, team)}
              >
                <MoreVertIcon />
              </IconButton>
            }
          >
            <ListItemButton 
              selected={selectedTeamId === team.id}
              onClick={() => handleTeamClick(team)}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: stringToColor(team.name) }}>
                  {getTeamInitials(team)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={team.display_name} 
                secondary={team.description || 'No description'}
                primaryTypographyProps={{
                  noWrap: true,
                  style: { maxWidth: '180px' }
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  style: { maxWidth: '180px' }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* Create team item */}
        {onCreateTeam && (
          <ListItem disablePadding>
            <ListItemButton onClick={onCreateTeam}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'action.selected' }}>
                  <AddIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Create New Team" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
      
      {/* Team options menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleMenuClose}>Team Settings</MenuItem>
        <MenuItem onClick={handleMenuClose}>Manage Members</MenuItem>
        <MenuItem onClick={handleMenuClose}>View Team Info</MenuItem>
      </Menu>
    </Box>
  );
}

export default TeamList;