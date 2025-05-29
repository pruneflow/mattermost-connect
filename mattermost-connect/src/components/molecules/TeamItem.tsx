import React from 'react';
import { Box, Typography, Avatar, ButtonBase } from '@mui/material';
import { UnreadBadge } from '../atoms';
import type { Team } from '../../api/types';
import type { SxProps, Theme } from '@mui/material';

export interface TeamItemProps {
  team: Team;
  isActive?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  onClick?: () => void;
  className?: string;
  sx?: SxProps<Theme>;
}

export const TeamItem: React.FC<TeamItemProps> = ({
  team,
  isActive = false,
  unreadCount = 0,
  mentionCount = 0,
  onClick,
  className,
  sx
}) => {
  // Generate team icon from name
  const getTeamIcon = (teamName: string): string => {
    return teamName.substring(0, 2).toUpperCase();
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 1.5,
        backgroundColor: isActive ? 'primary.light' : 'transparent',
        borderLeft: isActive ? '3px solid' : '3px solid transparent',
        borderColor: isActive ? 'primary.main' : 'transparent',
        transition: 'all 0.2s ease',
        position: 'relative',
        width: '100%',
        ...sx
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isActive ? 'primary.main' : 'text.secondary',
          color: 'common.white',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: 1.5,
        }}
      >
        {getTeamIcon(team.display_name)}
      </Avatar>
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: isActive ? 'primary.main' : 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {team.display_name}
        </Typography>
        
        {team.description && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              mt: 0.25
            }}
          >
            {team.description}
          </Typography>
        )}
      </Box>
      
      {(unreadCount > 0 || mentionCount > 0) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <UnreadBadge 
            count={unreadCount} 
            mentions={mentionCount}
            size="sm"
          />
        </Box>
      )}
    </Box>
  );

  if (onClick) {
    return (
      <ButtonBase
        className={className}
        onClick={onClick}
        sx={{
          borderRadius: 1.5,
          '&:hover': {
            '& > div': {
              backgroundColor: isActive ? 'primary.light' : 'action.hover',
            }
          },
        }}
      >
        {content}
      </ButtonBase>
    );
  }

  return (
    <Box className={className}>
      {content}
    </Box>
  );
};

export default TeamItem;