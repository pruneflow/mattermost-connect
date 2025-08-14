/**
 * Channel section component for organizing channels into grouped sections
 * Renders titled sections with optimized channel lists using deep equality checking
 */
import React from 'react';
import { Typography, List } from '@mui/material';
import isEqual from 'react-fast-compare';

// Static styles extracted for performance
const STATIC_STYLES = {
  sectionTitle: {
    display: 'block',
    px: 2,
    py: 1,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as const,
  
  channelList: {
    py: 0,
  } as const,
};

export interface ChannelSectionProps {
  title: string;
  channelIds: string[];
  currentChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  compact?: boolean;
}

interface ChannelItemsListProps {
  channelIds: string[];
  currentChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  compact?: boolean;
}

/**
 * ChannelItemsList - Isolated component for rendering channel items
 * Only re-renders when channelIds, currentChannelId, or compact changes
 */
const ChannelItemsList: React.FC<ChannelItemsListProps> = React.memo(({
  channelIds,
  currentChannelId,
  onChannelSelect,
  compact = false
}) => {
  return (
    <List dense sx={STATIC_STYLES.channelList}>
      {channelIds.map((channelId) => (
        <ChannelItemContainer
          key={channelId}
          channelId={channelId}
          isActive={channelId === currentChannelId}
          onClick={onChannelSelect}
          compact={compact}
        />
      ))}
    </List>
  );
}, isEqual);

/**
 * ChannelSection - Renders a section of channels with title
 * Each section only re-renders when its specific channelIds array changes
 * Uses react-fast-compare for optimized deep equality checking
 */
export const ChannelSection: React.FC<ChannelSectionProps> = React.memo(({
  title,
  channelIds,
  currentChannelId,
  onChannelSelect,
  compact = false
}) => {
  if (channelIds.length === 0) return null;

  return (
    <>
      <Typography
        variant="overline"
        sx={STATIC_STYLES.sectionTitle}
      >
        {title}
      </Typography>
      <ChannelItemsList
        channelIds={channelIds}
        currentChannelId={currentChannelId}
        onChannelSelect={onChannelSelect}
        compact={compact}
      />
    </>
  );
}, isEqual);

// Import here to avoid circular dependencies
import { ChannelItemContainer } from './ChannelItemContainer';

export default ChannelSection;