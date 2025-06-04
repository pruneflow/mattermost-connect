import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  SxProps,
  Theme,
} from '@mui/material';
import { Add as AddIcon, MoreHoriz as MoreIcon } from '@mui/icons-material';
import { TeamItem } from '../molecules/TeamItem';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeams } from '../../store/selectors';
import { useTeams } from '../../hooks/useTeams';
import { useTeamCreation } from '../../hooks/useTeamCreation';
import { usePermissions } from '../../hooks/usePermissions';
import type { Team } from '../../api/types';

// Constants
const TEAM_TAB_WIDTH = 180;

export interface TeamTabsProps {
  onTeamSelect: (team: Team) => void;
  onCreate: () => void
  showCreateButton?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Team tabs that handle overflow with a dropdown menu
 */
export const TeamTabs: React.FC<TeamTabsProps> = ({
  onTeamSelect,
  showCreateButton = true,
  onCreate,
  sx,
}) => {
  const [overflowMenuAnchor, setOverflowMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleTeamsCount, setVisibleTeamsCount] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  // Get data
  const teams = useAppSelector(selectTeams);
  const { currentTeamId } = useTeams();
  const { canCreateTeam } = usePermissions();
  
  // Calculate how many teams can fit using real measurements
  useEffect(() => {
    const calculateVisible = () => {
      if (!containerRef.current || teams.length === 0) return;
      
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      
      // Reserve space for overflow menu and create button
      const overflowMenuWidth = 48;
      const createButtonWidth = showCreateButton ? 48 : 0;
      const reservedWidth = overflowMenuWidth + createButtonWidth + 16; // +16 for margins
      
      let totalTabsWidth = 0;
      let visibleCount = 0;
      
      // Measure actual tab widths
      for (let i = 0; i < teams.length; i++) {
        const tabElement = tabsRef.current[i];
        if (tabElement) {
          const tabWidth = tabElement.offsetWidth;
          if (totalTabsWidth + tabWidth + reservedWidth <= containerWidth) {
            totalTabsWidth += tabWidth;
            visibleCount++;
          } else {
            break;
          }
        } else {
          // Fallback to estimation if tab not yet rendered
          const estimatedWidth = 120;
          if (totalTabsWidth + estimatedWidth + reservedWidth <= containerWidth) {
            totalTabsWidth += estimatedWidth;
            visibleCount++;
          } else {
            break;
          }
        }
      }
      
      setVisibleTeamsCount(Math.max(1, visibleCount));
    };
    
    // Small delay to ensure tabs are rendered
    const timer = setTimeout(calculateVisible, 10);
    
    const handleResize = () => {
      const timer = setTimeout(calculateVisible, 10);
      return () => clearTimeout(timer);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [teams.length, showCreateButton]);
  
  // Stable ref handler
  const setTabRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    tabsRef.current[index] = el;
  }, []);

  // Stable event handlers - const en dehors du render
  const handleOverflowMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setOverflowMenuAnchor(event.currentTarget);
  }, []);
  
  const handleOverflowMenuClose = useCallback(() => {
    setOverflowMenuAnchor(null);
  }, []);
  
  const handleCreateTeam = useCallback(() => {
    onCreate();
    handleOverflowMenuClose();
  }, [handleOverflowMenuClose]);
  
  // Méthode const qui prend une team en paramètre
  const handleTeamSelect = useCallback((team: Team) => {
    if (onTeamSelect) {
      onTeamSelect(team);
    }
    handleOverflowMenuClose();
  }, [onTeamSelect, handleOverflowMenuClose]);
  
  // Split teams
  const visibleTeams = teams.slice(0, visibleTeamsCount);
  const overflowTeams = teams.slice(visibleTeamsCount);
  const hasOverflow = overflowTeams.length > 0;
  const shouldShowCreateButton = showCreateButton && canCreateTeam();
  
  return (
    <>
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          overflow: 'hidden',
          ...sx,
        }}
      >
        {/* Visible Teams */}
        {visibleTeams.map((team, index) => {
          const handleClick = () => handleTeamSelect(team);
          return (
            <Box
              key={team.id}
              ref={setTabRef(index)}
            >
              <TeamItem
                team={team}
                layout="tabs"
                isActive={currentTeamId === team.id}
                onClick={handleClick}
              />
            </Box>
          );
        })}
        
        {/* Spacer to push overflow menu to the right */}
        <Box sx={{ flex: 1 }} />
        
        {/* Overflow Menu Button - aligned to the right */}
        {hasOverflow && (
          <IconButton
            size="small"
            onClick={handleOverflowMenuOpen}
            sx={{
              mx: 1,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <MoreIcon />
          </IconButton>
        )}
        
        {/* Create Team Button */}
        {shouldShowCreateButton && (
          <IconButton
            size="small"
            onClick={handleCreateTeam}
            sx={{
              mx: 1,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <AddIcon />
          </IconButton>
        )}
      </Box>
      
      {/* Overflow Menu */}
      <Menu
        anchorEl={overflowMenuAnchor}
        open={Boolean(overflowMenuAnchor)}
        onClose={handleOverflowMenuClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {/* Overflow Teams */}
        {overflowTeams.map((team) => {
          // Const fonction pour chaque team
          const handleClick = () => handleTeamSelect(team);
          return (
            <MenuItem
              key={team.id}
              onClick={handleClick}
              selected={currentTeamId === team.id}
            >
              {team.display_name || team.name}
            </MenuItem>
          );
        })}
        
        {/* Create Team in Menu */}
        {shouldShowCreateButton && hasOverflow && (
          <MenuItem onClick={handleCreateTeam}>
            <AddIcon sx={{ mr: 1 }} />
            Create New Team
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default TeamTabs;