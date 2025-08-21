/**
 * Message actions component providing contextual actions for messages
 * Includes reactions, reply, edit, delete, and copy functionality
 */
import React, { useState, useCallback } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  Tooltip,
  SxProps,
  Theme,
  ClickAwayListener,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";
import { deleteMessage, copyMessage } from "../../services/messageService";
import { addRecentEmoji, toggleReactionOnPost } from "../../services/reactionService";
import { getRecentEmojis } from "../../services/reactionService";
import { EmojiPickerButton } from "../common/EmojiPickerButton";
import { Post } from "../../api/types";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { selectCurrentUserId } from "../../store/selectors";
import { clearMessageSelection } from "../../store/slices/messageUISlice";
import { createEmojiNameWithTone, getUserPreferredSkinTone } from "../../utils/emojiMartAdapter";

interface MessageActionsProps {
  post: Post;
  visible?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  inThread?: boolean; // New prop to know if we are in a thread
  sx?: SxProps<Theme>;
}

const getActionsStyles = (isOwnMessage: boolean): SxProps<Theme> => ({
  display: "flex",
  gap: 0.5,
  alignItems: "center",
  bgcolor: "background.paper",
  borderRadius: 1,
  p: 0.5,
  boxShadow: 1,
  border: "1px solid",
  borderColor: "divider",
  transition: "opacity 0.2s ease",
  position: "absolute",
  top: -30,
  ...(isOwnMessage ? { right: 8 } : { left: 100 }),
  zIndex: 10,
});

const buttonStyles: SxProps<Theme> = {
  p: "4px",
  minWidth: "auto",
};

const RecentEmojiButton: React.FC<{
  emoji: { name: string; character: string };
  onEmojiClick: (name: string) => void;
}> = ({ emoji, onEmojiClick }) => {

  const baseName = emoji.name;
  const skinTone = getUserPreferredSkinTone();
  const emojiNameWithTone = createEmojiNameWithTone(baseName, skinTone);

  const handleClick = useCallback(() => {
    onEmojiClick(emojiNameWithTone);
  }, [onEmojiClick, emojiNameWithTone]);

  return (
    <Tooltip title={`Add ${emojiNameWithTone} reaction`}>
      <IconButton size="small" onClick={handleClick} sx={buttonStyles}>
        <span style={{ fontSize: 16 }}>{emoji.character}</span>
      </IconButton>
    </Tooltip>
  );
};

export const MessageActions: React.FC<MessageActionsProps> = ({
  post,
  visible = false,
  onReply,
  onEdit,
  onDelete,
  inThread = false,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);

  const recentEmojis = getRecentEmojis();

  const isOwnMessage = post.user_id === currentUserId;

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleReply = useCallback(() => {
    onReply?.();
    handleMenuClose();
  }, [onReply, handleMenuClose]);

  const handleEdit = useCallback(() => {
    onEdit?.();
    handleMenuClose();
  }, [onEdit, handleMenuClose]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!post) return;

    try {
      await deleteMessage(post.id);
      onDelete?.();
      setDeleteDialogOpen(false);
    } catch (error) {}
  }, [deleteMessage, post, onDelete]);

  const handleCopy = useCallback(async () => {
    if (!post) return;

    try {
      await copyMessage(post.message);
      setSnackbarMessage("Message copied to clipboard");
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage("Failed to copy message");
      setSnackbarOpen(true);
    }
    handleMenuClose();
  }, [post, handleMenuClose]);

  const handleEmojiSelect = useCallback(
    async (emojiName: string) => {
      try {
        await toggleReactionOnPost(post.id, emojiName);
      } catch (error) {}
    },
    [post.id],
  );

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const handleDeleteDialogClose = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleClickAway = useCallback(() => {
    if (isMobile) {
      dispatch(clearMessageSelection());
    }
  }, [isMobile, dispatch]);

  if (!post) return null;

  const baseStyles = getActionsStyles(isOwnMessage);

  const actionsBox = (
    <div>
      <Box
        sx={[
          baseStyles,
          { opacity: visible ? 1 : 0 },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {/* Recent emojis (desktop only) */}
        {recentEmojis.map((emoji) => (
          <RecentEmojiButton
            key={emoji.name}
            emoji={emoji}
            onEmojiClick={handleEmojiSelect}
          />
        ))}

        <EmojiPickerButton
          onEmojiSelect={handleEmojiSelect}
          size="small"
          openToLeft={isOwnMessage}
          sx={buttonStyles}
          inThread={inThread}
        />

        {!inThread && (
          <Tooltip title="Reply">
            <IconButton size="small" onClick={handleReply} sx={buttonStyles}>
              <ReplyIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        <IconButton size="small" onClick={handleMenuOpen} sx={buttonStyles}>
          <MoreHorizIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {!inThread && (
          <MenuItem onClick={handleReply}>
            <ReplyIcon sx={{ mr: 1, fontSize: 18 }} />
            Reply
          </MenuItem>
        )}
        {isOwnMessage && (
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1, fontSize: 18 }} />
            Edit
          </MenuItem>
        )}
        {isOwnMessage && (
          <MenuItem onClick={handleDeleteClick}>
            <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
            Delete
          </MenuItem>
        )}
        <MenuItem onClick={handleCopy}>
          <CopyIcon sx={{ mr: 1, fontSize: 18 }} />
          Copy Text
        </MenuItem>
      </Menu>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <ClickAwayListener onClickAway={handleClickAway}>
          {actionsBox}
        </ClickAwayListener>
      ) : (
        actionsBox
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this message? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
