/**
 * Message header component displaying user info and timestamp
 * Shows user avatar, display name, and formatted timestamp for messages
 */
import React, { memo } from 'react';
import { Box, Typography, SxProps, Theme } from '@mui/material';
import { useAppSelector } from '../../hooks/useAppSelector';
import { UserAvatar } from '../atoms/UserAvatar';
import { displayUsername } from '../../utils/userUtils';
import { formatMessageTimestamp } from '../../utils/dateUtils';
import { TimestampDisplay } from "../atoms/TimestampDisplay";

interface MessageHeaderProps {
  userId: string;
  timestamp: number;
  showAvatar?: boolean;
  sx?: SxProps<Theme>;
}

const headerStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  mb: 0.5,
};

const usernameStyles: SxProps<Theme> = {
  cursor: 'pointer',
  '&:hover': {
    textDecoration: 'underline',
  },
};

const timestampStyles: SxProps<Theme> = {
  fontSize: '0.75rem',
  opacity: 0.8,
};

const avatarStyles: SxProps<Theme> = {
  mt: 0.5,
  minWidth: 32,
};

export const MessageHeader: React.FC<MessageHeaderProps> = memo(({
  userId,
  timestamp,
  showAvatar = true,
  sx,
}) => {
  const user = useAppSelector((state) => state.entities.users.profiles[userId]);
  
  return (
    <Box sx={{ ...headerStyles, ...sx }}>
      {showAvatar && (
        <UserAvatar
          userId={userId}
          size="small"
        />
      )}
      
      <Typography
        variant="subtitle2"
        fontWeight="600"
        color="text.primary"
        sx={usernameStyles}
      >
        {user ? displayUsername(user, "full_name_nickname", true) : 'Unknown User'}
      </Typography>
      
      <Typography
        variant="caption"
        color="text.secondary"
        sx={timestampStyles}
      >
        {/*{formatMessageTimestamp(timestamp)}*/}
        <TimestampDisplay timestamp={timestamp} format={"time"} showTooltip={true} />
      </Typography>
    </Box>
  );
});

MessageHeader.displayName = 'MessageHeader';