import React from 'react';
import { UserAvatar, StatusBadge } from '../atoms';
import { displayUsername } from '../../utils/userUtils';
import type { UserProfile, UserStatus } from '../../api/types';

export interface UserCardProps {
  user: UserProfile;
  status?: UserStatus['status'];
  showStatus?: boolean;
  showEmail?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
  sx?: React.CSSProperties;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  status = 'offline',
  showStatus = true,
  showEmail = false,
  size = 'medium',
  onClick,
  className,
  sx
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
    padding: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
    borderRadius: '6px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'background-color 0.2s ease',
    ...sx
  };

  // Note: CSS-in-JS doesn't support pseudo-selectors like :hover
  const hoverClass = onClick ? 'user-card-hoverable' : '';

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0 // Allow text truncation
  };

  const nameStyle: React.CSSProperties = {
    fontSize: size === 'small' ? '13px' : size === 'medium' ? '14px' : '16px',
    fontWeight: 600,
    color: '#212529',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const usernameStyle: React.CSSProperties = {
    fontSize: size === 'small' ? '11px' : size === 'medium' ? '12px' : '13px',
    color: '#6c757d',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const emailStyle: React.CSSProperties = {
    fontSize: size === 'small' ? '10px' : size === 'medium' ? '11px' : '12px',
    color: '#868e96',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const statusContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };


  return (
    <div 
      style={containerStyle} 
      className={`${className || ''} ${hoverClass}`.trim()}
      onClick={onClick}
    >
      <UserAvatar user={user} size={size} />
      
      <div style={contentStyle}>
        <div style={nameStyle}>
          {displayUsername(user, 'full_name')}
        </div>
        
        <div style={usernameStyle}>
          @{user.username}
        </div>
        
        {showEmail && user.email && (
          <div style={emailStyle}>
            {user.email}
          </div>
        )}
      </div>
      
      {showStatus && (
        <div style={statusContainerStyle}>
          <StatusBadge status={status} size={size === 'large' ? 'md' : 'sm'} />
        </div>
      )}
    </div>
  );
};

export default UserCard;