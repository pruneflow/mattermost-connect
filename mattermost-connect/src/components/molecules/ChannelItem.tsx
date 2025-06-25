import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  SxProps,
  Theme,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  MoreVert, 
  Check, 
  ChevronRight, 
  MarkAsUnread,
  Star,
  StarBorder,
  VolumeOff,
  DriveFileMove,
  PersonAdd,
  ExitToApp
} from '@mui/icons-material';
import { ChannelIcon } from '../atoms/ChannelIcon';
import { UserAvatar } from '../atoms/UserAvatar';
import { ChannelIndicator } from './ChannelIndicator';
import { useChannels } from '../../hooks/useChannels';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Channel, UserProfile } from '../../api/types';

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  listItem: {
    '& .MuiListItemButton-root': {
      borderRadius: 1,
      margin: '1px 8px 1px 24px', // Add right indent (24px from left)
      '&:hover': {
        backgroundColor: alpha('#000', 0.04),
      },
      '&.Mui-selected': {
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        '&:hover': {
          backgroundColor: 'primary.dark',
        },
        '& .MuiListItemIcon-root': {
          color: 'primary.contrastText',
        },
        '& .MuiTypography-root': {
          color: 'primary.contrastText',
        },
      },
    },
  } as const,
  
  listItemText: {
    margin: 0,
    '& .MuiListItemText-primary': {
      fontSize: 'inherit',
    },
  } as const,
  
  channelIndicatorBox: {
    ml: 'auto',
    pl: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  } as const,
  
  menuButton: {
    p: 0.25,
    ml: 0.5,
    visibility: 'hidden',
    '&.mobile-visible': {
      visibility: 'visible',
    },
  } as const,
  
  listItemButtonWithMenu: {
    '&:hover .menu-button': {
      visibility: 'visible',
    },
  } as const,

  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    minHeight: 40,
  } as const,

  menuItemDanger: {
    color: 'error.main',
    '&:hover': {
      backgroundColor: 'error.light',
      color: 'error.contrastText',
    },
    '& .MuiSvgIcon-root': {
      color: 'error.main',
    },
    '&:hover .MuiSvgIcon-root': {
      color: 'error.contrastText',
    },
  } as const,
  
  listItemButton: {
    px: 1,
  } as const,
  
  listItemIcon: {
    mr: 1,
    position: 'relative',
  } as const,
};

