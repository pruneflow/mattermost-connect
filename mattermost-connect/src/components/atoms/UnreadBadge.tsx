import React from 'react';

export interface UnreadBadgeProps {
  count: number;
  mentions?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  sx?: React.CSSProperties;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  count,
  mentions = 0,
  size = 'md',
  className,
  sx
}) => {
  if (count === 0 && mentions === 0) return null;

  const sizeMap = {
    sm: { height: 16, fontSize: '10px', padding: '0 4px' },
    md: { height: 18, fontSize: '11px', padding: '0 5px' },
    lg: { height: 20, fontSize: '12px', padding: '0 6px' }
  };

  const sizeConfig = sizeMap[size];

  // Show mentions if any, otherwise show unread count
  const displayCount = mentions > 0 ? mentions : count;
  const isMention = mentions > 0;

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: sizeConfig.height,
    minWidth: sizeConfig.height,
    backgroundColor: isMention ? '#dc3545' : '#6c757d',
    color: 'white',
    borderRadius: sizeConfig.height / 2,
    fontSize: sizeConfig.fontSize,
    fontWeight: 600,
    padding: sizeConfig.padding,
    lineHeight: 1,
    ...sx
  };

  // Format count for display (Mattermost standard)
  const formatCount = (num: number): string => {
    if (num > 999) return '999+';
    return num.toString();
  };

  return (
    <span style={badgeStyle} className={className}>
      {formatCount(displayCount)}
    </span>
  );
};

export default UnreadBadge;