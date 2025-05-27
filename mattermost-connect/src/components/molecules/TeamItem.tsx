import React from 'react';
import { UnreadBadge } from '../atoms';
import type { Team } from '../../api/types';

export interface TeamItemProps {
  team: Team;
  isActive?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  onClick?: () => void;
  className?: string;
  sx?: React.CSSProperties;
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
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: onClick ? 'pointer' : 'default',
    backgroundColor: isActive ? '#e3f2fd' : 'transparent',
    borderLeft: isActive ? '3px solid #1976d2' : '3px solid transparent',
    transition: 'all 0.2s ease',
    position: 'relative',
    ...sx
  };

  const hoverStyle = onClick ? {
    backgroundColor: isActive ? '#e3f2fd' : '#f8f9fa'
  } : {};

  const iconContainerStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: isActive ? '#1976d2' : '#495057',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0 // Allow text truncation
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: isActive ? '#1976d2' : '#212529',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6c757d',
    margin: '2px 0 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const badgeContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  };

  // Generate team icon from name
  const getTeamIcon = (teamName: string): string => {
    return teamName.substring(0, 2).toUpperCase();
  };

  return (
    <div 
      style={{ ...containerStyle, ...hoverStyle }} 
      className={className}
      onClick={onClick}
    >
      <div style={iconContainerStyle}>
        {getTeamIcon(team.display_name)}
      </div>
      
      <div style={contentStyle}>
        <div style={nameStyle}>
          {team.display_name}
        </div>
        
        {team.description && (
          <div style={descriptionStyle}>
            {team.description}
          </div>
        )}
      </div>
      
      {(unreadCount > 0 || mentionCount > 0) && (
        <div style={badgeContainerStyle}>
          <UnreadBadge 
            count={unreadCount} 
            mentions={mentionCount}
            size="sm"
          />
        </div>
      )}
    </div>
  );
};

export default TeamItem;