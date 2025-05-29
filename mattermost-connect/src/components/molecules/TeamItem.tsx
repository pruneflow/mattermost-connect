import React from 'react';
import { 
  Box, 
  Avatar, 
  Badge, 
  Tooltip,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  IconButton
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { getTeamInitials, getTeamColor } from '../../utils/teamUtils';
import type { Team } from '../../api/types';

export interface TeamItemProps {
  team: Team;
  layout: 'vertical' | 'horizontal' | 'tabs';
  isActive?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  onClick?: () => void;
  onMenuOpen?: (e: React.MouseEvent<HTMLElement>, team: Team) => void;
  showMenu?: boolean;
  className?: string;
  sx?: any;
}

export const TeamItem: React.FC<TeamItemProps> = ({
  team,
  layout,
  isActive = false,
  unreadCount = 0,
  mentionCount = 0,
  onClick,
  onMenuOpen,
  showMenu = false,
  className,
  sx
}) => {
  // Tabs layout (header tabs)
  if (layout === 'tabs') {
    return (
      <Box
        className={className}
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: 1.5,
          minWidth: 'fit-content',
          display: 'flex',
          alignItems: 'center',
          color: 'common.white',
          cursor: 'pointer',
          borderBottom: isActive ? '3px solid' : '3px solid transparent',
          borderColor: isActive ? 'common.white' : 'transparent',
          fontWeight: isActive ? 'bold' : 'normal',
          fontSize: { xs: '0.875rem', sm: '1rem' },
          bgcolor: isActive ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          whiteSpace: 'nowrap',
          flexShrink: 0,
          position: 'relative',
          ...sx
        }}
        onClick={onClick}
      >
        {team.display_name || team.name}
        
        {/* Mention badge */}
        {mentionCount > 0 && (
          <Badge
            badgeContent={mentionCount}
            color="error"
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              '& .MuiBadge-badge': {
                fontSize: '0.625rem',
                height: 18,
                minWidth: 18,
                fontWeight: 600,
              }
            }}
          >
            <Box sx={{ width: 8, height: 8 }} />
          </Badge>
        )}
        
        {/* Unread dot */}
        {unreadCount > 0 && mentionCount === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'info.main',
            }}
          />
        )}
      </Box>
    );
  }

  // Horizontal layout (avatar based)
  if (layout === 'horizontal') {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', m: 0.5, ...sx }}>
        <Tooltip title={`${team.display_name}${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
          <Badge
            badgeContent={mentionCount > 0 ? mentionCount : 0}
            color="error"
            variant={mentionCount > 0 ? 'standard' : 'dot'}
            invisible={mentionCount === 0 && unreadCount === 0}
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
                backgroundColor: unreadCount > 0 ? 'info.main' : 'transparent',
              }
            }}
          >
            <Avatar
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

  // Vertical layout (list based)
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
              onClick={(e) => onMenuOpen?.(e, team)}
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
          <Avatar sx={{ bgcolor: getTeamColor(team.name) }}>
            {getTeamInitials(team)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={team.display_name}
          secondary={team.description || 'No description'}
          slotProps={{
            primary: {
              noWrap: true,
              fontWeight: unreadCount > 0 ? 600 : 400, // Bold text for unread
            },
            secondary: {
              noWrap: true,
            }
          }}
          sx={{ minWidth: 0 }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default TeamItem;