export interface ChannelItemProps {
  channel: Channel & {
    hasUnreads?: boolean;
    unreadCount?: number;
    mentionCount?: number;
    isMuted?: boolean;
    // Enriched data from selectors (following Mattermost pattern)
    computedDisplayName?: string;
    otherUser?: UserProfile | null;
    otherUserId?: string;
  };
  isActive?: boolean;
  onClick?: (channelId: string) => void;
  compact?: boolean;
  draggable?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * ChannelItem component following Mattermost sidebar patterns
 * Displays channel with icon, name, and indicators (typing/unread)
 */
export const ChannelItem: React.FC<ChannelItemProps> = React.memo(({
  channel,
  isActive = false,
  onClick,
  compact = false,
  draggable = true,
  sx,
}) => {
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [moveMenuAnchorEl, setMoveMenuAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMenuOpen = Boolean(menuAnchorEl);
  const isMoveMenuOpen = Boolean(moveMenuAnchorEl);

  // Drag & drop setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: channel.id,
    disabled: !draggable,
    data: {
      type: 'channel',
      channel,
    },
  });

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(channel.id);
    }
  }, [onClick, channel.id]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
    setMoveMenuAnchorEl(null);
  }, []);

  const handleMoveMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMoveMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMoveMenuClose = useCallback(() => {
    setMoveMenuAnchorEl(null);
  }, []);

  const handleMoveMenuHover = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!isMobile) {
      event.stopPropagation();
      setMoveMenuAnchorEl(event.currentTarget);
    }
  }, [isMobile]);

  const handleMoveMenuLeave = useCallback(() => {
    if (!isMobile) {
      setMoveMenuAnchorEl(null);
    }
  }, [isMobile]);

  const handleSubmenuMouseEnter = useCallback(() => {
    if (!isMobile) {
      // Keep submenu open when hovering over it
      setMoveMenuAnchorEl(moveMenuAnchorEl);
    }
  }, [isMobile, moveMenuAnchorEl]);

  const handleSubmenuMouseLeave = useCallback(() => {
    if (!isMobile) {
      setMoveMenuAnchorEl(null);
    }
  }, [isMobile]);

  // Get channel actions from useChannels hook
  const { markAsUnread, toggleFavorite, moveToCategory, isChannelFavorite, getChannelCategory, categories } = useChannels();
  
  // Get current favorite status and category
  const isFavorite = isChannelFavorite(channel.id);
  const currentCategory = getChannelCategory(channel.id);

  // Stable menu action handlers
  const handleMarkUnread = useCallback(() => {
    handleMenuClose();
    markAsUnread(channel.id);
  }, [markAsUnread, channel.id]);

  const handleToggleFavorite = useCallback(() => {
    handleMenuClose();
    toggleFavorite(channel.id, isFavorite);
  }, [toggleFavorite, channel.id]);

  const handleMuteChannel = useCallback(() => {
    handleMenuClose();
    // TODO: Implement mute channel
    console.log(`Mute channel ${channel.id}`);
  }, [channel.id]);

  const handleMoveToCategory = useCallback((categoryId: string) => {
    handleMenuClose();
    if (currentCategory?.id === categoryId) {
      // If same category, just close menu
      return;
    }
    moveToCategory(channel.id, categoryId);
  }, [moveToCategory, channel.id, currentCategory?.id]);

  const handleAddMembers = useCallback(() => {
    handleMenuClose();
    // TODO: Implement add members
    console.log(`Add members to channel ${channel.id}`);
  }, [channel.id]);

  const handleLeaveChannel = useCallback(() => {
    handleMenuClose();
    // TODO: Implement leave channel
    console.log(`Leave channel ${channel.id}`);
  }, [channel.id]);

  // Get display name (computed by selector following Mattermost pattern)
  const displayName = channel.computedDisplayName || channel.display_name;

  // Drag & drop styles
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease-out',
    opacity: isDragging ? 0.8 : 1,
  };

  // Memoized dynamic styles based on props
  const dynamicStyles = useMemo(() => ({
    listItem: {
      ...STATIC_STYLES.listItem,
      '& .MuiListItemButton-root': {
        ...STATIC_STYLES.listItem['& .MuiListItemButton-root'],
        minHeight: compact ? 28 : 32,
      },
      ...sx,
    },
    
    listItemButton: {
      ...STATIC_STYLES.listItemButton,
      ...STATIC_STYLES.listItemButtonWithMenu,
      py: compact ? 0.25 : 0.5,
    },
    
    listItemIcon: {
      ...STATIC_STYLES.listItemIcon,
      minWidth: compact ? 20 : 24,
    },
    
    typography: {
      fontSize: compact ? '0.8125rem' : '0.875rem',
      lineHeight: compact ? 1.2 : 1.4,
      fontWeight: isActive ? 600 : 
                 (channel.hasUnreads && !channel.isMuted) ? 600 : 400,
      color: isActive ? 'primary.main' :
             (channel.hasUnreads && !channel.isMuted) ? 'text.primary' :
             channel.isMuted ? 'text.disabled' : 'text.secondary',
    },
  }), [compact, sx, isActive, channel.hasUnreads, channel.isMuted]);

  return (
    <ListItem
      ref={setNodeRef}
      disablePadding
      sx={{
        ...dynamicStyles.listItem,
        ...dragStyle,
      }}
      {...(draggable ? attributes : {})}
    >
      <ListItemButton
        selected={isActive}
        onClick={handleClick}
        sx={dynamicStyles.listItemButton}
        {...(draggable ? listeners : {})}
      >
        {/* Channel Icon or User Avatar for Direct Channels */}
        <ListItemIcon
          sx={dynamicStyles.listItemIcon}
        >
          {channel.type === 'D' && channel.otherUser ? (
            <UserAvatar
              userId={channel.otherUser.id}
              size="medium"
              showStatus={true}
            />
          ) : (
            <ChannelIcon
              channel={channel}
              size={compact ? 'small' : 'medium'}
              color={isActive ? 'inherit' : 'action'}
            />
          )}
        </ListItemIcon>

        {/* Channel Name */}
        <ListItemText
          primary={
            <Typography
              variant={compact ? 'body2' : 'body1'}
              noWrap
              sx={dynamicStyles.typography}
            >
              {displayName}
            </Typography>
          }
          sx={STATIC_STYLES.listItemText}
        />


        {/* Channel Indicator (Typing or Unread) */}
        <Box sx={STATIC_STYLES.channelIndicatorBox}>
          <ChannelIndicator 
            channelId={channel.id}
            hasUnreads={channel.hasUnreads}
            unreadCount={channel.unreadCount}
            mentionCount={channel.mentionCount}
          />
          
          {/* Three Dots Menu Button */}
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            className={`menu-button ${isMobile ? 'mobile-visible' : ''}`}
            sx={STATIC_STYLES.menuButton}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>
      </ListItemButton>
      
      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleMarkUnread} sx={STATIC_STYLES.menuItem}>
          <MarkAsUnread fontSize="small" />
          Mark as unread
        </MenuItem>
        <MenuItem onClick={handleToggleFavorite} sx={STATIC_STYLES.menuItem}>
          {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
          {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        </MenuItem>
        <MenuItem onClick={handleMuteChannel} sx={STATIC_STYLES.menuItem}>
          <VolumeOff fontSize="small" />
          Mute channel
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={isMobile ? handleMoveMenuOpen : undefined}
          onMouseEnter={handleMoveMenuHover}
          onMouseLeave={handleMoveMenuLeave}
          sx={{
            ...STATIC_STYLES.menuItem,
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DriveFileMove fontSize="small" />
            Move to...
          </Box>
          <ChevronRight fontSize="small" />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleAddMembers} sx={STATIC_STYLES.menuItem}>
          <PersonAdd fontSize="small" />
          Add members
        </MenuItem>
        <MenuItem 
          onClick={handleLeaveChannel} 
          sx={{
            ...STATIC_STYLES.menuItem,
            ...STATIC_STYLES.menuItemDanger,
          }}
        >
          <ExitToApp fontSize="small" />
          Leave channel
        </MenuItem>
      </Menu>

      {/* Move To Submenu */}
      <Menu
        anchorEl={moveMenuAnchorEl}
        open={isMoveMenuOpen}
        onClose={handleMoveMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onMouseEnter={handleSubmenuMouseEnter}
        onMouseLeave={handleSubmenuMouseLeave}
      >
        {categories
          .filter((category) => {
            // If current channel is not a DM, don't show DM categories
            return !(channel.type !== 'D' && category.type === 'direct_messages');

          })
          .map((category) => {
            const isCurrent = category.id === currentCategory?.id;
            const handleMove = () => handleMoveToCategory(category.id)
            return (
              <MenuItem 
                key={category.id}
                onClick={handleMove}
                sx={{
                  ...STATIC_STYLES.menuItem,
                  justifyContent: 'space-between',
                  backgroundColor: isCurrent ? 'action.selected' : 'transparent',
                  fontWeight: isCurrent ? 600 : 400,
                  '&:hover': {
                    backgroundColor: isCurrent ? 'action.selected' : 'action.hover',
                  },
                }}
              >
                <Typography variant="body2" noWrap>
                  {category.display_name}
                </Typography>
                {isCurrent && <Check fontSize="small" color="primary" />}
              </MenuItem>
            );
          })}
      </Menu>
    </ListItem>
  );
});

export default ChannelItem;