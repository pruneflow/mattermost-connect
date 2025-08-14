/**
 * Team item component with multiple layout variants and unread indicators
 * Supports vertical list, horizontal avatar, tabs, and compact sidebar displays
 */
import React from 'react';
import { 
  Box, 
  Avatar, 
  Tooltip,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Badge,
} from '@mui/material';
import { getTeamInitials, getTeamColor, getTeamIconUrl } from '../../utils/teamUtils';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeamUnreadData } from '../../store/selectors';
import { TeamMenu } from './TeamMenu';
import { UnreadBadge } from '../atoms/UnreadBadge';
import type { Team } from '../../api/types';

export interface TeamItemProps {
  team: Team;
  layout: 'vertical' | 'horizontal' | 'tabs';
  isActive?: boolean;
  onClick?: () => void;
  onOpenSettings?: (team: Team) => void;
  onOpenMembers?: (team: Team) => void;
  onOpenInvite?: (team: Team) => void;
  onOpenInfo?: (team: Team) => void;
  onLeaveTeam?: (team: Team) => void;
  showMenu?: boolean;
  compact?: boolean; // For icon-only display in sidebar
  className?: string;
  sx?: any;
}

export const TeamItem: React.FC<TeamItemProps> = ({
  team,
  layout,
  isActive = false,
  onClick,
  onOpenSettings,
  onOpenMembers,
  onOpenInvite,
  onOpenInfo,
  onLeaveTeam,
  showMenu = false,
  compact = false,
  className,
  sx
}) => {
  // Get unread data for this team
  const teamUnreadData = useAppSelector(selectTeamUnreadData(team.id));
  const unreadCount = teamUnreadData.msg_count;
  const mentionCount = teamUnreadData.mention_count;
  const hasUnreads = unreadCount > 0 || mentionCount > 0;

  // Handlers for TeamMenu (convert team param callbacks to no-param callbacks)
  const handleOpenSettings = React.useCallback(() => {
    onOpenSettings?.(team);
  }, [onOpenSettings, team]);

  const handleOpenMembers = React.useCallback(() => {
    onOpenMembers?.(team);
  }, [onOpenMembers, team]);

  const handleOpenInvite = React.useCallback(() => {
    onOpenInvite?.(team);
  }, [onOpenInvite, team]);

  const handleOpenInfo = React.useCallback(() => {
    onOpenInfo?.(team);
  }, [onOpenInfo, team]);

  const handleLeaveTeam = React.useCallback(() => {
    onLeaveTeam?.(team);
  }, [onLeaveTeam, team]);
  // Tabs layout (header tabs)
  if (layout === 'tabs') {
    return (
      <Box
        className={className}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          minWidth: 'fit-content',
          maxWidth: 200,
          display: 'flex',
          alignItems: 'center',
          color: isActive ? 'primary.main' : 'text.primary',
          borderBottom: isActive ? '3px solid' : '3px solid transparent',
          borderColor: isActive ? 'primary.main' : 'transparent',
          fontWeight: isActive ? 600 : 400,
          fontSize: { xs: '0.875rem', sm: '1rem' },
          bgcolor: 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
            color: 'primary.main',
            '& .team-menu-button': {
              opacity: 1,
            },
          },
          overflow: 'visible',
          flexShrink: 0,
          position: 'relative',
          gap: 1,
          transition: 'all 0.2s ease',
          ...sx
        }}
      >
        <Tooltip title={team.display_name || team.name} arrow>
          <Box
            sx={{
              cursor: 'pointer',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            onClick={onClick}
          >
            {team.display_name || team.name}
          </Box>
        </Tooltip>
        
        {/* Unread badge with smart priority logic */}
        <UnreadBadge 
          count={unreadCount} 
          mentions={mentionCount} 
          size="sm"
        />

        {/* Team Menu - appears on hover */}
        <Box
          className="team-menu-button"
          sx={{
            opacity: 0,
            transition: 'opacity 0.2s ease',
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          <TeamMenu 
            team={team} 
            size="small"
            onOpenSettings={handleOpenSettings}
            onOpenMembers={handleOpenMembers}
            onOpenInvite={handleOpenInvite}
            onOpenInfo={handleOpenInfo}
            onLeaveTeam={handleLeaveTeam}
          />
        </Box>
      </Box>
    );
  }

  // Horizontal layout (avatar based)
  if (layout === 'horizontal') {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', m: 0.5, ...sx }}>
        <Tooltip title={`${team.display_name}${hasUnreads ? ` (unread messages)` : ''}`}>
          <UnreadBadge 
            count={unreadCount} 
            mentions={mentionCount} 
            size="sm"
          >
            <Avatar
              src={getTeamIconUrl(team) || undefined}
              sx={{
                bgcolor: getTeamColor(team.name),
                cursor: 'pointer',
                border: isActive ? '2px solid' : 'none',
                borderColor: 'primary.main',
              }}
              onClick={onClick}
            >
              {getTeamInitials(team)}
            </Avatar>
          </UnreadBadge>
        </Tooltip>
      </Box>
    );
  }

  // Vertical layout (list based or icon-only for sidebar)
  if (layout === 'vertical' && compact) {
    // Icon-only mode for sidebar teams
    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 1,
          ...sx
        }}
      >
        <Tooltip title={`${team.display_name}${hasUnreads ? ` (unread messages)` : ''}`}>
          <UnreadBadge 
            count={unreadCount} 
            mentions={mentionCount} 
            size="sm"
          >
            <Avatar
              src={getTeamIconUrl(team) || undefined}
              sx={{
                bgcolor: getTeamColor(team.name),
                cursor: 'pointer',
                width: 48,
                height: 48,
                border: isActive ? '3px solid' : 'none',
                borderColor: 'common.white',
                fontSize: '1.2rem',
                fontWeight: 600,
              }}
              onClick={onClick}
            >
              {getTeamInitials(team)}
            </Avatar>
          </UnreadBadge>
        </Tooltip>
      </Box>
    );
  }

  // Vertical layout (full list based)
  return (
    <ListItem
      className={className}
      sx={sx}
      disablePadding
      secondaryAction={
        showMenu && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Unread badge */}
            <UnreadBadge 
              count={unreadCount} 
              mentions={mentionCount} 
              size="sm"
            />
            <TeamMenu 
              team={team} 
              size="small"
              onOpenSettings={handleOpenSettings}
              onOpenMembers={handleOpenMembers}
              onOpenInvite={handleOpenInvite}
              onOpenInfo={handleOpenInfo}
              onLeaveTeam={handleLeaveTeam}
            />
          </Box>
        )
      }
    >
      <ListItemButton
        selected={isActive}
        onClick={onClick}
        sx={{ width: '100%' }}
      >
        <ListItemAvatar>
          <Avatar 
            src={getTeamIconUrl(team) || undefined}
            sx={{ bgcolor: getTeamColor(team.name) }}
          >
            {getTeamInitials(team)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={team.display_name}
          secondary={team.description || 'No description'}
          slotProps={{
            primary: {
              noWrap: true,
              fontWeight: hasUnreads ? 700 : 400, // More bold text for unread (700 instead of 600)
              fontStyle: hasUnreads ? 'italic' : 'normal', // Italic for unread
            },
            secondary: {
              noWrap: true,
              fontWeight: hasUnreads ? 600 : 400, // Bold description for unread
              fontStyle: hasUnreads ? 'italic' : 'normal', // Italic description for unread
            }
          }}
          sx={{ minWidth: 0 }}
        />
      </ListItemButton>

    </ListItem>
  );
};

export default TeamItem;