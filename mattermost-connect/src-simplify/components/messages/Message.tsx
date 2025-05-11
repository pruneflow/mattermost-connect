import React from 'react';
import { Typography, Paper, Box, Avatar, IconButton, Menu, MenuItem } from '@mui/material';
import { MoreVert as MoreVertIcon, Reply as ReplyIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useUser } from '../../hooks/useUsers';
import { formatRelativeTime } from '../../utils/formatters';
import MessageReactions from './MessageReactions';

export interface MessageProps {
  messageId: string;
  userId: string;
  content: string;
  timestamp: number;
  channelId: string;
  reactions?: Record<string, string[]>; // emoji_name -> user_ids
  isCurrentUser?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function Message({ 
  messageId, 
  userId, 
  content, 
  timestamp,
  channelId,
  reactions = {},
  isCurrentUser = false,
  onReply,
  onEdit,
  onDelete
}: MessageProps) {
  // Get user information
  const { user, status } = useUser(userId);
  
  // Menu state
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // Handle menu open/close
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle actions
  const handleReply = () => {
    handleMenuClose();
    if (onReply) onReply();
  };
  
  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) onEdit();
  };
  
  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) onDelete();
  };
  
  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!user) return '?';
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`;
    }
    
    if (firstName) {
      return firstName[0];
    }
    
    if (user.username) {
      return user.username[0].toUpperCase();
    }
    
    return '?';
  };
  
  // Get status color
  const getStatusColor = (): string => {
    if (!status) return '#9e9e9e'; // Gray for unknown
    
    switch (status) {
      case 'online': return '#4caf50'; // Green
      case 'away': return '#ff9800'; // Orange
      case 'dnd': return '#f44336'; // Red
      case 'offline': return '#9e9e9e'; // Gray
      default: return '#9e9e9e';
    }
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        maxWidth: '85%',
        ml: isCurrentUser ? 'auto' : 0,
        mr: isCurrentUser ? 0 : 'auto',
        bgcolor: isCurrentUser ? 'primary.light' : 'background.paper',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* Avatar with status */}
        <Box sx={{ position: 'relative', mr: 2 }}>
          <Avatar sx={{ bgcolor: user?.username ? stringToColor(user.username) : 'primary.main' }}>
            {getUserInitials()}
          </Avatar>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: getStatusColor(),
              border: '1px solid white',
            }}
          />
        </Box>
        
        {/* Message content */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Message header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2">
                {user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Unknown User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {formatRelativeTime(timestamp)}
              </Typography>
            </Box>
            
            {/* Menu button */}
            <IconButton size="small" onClick={handleMenuClick}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
            
            {/* Action menu */}
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {onReply && (
                <MenuItem onClick={handleReply}>
                  <ReplyIcon fontSize="small" sx={{ mr: 1 }} />
                  Reply
                </MenuItem>
              )}
              {onEdit && isCurrentUser && (
                <MenuItem onClick={handleEdit}>
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  Edit
                </MenuItem>
              )}
              {onDelete && isCurrentUser && (
                <MenuItem onClick={handleDelete}>
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Delete
                </MenuItem>
              )}
            </Menu>
          </Box>
          
          {/* Message text */}
          <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {content}
          </Typography>
          
          {/* Message reactions */}
          {messageId && channelId && (
            <MessageReactions
              messageId={messageId}
              channelId={channelId}
              reactions={reactions}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// Helper function to generate a color from a string
function stringToColor(string: string): string {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  
  return color;
}

export default Message;