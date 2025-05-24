import React from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  Divider,
  Paper
} from '@mui/material';
import { 
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
  PeopleOutline as MembersIcon,
  ExitToApp as LeaveIcon,
  Star as StarIcon,
  StarOutline as StarOutlineIcon
} from '@mui/icons-material';

import { Channel } from '../../api/types';
import { useChannel } from '../../hooks/useChannels';
import { useChannelUtils } from '../../hooks/useChannelUtils';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../hooks/useUsers';
import ChannelTypingIndicator from '../common/ChannelTypingIndicator';

export interface ChannelHeaderProps {
  /**
   * Channel object or ID to display header for
   */
  channel?: Channel | string;
  
  /**
   * Show channel search button
   */
  showSearch?: boolean;
  
  /**
   * Show channel info button
   */
  showInfo?: boolean;
  
  /**
   * Show channel members button
   */
  showMembers?: boolean;
  
  /**
   * Show favorite toggle button
   */
  showFavorite?: boolean;
  
  /**
   * Show leave channel button
   */
  showLeave?: boolean;
  
  /**
   * Called when search is clicked
   */
  onSearchClick?: () => void;
  
  /**
   * Called when info is clicked
   */
  onInfoClick?: () => void;
  
  /**
   * Called when members is clicked
   */
  onMembersClick?: () => void;
  
  /**
   * Called when favorite is toggled
   */
  onFavoriteToggle?: (isFavorite: boolean) => void;
  
  /**
   * Called when leave is clicked
   */
  onLeaveClick?: () => void;
  
  /**
   * Whether channel is currently a favorite
   */
  isFavorite?: boolean;
  
  /**
   * Additional content for the header
   */
  children?: React.ReactNode;
}

/**
 * Channel header component that displays channel info and actions
 */
export function ChannelHeader({
  channel,
  showSearch = true,
  showInfo = true,
  showMembers = true,
  showFavorite = false,
  showLeave = false,
  onSearchClick,
  onInfoClick,
  onMembersClick,
  onFavoriteToggle,
  onLeaveClick,
  isFavorite = false,
  children
}: ChannelHeaderProps) {
  // If channel is a string (ID), fetch the channel data
  const isChannelId = typeof channel === 'string';
  const channelId = isChannelId ? channel : channel?.id;
  
  // Use our hooks to get channel data and utils
  const { channel: channelData } = useChannel(isChannelId ? channelId : undefined);
  const { getDirectChannelDisplayName, isDirectChannel, isGroupChannel } = useChannelUtils();
  const { user: currentUser } = useAuth();
  
  // Determine which channel object to use
  const channelObj = isChannelId ? channelData : channel as Channel | undefined;
  
  // For direct channels, extract the other user's ID
  const getOtherUserId = (directChannel: Channel): string | undefined => {
    if (!isDirectChannel(directChannel) || !currentUser?.id) return undefined;
    
    // Direct channel names are in format "user1id__user2id"
    const userIds = directChannel.name.split('__');
    if (userIds.length !== 2) return undefined;
    
    // Return the ID that's not the current user
    return userIds[0] === currentUser.id ? userIds[1] : userIds[0];
  };
  
  const otherUserId = channelObj && isDirectChannel(channelObj) ? getOtherUserId(channelObj) : undefined;
  const { user: otherUser } = useUser(otherUserId || '');
  
  if (!channelObj) {
    return null;
  }
  
  // Get channel name based on type
  const getChannelDisplayName = () => {
    if (isDirectChannel(channelObj)) {
      // For direct channels, use the other user's formatted name
      return channelObj.display_name || getDirectChannelDisplayName(otherUser) || channelObj.name;
    }
    if (isGroupChannel(channelObj)) {
      // For group channels, use display_name or fallback
      return channelObj.display_name || channelObj.name;
    }
    return channelObj.display_name || channelObj.name;
  };
  
  // Get channel header/purpose text
  const getChannelHeader = () => {
    return channelObj.header || 
      (isDirectChannel(channelObj) ? 'Direct Message' : '') || 
      (isGroupChannel(channelObj) ? 'Group Message' : '') || 
      channelObj.purpose || '';
  };
  
  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle(!isFavorite);
    }
  };
  
  return (
    <Paper 
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        {/* Channel name with typing indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {getChannelDisplayName()}
          </Typography>
          <ChannelTypingIndicator channelId={channelObj.id} />
          
          {/* Favorite button */}
          {showFavorite && (
            <IconButton 
              size="small" 
              onClick={handleFavoriteToggle}
              sx={{ ml: 1 }}
            >
              {isFavorite ? <StarIcon color="warning" /> : <StarOutlineIcon />}
            </IconButton>
          )}
        </Box>
        
        {/* Channel actions */}
        <Box sx={{ display: 'flex' }}>
          {/* Search */}
          {showSearch && (
            <Tooltip title="Search in channel">
              <IconButton 
                size="small"
                onClick={onSearchClick}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Channel info */}
          {showInfo && (
            <Tooltip title="Channel info">
              <IconButton 
                size="small"
                onClick={onInfoClick}
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Channel members */}
          {showMembers && (
            <Tooltip title="View members">
              <IconButton 
                size="small"
                onClick={onMembersClick}
              >
                <MembersIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Leave channel */}
          {showLeave && (
            <Tooltip title="Leave channel">
              <IconButton 
                size="small"
                onClick={onLeaveClick}
              >
                <LeaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      
      {/* Channel header/purpose text */}
      {getChannelHeader() && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {getChannelHeader()}
        </Typography>
      )}
      
      {/* Custom content */}
      {children}
    </Paper>
  );
}

export default ChannelHeader;