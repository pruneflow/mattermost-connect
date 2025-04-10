// src/components/ChannelViewer/Message.tsx
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import { Message as MessageType, User } from "../../types";
import {
  formatMessageText,
  formatTimestamp,
  getInitials,
  generateColorFromString,
} from "../../utils/formatting";

// Material-UI Components
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Skeleton,
  Divider,
  SxProps,
  Theme,
  alpha,
} from "@mui/material";

// Material-UI Icons
import {
  MoreVert as MoreIcon,
  Reply as ReplyIcon,
  ThumbUp as LikeIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AddReaction as AddReactionIcon,
} from "@mui/icons-material";

// Related components
import MessageAttachment from "./MessageAttachment";
import { EmojiPicker, PickerMode, getEmojiFromName } from "../EmojiPicker";
import { EmojiProvider } from "../../context/EmojiProvider";
import Popover from "@mui/material/Popover";

/**
 * Props for the Message component
 */
export interface MessageProps {
  /** The message data object */
  message: MessageType;

  /** Custom message renderer (optional) */
  renderer?: (props: {
    message: MessageType;
    author: User | null;
    formattedText: string;
  }) => React.ReactNode;

  /** Whether the message is from the current user */
  isFromCurrentUser?: boolean;

  /** Whether to show message actions */
  showActions?: boolean;

  /** Callback for reply action */
  onReply?: (message: MessageType) => void;

  /** Callback for edit action */
  onEdit?: (message: MessageType) => void;

  /** Callback for delete action */
  onDelete?: (message: MessageType) => void;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Styling for message bubble */
  bubbleSx?: SxProps<Theme>;

  /** Styling for author area */
  authorSx?: SxProps<Theme>;

  /** Styling for content area */
  contentSx?: SxProps<Theme>;

  /** Styling for actions area */
  actionsSx?: SxProps<Theme>;

  /** Styling for avatar */
  avatarSx?: SxProps<Theme>;
}

/**
 * A component that renders a single message in the channel view
 */
