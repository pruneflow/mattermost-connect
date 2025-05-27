import React, { useState, useMemo } from "react";
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
  TextField,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import {
  AddReaction as AddReactionIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreVertIcon,
  MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";
import { EmojiPickerButton } from "../common";
import { useMessages } from "../../hooks/useMessages";
import { useReactionToggle } from "../../hooks/useReactionToggle";
import { useAuth } from "../../context/AuthContext";

interface MessageActionsProps {
  messageId: string;
  channelId: string;
  messageText: string;
  onReply?: () => void;
  onEdit?: (newText: string) => void;
  onDelete?: () => void;
  visible?: boolean;
  isMobile?: boolean;
}

export function MessageActions({
  messageId,
  channelId,
  messageText,
  onReply,
  onEdit,
  onDelete,
  visible = false,
  isMobile = false,
}: MessageActionsProps) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const actualIsMobile = isMobile || isSmallScreen;

  // State management
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(messageText);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Auth context for current user ID
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Messages hook for updating
  const { updateMessage, deleteMessage } = useMessages(channelId, currentUserId);
  
  // Use centralized reaction toggle logic
  const { toggleReaction } = useReactionToggle({ channelId, messageId });

  // Get recent emojis from localStorage
  const recentEmojis = useMemo(() => {
    try {
      const stored = localStorage.getItem("emoji-mart.frequently");
      if (stored) {
        const frequently = JSON.parse(stored);
        // Sort by frequency and take top 5
        return Object.entries(frequently)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([name]) => name);
      }
    } catch (error) {
      console.error("Error parsing recent emojis:", error);
    }
    return [];
  }, []);

  // Handle menu actions
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleReply = () => {
    onReply?.();
    handleMenuClose();
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditText(messageText);
    handleMenuClose();
  };

  const handleEditSave = async () => {
    try {
      await updateMessage({ id: messageId, message: editText });
      onEdit?.(editText);
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update message:", error);
    }
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditText(messageText);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteMessage(messageId);
      onDelete?.();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setSnackbarMessage("Message copied to clipboard");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Failed to copy message:", error);
      setSnackbarMessage("Failed to copy message");
      setSnackbarOpen(true);
    }
    handleMenuClose();
  };

  const handleEmojiSelect = (emoji: string, emojiName: string) => {
    toggleReaction(emoji, emojiName);
  };

  const handleRecentEmojiClick = (emojiName: string) => {
    // For recent emojis, we need to get the emoji character
    // This is a simplified approach - in practice you might want to use emoji-mart's findEmoji
    const emojiChar = String.fromCodePoint(parseInt("1f44d", 16)); // Default to thumbs up if can't find
    toggleReaction(emojiChar, emojiName);
  };

  if (editMode) {
    return (
      <Box sx={{ mt: 1, width: "100%" }}>
        <TextField
          fullWidth
          multiline
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button size="small" onClick={handleEditCancel}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleEditSave}>
            Save
          </Button>
        </Box>
      </Box>
    );
  }

  if (actualIsMobile) {
    return (
      <>
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
        >
          <EmojiPickerButton
            onEmojiSelect={handleEmojiSelect}
            buttonSize="small"
            icon={<AddReactionIcon sx={{ fontSize: 16 }} />}
            placement="left-end"
            buttonProps={{
              sx: { p: "4px", minWidth: "auto" },
            }}
          />

          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ p: "4px", minWidth: "auto" }}
          >
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <MenuItem onClick={handleReply}>
            <ReplyIcon sx={{ mr: 1, fontSize: 18 }} />
            Reply
          </MenuItem>
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1, fontSize: 18 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={() => setDeleteDialogOpen(true)}>
            <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
            Delete
          </MenuItem>
          <MenuItem onClick={handleCopy}>
            <CopyIcon sx={{ mr: 1, fontSize: 18 }} />
            Copy Text
          </MenuItem>
        </Menu>
      </>
    );
  }

  // Desktop version
  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          alignItems: "center",
          bgcolor: "background.paper",
          borderRadius: 1,
          p: 0.5,
          boxShadow: 1,
          border: "1px solid",
          borderColor: "divider",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.2s ease",
          position: "absolute",
          top: -16,
          right: 8,
          zIndex: 10,
        }}
      >
        {/* Recent emojis */}
        {recentEmojis.map((emojiName) => (
          <Tooltip key={emojiName} title={`Add ${emojiName} reaction`}>
            <IconButton
              size="small"
              onClick={() => handleRecentEmojiClick(emojiName)}
              sx={{ p: "4px", minWidth: "auto" }}
            >
              <span style={{ fontSize: 16 }}>
                {emojiName === "+1"
                  ? "👍"
                  : emojiName === "grinning"
                    ? "😀"
                    : emojiName === "heart_eyes"
                      ? "😍"
                      : emojiName === "laughing"
                        ? "😂"
                        : emojiName === "joy"
                          ? "😂"
                          : "😊"}
              </span>
            </IconButton>
          </Tooltip>
        ))}

        <EmojiPickerButton
          onEmojiSelect={handleEmojiSelect}
          buttonSize="small"
          icon={<AddReactionIcon sx={{ fontSize: 18 }} />}
          placement="left-end"
          buttonProps={{
            sx: { p: "4px", minWidth: "auto" },
          }}
        />

        <Tooltip title="Reply">
          <IconButton
            size="small"
            onClick={handleReply}
            sx={{ p: "4px", minWidth: "auto" }}
          >
            <ReplyIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{ p: "4px", minWidth: "auto" }}
        >
          <MoreHorizIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleReply}>
          <ReplyIcon sx={{ mr: 1, fontSize: 18 }} />
          Reply
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => setDeleteDialogOpen(true)}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
        <MenuItem onClick={handleCopy}>
          <CopyIcon sx={{ mr: 1, fontSize: 18 }} />
          Copy Text
        </MenuItem>
      </Menu>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this message? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
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
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default MessageActions;
