/**
 * Message reply context component for showing reply preview
 * Displays the original message content with close button in reply mode
 */
import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon, FormatQuote as QuoteIcon } from '@mui/icons-material';
import UserAvatar from "../atoms/UserAvatar";
import { useAppSelector } from "../../hooks";
import { selectPostById } from "../../store/selectors/postsSelectors";
import { selectUserById } from "../../store/selectors";
import { displayUsername } from "../../utils/userUtils";
import { formatMessageTime } from '../../utils/dateUtils'

interface MessageReplyProps {
  postId: string;
  onClose: () => void;
}

/**
 * Component to display message reply context
 * Shown above MessageInput when replying to a message
 */
export const MessageReply: React.FC<MessageReplyProps> = ({ postId, onClose }) => {
  const post = useAppSelector(state => selectPostById(state, postId));
  const author = useAppSelector((state) =>
    post?.user_id ? selectUserById(post.user_id)(state) : null,
  );

  if (!post) return null;

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
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* First line: quote icon + avatar + name + time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuoteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            {author && <UserAvatar userId={author.id} size="small" />}
            <Typography variant="body2" sx={{ fontWeight: 'medium', flexShrink: 0 }}>
              {author ? displayUsername(author, "full_name_nickname", true) : 'Unknown User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {formatMessageTime(post.create_at)}
            </Typography>
          </Box>
          
          {/* Second line: message in italic */}
          <Typography 
            variant="body2" 
            sx={{
              fontStyle: 'italic',
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              color: 'text.secondary',
              pl: 3, // Indent to align with content after icon
            }}
          >
            {post.message}
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