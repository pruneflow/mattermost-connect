import React, { useState, useCallback } from 'react';
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
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { getTeamInitials, getTeamColor, filterTeams } from '../../utils/teamUtils';
import { usePermissions, useErrorHandler, useNavigation, useTeamCreation } from '../../hooks';
import { CreateTeamDialog, type CreateTeamData } from './CreateTeamDialog';
import type { Team } from '../../api/types';

export interface TeamListProps {
  teams: Team[];
  selectedTeamId?: string;
  onTeamSelect?: (team: Team) => void;
  showCreateButton?: boolean; // default: true
  layout?: 'vertical' | 'horizontal' | 'tabs';
  loading?: boolean;
  error?: string | null;
}

export const TeamList: React.FC<TeamListProps> = ({
  teams,
  selectedTeamId,
  onTeamSelect,
  showCreateButton = true,
  layout = 'vertical',
  loading = false,
  error = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeamForMenu, setSelectedTeamForMenu] = useState<Team | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { canCreateTeam } = usePermissions();
  const { handleError } = useErrorHandler();
  const { navigateToTeam } = useNavigation();
  const { createTeam } = useTeamCreation();

  const filteredTeams = filterTeams(teams, searchTerm);
  const handleTeamClick = (team: Team) => {
    try {
      // Update navigation state
      navigateToTeam(team.id);
      
      if (onTeamSelect) {
        onTeamSelect(team);
      }
    } catch (error) {
      handleError(error, {
        component: 'TeamList',
        action: 'selectTeam',
        showToast: true
      });
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, team: Team) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedTeamForMenu(team);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedTeamForMenu(null);
  };

  const handleCreateTeamClick = () => {
    setCreateModalOpen(true);
  };

  const handleCreateTeam = async (teamData: CreateTeamData) => {
    await createTeam(teamData);
    setCreateModalOpen(false);
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
  };

  // Show create button if: props allows it AND user has permissions
  const shouldShowCreateButton = showCreateButton && canCreateTeam();

  if (loading) {
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
          bgcolor: 'primary.main',
          minHeight: 48,
          // Amélioration scroll mobile
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': {
            display: 'none', // Chrome/Safari
          },
          // Assurer que ça ne dépasse pas
          maxWidth: '100vw',
          boxSizing: 'border-box',
        }}
      >
        {filteredTeams.map((team) => (
          <Box
            key={team.id}
            sx={{
              px: { xs: 1.5, sm: 3 },
              py: 1.5,
              minWidth: 'fit-content',
              display: 'flex',
              alignItems: 'center',
              color: 'common.white',
              cursor: 'pointer',
              borderBottom:
                selectedTeamId === team.id ? '3px solid' : '3px solid transparent',
              borderColor: selectedTeamId === team.id ? 'common.white' : 'transparent',
              fontWeight: selectedTeamId === team.id ? 'bold' : 'normal',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              bgcolor:
                selectedTeamId === team.id
                  ? 'action.selected'
                  : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
              },
              // Assurer que le texte ne wrap pas
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onClick={() => handleTeamClick(team)}
          >
            {team.display_name || team.name}
          </Box>
        ))}

        {shouldShowCreateButton && (
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              color: 'common.white',
              cursor: 'pointer',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            onClick={handleCreateTeamClick}
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
        {filteredTeams.map((team) => (
          <Box key={team.id} sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}>
            <Tooltip title={team.display_name}>
              <Avatar
                sx={{
                  bgcolor: getTeamColor(team.name),
                  cursor: 'pointer',
                  border: selectedTeamId === team.id ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                }}
                onClick={() => handleTeamClick(team)}
              >
                {getTeamInitials(team)}
              </Avatar>
            </Tooltip>
          </Box>
        ))}

        {shouldShowCreateButton && (
          <Tooltip title="Create new team">
            <Avatar
              sx={{
                bgcolor: 'action.selected',
                m: 0.5,
                cursor: 'pointer',
              }}
              onClick={handleCreateTeamClick}
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
        {filteredTeams.map((team) => (
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
              sx={{ width: '100%' }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: getTeamColor(team.name) }}>
                  {getTeamInitials(team)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={team.display_name}
                secondary={team.description || 'No description'}
                primaryTypographyProps={{
                  noWrap: true,
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                }}
                sx={{ minWidth: 0 }}
              />
            </ListItemButton>
          </ListItem>
        ))}

        {/* Create team item */}
        {shouldShowCreateButton && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleCreateTeamClick}>
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

      {/* Create team modal */}
      <CreateTeamDialog
        open={createModalOpen}
        onClose={handleCloseModal}
        onCreateTeam={handleCreateTeam}
      />
    </Box>
  );
};

export default TeamList;