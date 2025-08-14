/**
 * Team tabs component with horizontal scrolling and auto-centering
 * Provides tab-style team navigation with smooth scrolling and active team centering
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  SxProps,
  Theme,
} from '@mui/material';
import { 
  Add as AddIcon, 
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon 
} from '@mui/icons-material';
import { TeamItem } from '../molecules/TeamItem';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeams } from '../../store/selectors';
import { useTeams } from '../../hooks/useTeams';
import { useTeamCreation } from '../../hooks/useTeamCreation';
import { canCreateTeam } from '../../services/permissionService';
import type { Team } from '../../api/types';

export interface TeamTabsProps {
  onTeamSelect: (team: Team) => void;
  onCreate: () => void;
  showCreateButton?: boolean;
  sx?: SxProps<Theme>;
  onOpenSettings?: (team: Team) => void;
  onOpenMembers?: (team: Team) => void;
  onOpenInvite?: (team: Team) => void;
  onOpenInfo?: (team: Team) => void;
  onLeaveTeam?: (team: Team) => void;
}

export const TeamTabs: React.FC<TeamTabsProps> = ({
  onTeamSelect,
  showCreateButton = true,
  onCreate,
  sx,
  onOpenSettings,
  onOpenMembers,
  onOpenInvite,
  onOpenInfo,
  onLeaveTeam,
}) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Get data
  const teams = useAppSelector(selectTeams);
  const { currentTeamId } = useTeams();
  
  // Check scroll position and update indicators
  const updateScrollIndicators = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for precision
  }, []);

  // Auto-scroll to active team when it changes
  const scrollToActiveTeam = useCallback(() => {
    if (!scrollContainerRef.current || !currentTeamId) return;
    
    const container = scrollContainerRef.current;
    const activeTeamElement = container.querySelector(`[data-team-id="${currentTeamId}"]`) as HTMLElement;
    
    if (activeTeamElement) {
      const containerRect = container.getBoundingClientRect();
      const teamRect = activeTeamElement.getBoundingClientRect();
      
      // Check if team is fully visible
      const isVisible = teamRect.left >= containerRect.left && teamRect.right <= containerRect.right;
      
      if (!isVisible) {
        // Scroll to center the team
        const scrollLeft = activeTeamElement.offsetLeft - (container.clientWidth / 2) + (activeTeamElement.offsetWidth / 2);
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth'
        });
      }
    }
  }, [currentTeamId]);

  // Update indicators on mount and team changes
  useEffect(() => {
    updateScrollIndicators();
    scrollToActiveTeam();
  }, [teams, updateScrollIndicators, scrollToActiveTeam]);
  
  // Scroll handlers
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    container.scrollBy({
      left: -200, // Scroll by ~1 tab width
      behavior: 'smooth'
    });
  }, []);

  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    container.scrollBy({
      left: 200, // Scroll by ~1 tab width
      behavior: 'smooth'
    });
  }, []);

  // Team selection handler
  const handleTeamSelect = useCallback((team: Team) => {
    if (onTeamSelect) {
      onTeamSelect(team);
    }
  }, [onTeamSelect]);

  // Create team handler
  const handleCreateTeam = useCallback(() => {
    onCreate();
  }, [onCreate]);
  
  const shouldShowCreateButton = showCreateButton && canCreateTeam();
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        ...sx,
      }}
    >
      {/* Left scroll indicator */}
      {canScrollLeft && (
        <IconButton
          size="small"
          onClick={scrollLeft}
          sx={{
            position: 'absolute',
            left: 0,
            zIndex: 2,
            bgcolor: 'background.paper',
            color: 'text.secondary',
            boxShadow: 1,
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      )}

      {/* Scrollable teams container */}
      <Box
        ref={scrollContainerRef}
        onScroll={updateScrollIndicators}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          flex: 1,
          ml: canScrollLeft ? 5 : 0,
          mr: canScrollRight ? 5 : 0,
          // Hide scrollbar but keep functionality
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {/* All Teams */}
        {teams.map((team) => {
          const handleClick = () => handleTeamSelect(team);
          const handleSettings = () => onOpenSettings?.(team);
          const handleMembers = () => onOpenMembers?.(team);
          const handleInvite = () => onOpenInvite?.(team);
          const handleInfo = () => onOpenInfo?.(team);
          const handleLeave = () => onLeaveTeam?.(team);
          return (
            <Box
              key={team.id}
              data-team-id={team.id}
              sx={{ flexShrink: 0 }}
            >
              <TeamItem
                team={team}
                layout="tabs"
                isActive={currentTeamId === team.id}
                onClick={handleClick}
                onOpenSettings={handleSettings}
                onOpenMembers={handleMembers}
                onOpenInvite={handleInvite}
                onOpenInfo={handleInfo}
                onLeaveTeam={handleLeave}
              />
            </Box>
          );
        })}

        {/* Create Team Button */}
        {shouldShowCreateButton && (
          <IconButton
            size="small"
            onClick={handleCreateTeam}
            sx={{
              mx: 1,
              color: 'text.secondary',
              flexShrink: 0,
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <AddIcon />
          </IconButton>
        )}
      </Box>

      {/* Right scroll indicator */}
      {canScrollRight && (
        <IconButton
          size="small"
          onClick={scrollRight}
          sx={{
            position: 'absolute',
            right: 0,
            zIndex: 2,
            bgcolor: 'background.paper',
            color: 'text.secondary',
            boxShadow: 1,
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}
    </Box>
  );
};

export default TeamTabs;