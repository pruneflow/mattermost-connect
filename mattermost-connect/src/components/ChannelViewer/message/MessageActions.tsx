// src/components/ChannelViewer/message/MessageActions.tsx
import React, { useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  Reply as ReplyIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AddReaction as AddReactionIcon,
} from "@mui/icons-material";
import { MessageActionsProps } from "./MessageTypes";

/**
 * Displays action buttons and menus for a message
 */
const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isHovered,
  isFromCurrentUser = false,
  onReply,
  onEdit,
  onDelete,
  sx,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const [reactionAnchorEl, setReactionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const reactionMenuOpen = Boolean(reactionAnchorEl);

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // Action handlers
  const handleCopyMessage = () => {
    if (message?.message) {
      void navigator.clipboard.writeText(message.message);
    }
    handleMenuClose();
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message);
    }
    handleMenuClose();
  };

  // Reaction handlers
  const handleReactionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setReactionAnchorEl(event.currentTarget);
  };

  const handleReactionMenuClose = () => {
    setReactionAnchorEl(null);
  };

  return (
    <>
      {/* Action buttons */}
      {isHovered && (
        <Box
          sx={{
            position: "absolute",
            top: -16,
            right: isFromCurrentUser ? -8 : "auto",
            left: isFromCurrentUser ? "auto" : -8,
            display: "flex",
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: 1,
            ...sx,
          }}
        >
          <Tooltip title="Reply">
            <IconButton size="small" onClick={handleReply}>
              <ReplyIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="React">
            <IconButton size="small" onClick={handleReactionMenuOpen}>
              <AddReactionIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="More">
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleCopyMessage} dense>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy Text" />
        </MenuItem>

        <MenuItem onClick={handleReply} dense>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Reply" />
        </MenuItem>

        {isFromCurrentUser && (
          <>
            <MenuItem onClick={handleEdit} dense>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Edit" />
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleDelete} dense>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Delete"
                slotProps={{
                  primary: { color: "error", component: "div" },
                }}
              />
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default MessageActions;