const Message: React.FC<MessageProps> = ({
  message,
  renderer,
  isFromCurrentUser = false,
  showActions = true,
  onReply,
  onEdit,
  onDelete,
  className,
  style,
  sx,
  bubbleSx,
  authorSx,
  contentSx,
  actionsSx,
  avatarSx,
}) => {
  const { service, currentUser } = useMattermost();
  const [author, setAuthor] = useState<User | null>(null);
  const [formattedText, setFormattedText] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  // État pour le menu des réactions
  const [reactionAnchorEl, setReactionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const reactionMenuOpen = Boolean(reactionAnchorEl);

  // Gestionnaires pour le menu des réactions
  const handleReactionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setReactionAnchorEl(event.currentTarget);
  };

  const handleReactionMenuClose = () => {
    setReactionAnchorEl(null);
  };

  // Ajouter un gestionnaire pour la sélection d'une réaction
  const handleReactionSelect = async (result: any) => {
    try {
      // La réaction sera envoyée directement par le EmojiPicker si messageId et channelId sont fournis
      handleReactionMenuClose();
      // Si besoin, rafraîchir les données du message après l'ajout d'une réaction
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  // For messages with attachments
  let hasAttachments: boolean = false;
  if (
    message &&
    message.metadata &&
    message.metadata.files &&
    message.metadata.files.length > 0
  )
    hasAttachments = true;

  // Load author information
  useEffect(() => {
    if (!message || !message.user_id) {
      setLoading(false);
      return;
    }

    const fetchAuthor = async () => {
      try {
        const users = await service?.getUsers({ ids: [message.user_id] });
        if (users && users.length > 0) {
          setAuthor(users[0]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error loading author info:", err);
        setLoading(false);
      }
    };

    void fetchAuthor();
  }, [message, service]);

  // Format message text
  useEffect(() => {
    if (!message?.message) {
      setFormattedText("");
      return;
    }

    setFormattedText(formatMessageText(message.message));
  }, [message]);

  // If a custom renderer is provided, use it
  if (renderer) {
    return <>{renderer({ message, author, formattedText })}</>;
  }

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

  // Render loading skeleton
  if (loading) {
    return (
      <Box
        sx={{ display: "flex", mb: 2, ...sx }}
        className={className}
        style={style}
      >
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ width: "100%" }}>
          <Skeleton variant="text" width={120} height={24} />
          <Skeleton variant="rounded" height={40} width="80%" sx={{ mt: 1 }} />
        </Box>
      </Box>
    );
  }

  // Format timestamp
  const timestamp = formatTimestamp(message?.create_at || 0);

  // Determine message alignment and styling based on sender
  const messageAlignment = isFromCurrentUser ? "flex-end" : "flex-start";
  const bubbleColor = (theme: Theme) =>
    isFromCurrentUser
      ? alpha(theme.palette.primary.main, 0.1)
      : theme.palette.background.paper;
  const bubbleBorder = isFromCurrentUser
    ? "1px solid rgba(25, 118, 210, 0.2)"
    : "1px solid rgba(0, 0, 0, 0.12)";

  return (
    <>
      <Box
        className={className}
        style={style}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: messageAlignment,
          mb: 2,
          maxWidth: { xs: "95%", sm: "85%" },
          alignSelf: messageAlignment,
          ...sx,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Message header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 0.5,
            ml: isFromCurrentUser ? 0 : 1,
            mr: isFromCurrentUser ? 1 : 0,
            alignSelf: messageAlignment,
            ...authorSx,
          }}
        >
          {!isFromCurrentUser && (
            <Avatar
              sx={{
                width: 24,
                height: 24,
                mr: 1,
                bgcolor: generateColorFromString(author?.username),
                fontSize: "0.75rem",
                ...avatarSx,
              }}
            >
              {getInitials(
                author && author.first_name
                  ? `${author.first_name} ${author.last_name}`
                  : author
                    ? author.username
                    : "",
              )}
            </Avatar>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
            component={"div"}
          >
            {author
              ? `${author.first_name || ""} ${author.last_name || ""} ${
                  author.username ? `(@${author.username})` : ""
                }`.trim()
              : "Unknown User"}
          </Typography>

          <Typography
            component={"div"}
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1 }}
          >
            {timestamp}
          </Typography>
        </Box>

        {/* Message content */}
        <Box sx={{ display: "flex", position: "relative" }}>
          {/* Message bubble */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: bubbleColor,
              border: bubbleBorder,
              maxWidth: "100%",
              wordBreak: "break-word",
              ...bubbleSx,
            }}
          >
            {/* Text content */}
            <Box
              sx={{ ...contentSx }}
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />

            {/* Attachments */}
            {hasAttachments && message.metadata?.files && (
              <Box
                sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}
              >
                {message.metadata.files.map((file) => (
                  <MessageAttachment key={file.id} file={file} />
                ))}
              </Box>
            )}
          </Paper>

          {/* Message actions */}
          {showActions && isHovered && (
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
                ...actionsSx,
              }}
            >
              <Tooltip title="Reply">
                <IconButton size="small" onClick={handleReply}>
                  <ReplyIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Réagir">
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
        </Box>

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
      </Box>
      {/* Affichage des réactions (si le message en a) */}
      {message.metadata?.reactions && message.metadata.reactions.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.5,
            mt: 0.5,
          }}
        >
          {message.metadata.reactions.map((reaction, idx) => (
            <Box
              key={`${reaction.emoji_name}-${idx}`}
              sx={{
                borderRadius: "12px",
                border: "1px solid",
                borderColor: "divider",
                px: 1,
                py: 0.5,
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                bgcolor:
                  reaction.user_id === currentUser?.id
                    ? "primary.light"
                    : "action.hover",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "action.selected",
                },
              }}
              onClick={() => {
                // Ajouter ou retirer la réaction
                // Cette fonction dépendra de votre API
              }}
            >
              {getEmojiFromName(reaction.emoji_name) || reaction.emoji_name}{" "}
              <Typography component={"div"} variant="caption" sx={{ ml: 0.5 }}>
                {1} {/* Remplacer par le nombre de réactions */}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {/* Popover pour les réactions */}
      <Popover
        open={reactionMenuOpen}
        anchorEl={reactionAnchorEl}
        onClose={handleReactionMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <EmojiProvider>
          <EmojiPicker
            onSelect={handleReactionSelect}
            onClose={handleReactionMenuClose}
            mode={PickerMode.REACTION}
            messageId={message.id}
            channelId={message.channel_id}
          />
        </EmojiProvider>
      </Popover>
    </>
  );
};

export default Message;
