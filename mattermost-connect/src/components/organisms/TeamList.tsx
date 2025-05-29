import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  List,
  Tooltip,
  Typography,
  Divider,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { filterTeams } from '../../utils/teamUtils';
import { usePermissions, useErrorHandler, useNavigation, useTeamCreation, useUnreadCounts, useTeams } from '../../hooks';
import { CreateTeamDialog, type CreateTeamData } from './CreateTeamDialog';
import { TeamItemSkeleton, ListSkeleton } from '../atoms';
import { TeamItem, CreateTeamButton } from '../molecules';
import type { Team } from '../../api/types';

export interface TeamListProps {
  selectedTeamId?: string;
  onTeamSelect?: (team: Team) => void;
  showCreateButton?: boolean; // default: true
  layout?: 'vertical' | 'horizontal' | 'tabs';
}

export const TeamList: React.FC<TeamListProps> = ({
  selectedTeamId,
  onTeamSelect,
  showCreateButton = true,
  layout = 'vertical',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeamForMenu, setSelectedTeamForMenu] = useState<Team | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Hooks
  const { canCreateTeam } = usePermissions();
  const { handleError } = useErrorHandler();
  const { navigateToTeam } = useNavigation();
  const { createTeam } = useTeamCreation();
  const { 
    getTeamUnreadCount, 
    getTeamMentionCount, 
    loadUnreadCounts 
  } = useUnreadCounts();
  
  // Teams data from hook
  const {
    teams: teamsById,
    loadTeams,
    isLoadingTeams,
    teamsError,
  } = useTeams();

  // Convert teams object to array
  const teams = Object.values(teamsById);

  // Load unread counts when teams are available (once)
  useEffect(() => {
    if (teams.length > 0) {
      loadUnreadCounts();
    }
  }, [teams.length]); // Removed loadUnreadCounts to prevent re-calls

  const filteredTeams = filterTeams(teams, searchTerm);

  // Stable event handlers - const outside render
  const handleTeamClick = useCallback((team: Team) => {
    try {
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
  }, [navigateToTeam, onTeamSelect, handleError]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, team: Team) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedTeamForMenu(team);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
    setSelectedTeamForMenu(null);
  }, []);

  const handleCreateTeamClick = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCreateTeam = useCallback(async (teamData: CreateTeamData) => {
    await createTeam(teamData);
    setCreateModalOpen(false);
  }, [createTeam]);

  const handleCloseModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  // Show create button if: props allows it AND user has permissions
  const shouldShowCreateButton = showCreateButton && canCreateTeam();

  const handleRetry = useCallback(() => {
    loadTeams(true); // Force refresh
  }, [loadTeams]);

  const getSkeleton = useCallback(() => {
    if (layout === 'vertical') {
      return <ListSkeleton count={5} showAvatar={true} />;
    } else if (layout === 'horizontal') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1, gap: 1 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <TeamItemSkeleton key={index} />
          ))}
        </Box>
      );
    } else { // tabs
      return (
        <Box sx={{ display: 'flex', overflowX: 'auto', p: 1, gap: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <TeamItemSkeleton key={index} />
          ))}
        </Box>
      );
    }
  }, [layout]);

  // Show loading
  if (isLoadingTeams) {
    return getSkeleton();
  }

  // Show error
  if (teamsError) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error" variant="body2">
          {teamsError}
        </Typography>
        <Typography
          variant="body2"
          sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'primary.main', mt: 1 }}
          onClick={handleRetry}
        >
          Try again
        </Typography>
      </Box>
    );
  }

  const renderTeamList = () => {
    // Tabs layout container (for header tabs)
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
          {filteredTeams.map((team) => {
            const unreadCount = getTeamUnreadCount(team.id);
            const mentionCount = getTeamMentionCount(team.id);
            
            return (
              <TeamItem
                key={team.id}
                team={team}
                layout="tabs"
                isActive={selectedTeamId === team.id}
                unreadCount={unreadCount}
                mentionCount={mentionCount}
                onClick={() => handleTeamClick(team)}
              />
            );
          })}

          {shouldShowCreateButton && (
            <CreateTeamButton
              layout="tabs"
              onClick={handleCreateTeamClick}
            />
          )}
        </Box>
      );
    }

    // Horizontal layout container (for top navigation)
    if (layout === 'horizontal') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1, overflowX: 'auto' }}>
          {filteredTeams.map((team) => {
            const unreadCount = getTeamUnreadCount(team.id);
            const mentionCount = getTeamMentionCount(team.id);
            
            return (
              <TeamItem
                key={team.id}
                team={team}
                layout="horizontal"
                isActive={selectedTeamId === team.id}
                unreadCount={unreadCount}
                mentionCount={mentionCount}
                onClick={() => handleTeamClick(team)}
              />
            );
          })}

          {shouldShowCreateButton && (
            <Tooltip title="Create new team">
              <CreateTeamButton
                layout="horizontal"
                onClick={handleCreateTeamClick}
              />
            </Tooltip>
          )}
        </Box>
      );
    }

    // Vertical layout (for sidebar)
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
          {filteredTeams.map((team) => {
            const unreadCount = getTeamUnreadCount(team.id);
            const mentionCount = getTeamMentionCount(team.id);
            
            return (
              <TeamItem
                key={team.id}
                team={team}
                layout="vertical"
                isActive={selectedTeamId === team.id}
                unreadCount={unreadCount}
                mentionCount={mentionCount}
                onClick={() => handleTeamClick(team)}
                onMenuOpen={handleMenuOpen}
                showMenu={true}
              />
            );
          })}

          {/* Create team item */}
          {shouldShowCreateButton && (
            <CreateTeamButton
              layout="vertical"
              onClick={handleCreateTeamClick}
            />
          )}
        </List>
      </Box>
    );
  };

  return (
    <>
      {renderTeamList()}
      
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
    </>
  );
};

export default TeamList;