import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Avatar, 
  Badge, 
  Tooltip,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { getTeamInitials, getTeamColor, getTeamIconUrl } from '../../utils/teamUtils';
import { useAppSelector } from '../../hooks/useAppSelector';
import { getTeamsUnreadStatuses } from '../../store/selectors';
import type { Team } from '../../api/types';

export interface TeamItemProps {
  team: Team;
  layout: 'vertical' | 'horizontal' | 'tabs';
  isActive?: boolean;
  onClick?: () => void;
  onOpenSettings?: (team: Team) => void;
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
  showMenu = false,
  compact = false,
  className,
  sx
}) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  // Get unread statuses using official Mattermost pattern
  const teamUnreadStatuses = useAppSelector(getTeamsUnreadStatuses);
  const [unreadTeamsSet, mentionsInTeamMap] = teamUnreadStatuses;
  const hasUnreads = unreadTeamsSet.has(team.id);
  const mentionCount = mentionsInTeamMap.get(team.id) || 0;


  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleSettingsClick = useCallback(() => {
    onOpenSettings?.(team);
    handleMenuClose();
  }, [onOpenSettings, team, handleMenuClose]);
  // Tabs layout (header tabs)
  if (layout === 'tabs') {
    return (
      <Tooltip title={team.display_name || team.name} arrow>
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
            cursor: 'pointer',
            borderBottom: isActive ? '3px solid' : '3px solid transparent',
            borderColor: isActive ? 'primary.main' : 'transparent',
            fontWeight: isActive ? 600 : 400,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            bgcolor: 'transparent',
            '&:hover': {
              bgcolor: 'action.hover',
              color: 'primary.main',
            },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            position: 'relative',
            gap: 1,
            transition: 'all 0.2s ease',
            ...sx
          }}
          onClick={onClick}
        >
          {team.display_name || team.name}
        
        {/* Mention badge - inline, not absolute */}
        {mentionCount > 0 && (
          <Badge
            badgeContent={mentionCount}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.625rem',
                height: 16,
                minWidth: 16,
                fontWeight: 600,
                position: 'static',
                transform: 'none',
              }
            }}
          >
            <Box sx={{ width: 0, height: 0 }} />
          </Badge>
        )}
        
        {/* Unread dot - inline, not absolute */}
        {hasUnreads && mentionCount === 0 && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'warning.main',
              flexShrink: 0,
            }}
          />
        )}
      </Box>
      </Tooltip>
    );
  }

  // Horizontal layout (avatar based)
  if (layout === 'horizontal') {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', m: 0.5, ...sx }}>
        <Tooltip title={`${team.display_name}${hasUnreads ? ` (unread messages)` : ''}`}>
          <Badge
            badgeContent={mentionCount > 0 ? mentionCount : 0}
            color="error"
            variant={mentionCount > 0 ? 'standard' : 'dot'}
            invisible={mentionCount === 0 && !hasUnreads}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.625rem',
                height: 18,
                minWidth: 18,
                fontWeight: 600,
              },
              '& .MuiBadge-dot': {
                height: 8,
                minWidth: 8,
                backgroundColor: hasUnreads ? 'info.main' : 'transparent',
              }
            }}
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
          </Badge>
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
          <Badge
            badgeContent={mentionCount > 0 ? mentionCount : 0}
            color="error"
            variant={mentionCount > 0 ? 'standard' : 'dot'}
            invisible={mentionCount === 0 && !hasUnreads}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.625rem',
                height: 16,
                minWidth: 16,
                fontWeight: 600,
              },
              '& .MuiBadge-dot': {
                height: 6,
                minWidth: 6,
                backgroundColor: hasUnreads ? 'warning.main' : 'transparent',
              }
            }}
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
          </Badge>
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
            {/* Mention badge only */}
            {mentionCount > 0 && (
              <Badge
                badgeContent={mentionCount}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.75rem',
                    height: 18,
                    minWidth: 18,
                    fontWeight: 600,
                  }
                }}
              >
                <Box sx={{ width: 8, height: 8 }} />
              </Badge>
            )}
            <IconButton
              edge="end"
              aria-label="team options"
              onClick={handleMenuOpen}
            >
              <MoreVertIcon />
            </IconButton>
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

      {/* Team menu - only for vertical layout */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleSettingsClick}>Team Settings</MenuItem>
        <MenuItem onClick={handleMenuClose}>Manage Members</MenuItem>
        <MenuItem onClick={handleMenuClose}>View Team Info</MenuItem>
      </Menu>
    </ListItem>
  );
};

export default TeamItem;