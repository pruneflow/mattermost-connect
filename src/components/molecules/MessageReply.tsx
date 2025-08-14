/**
 * Message reply context component for showing reply preview
 * Displays the original message content with close button in reply mode
 */
import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon } from '@mui/icons-material';

interface MessageReplyProps {
  message: string;
  onClose: () => void;
}

/**
 * Component to display message reply context
 * Shown above MessageInput when replying to a message
 */
export const MessageReply: React.FC<MessageReplyProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <Box
      sx={{
        p: 2,
        borderColor: "divider",
        zIndex: 10,
      }}
    >
      <Box
        sx={{
          width: '100%', 
          p: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          borderRadius: 2,
          borderLeft: "4px solid",
          borderColor: "primary.main",
          bgcolor: "action.hover",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography 
            variant="body2" 
            component="div"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Replying to: {message}
          </Typography>
        </Box>
        
        <IconButton
          size="small"
          sx={{ 
            cursor: "pointer",
            ml: 1,
            flexShrink: 0,
          }}
          onClick={onClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};