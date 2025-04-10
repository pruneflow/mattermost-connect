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
  QuoteLeft as QuoteIcon,
} from "@mui/icons-material";

// Related components
import MessageAttachment from "./MessageAttachment";
import { EmojiPicker, PickerMode, getEmojiFromName } from "../EmojiPicker";
import { EmojiProvider } from "../../context/EmojiProvider";
import Popover from "@mui/material/Popover";
import Attachment, {
  AttachmentGroup,
  AttachmentMode,
} from "../Attachment/Attachment";

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
  const [referencedMessage, setReferencedMessage] =
    useState<MessageType | null>(null);
  const [referencedAuthor, setReferencedAuthor] = useState<User | null>(null);

  // État pour le menu des réactions
  const [reactionAnchorEl, setReactionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const reactionMenuOpen = Boolean(reactionAnchorEl);

  // Fonction pour déterminer si le message est une réponse
  const isReplyMessage = (msg: MessageType): boolean => {
    // Dans Mattermost, les réponses ont un root_id qui est l'ID du message parent
    // Parfois, l'information peut aussi être dans props.quoted_message_id
    return !!msg.root_id || !!(msg.props && msg.props.quoted_message_id);
  };

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

  // Vérifier si le message est une réponse à un autre message
  useEffect(() => {
    // Identifier l'ID du message parent
    const parentMessageId =
      message?.root_id || (message?.props && message?.props.quoted_message_id);

    if (parentMessageId) {
      console.log(`Message ${message.id} est une réponse à ${parentMessageId}`);

      const fetchReferencedMessage = async () => {
        try {
          // D'abord, essayer un appel direct pour récupérer le message spécifique
          // Cette approche dépend de l'API disponible
          try {
            // Certaines implémentations API permettent de récupérer un message spécifique
            // Note: À adapter selon l'implémentation réelle du service
            const endpoint = `posts/${parentMessageId}`;

            // Si une méthode spécifique existe sur le service, l'utiliser
            if (typeof service.getPost === "function") {
              const parentPost = await service.getPost(parentMessageId);
              setReferencedMessage(parentPost);

              if (parentPost.user_id) {
                const users = await service.getUsers({
                  ids: [parentPost.user_id],
                });
                if (users && users.length > 0) {
                  setReferencedAuthor(users[0]);
                }
              }
              return;
            }
          } catch (directError) {
            console.log(
              "Tentative directe échouée, essai de l'approche alternative",
              directError,
            );
          }

          // Approche alternative: récupérer les messages du canal et chercher le message parent
          const response = await service.getChannelMessages(
            message.channel_id,
            {
              perPage: 100, // Augmenter pour avoir plus de chances de trouver le parent
            },
          );

          if (response.posts && response.posts[parentMessageId]) {
            setReferencedMessage(response.posts[parentMessageId]);

            if (response.posts[parentMessageId].user_id) {
              const users = await service.getUsers({
                ids: [response.posts[parentMessageId].user_id],
              });
              if (users && users.length > 0) {
                setReferencedAuthor(users[0]);
              }
            }
          } else {
            console.log(
              `Message parent ${parentMessageId} non trouvé dans les résultats`,
            );
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération du message référencé:",
            error,
          );
        }
      };

      void fetchReferencedMessage();
    }
  }, [message, service]);

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

  // Fonction pour naviguer au message référencé
  const navigateToReferencedMessage = () => {
    const parentMessageId =
      message?.root_id || message?.props?.quoted_message_id;
    if (parentMessageId) {
      // Implémenter la navigation vers le message référencé
      // Par exemple, en utilisant un scrollIntoView ou en mettant à jour l'état pour faire défiler jusqu'au message
      const messageElement = document.getElementById(
        `message-${parentMessageId}`,
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        // Mettre en évidence le message brièvement
        messageElement.classList.add("highlight");
        setTimeout(() => {
          messageElement.classList.remove("highlight");
        }, 2000);
      }
    }
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
        id={`message-${message.id}`} // Add ID for reference navigation
        className={className}
        style={style}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: messageAlignment,
          mb: 2,
          maxWidth: { xs: "95%", sm: "85%" },
          alignSelf: messageAlignment,
          width: "auto", // Ajout pour éviter que les messages occupent toute la largeur
          position: "relative", // Nécessaire pour positionner l'indicateur de réponse
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
            {/* Fallback pour les réponses où nous n'avons pas pu récupérer le message référencé */}
            {isReplyMessage(message) && !referencedMessage && (
              <Box
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderLeft: "4px solid",
                  borderColor: "divider",
                  backgroundColor: (theme) =>
                    alpha(theme.palette.background.default, 0.5),
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="div"
                  sx={{ fontStyle: "italic" }}
                >
                  Ceci est une réponse à un message antérieur qui n'est plus
                  disponible
                </Typography>
              </Box>
            )}

            {/* Message référencé (si c'est une réponse) */}
            {referencedMessage && (
              <Box
                onClick={navigateToReferencedMessage}
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderLeft: "4px solid",
                  borderColor: "primary.light",
                  backgroundColor: (theme) =>
                    alpha(theme.palette.background.default, 0.7),
                  borderRadius: 1,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.light, 0.1),
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: "bold" }}
                    component="div"
                  >
                    {referencedAuthor
                      ? `${referencedAuthor.first_name || ""} ${referencedAuthor.last_name || ""}`.trim() ||
                        referencedAuthor.username
                      : "Utilisateur inconnu"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="div"
                    sx={{ ml: 1 }}
                  >
                    {formatTimestamp(referencedMessage.create_at || 0)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="div"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    fontSize: "0.875rem",
                  }}
                >
                  {referencedMessage.message}
                </Typography>
              </Box>
            )}

            {/* Text content */}
            <Box
              sx={{ ...contentSx }}
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />

            {/* Attachments */}
            {hasAttachments && message.metadata?.files && (
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <AttachmentGroup files={message.metadata.files} />
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
            justifyContent: isFromCurrentUser ? "flex-end" : "flex-start",
            maxWidth: { xs: "95%", sm: "85%" },
            alignSelf: messageAlignment,
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
