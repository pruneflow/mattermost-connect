// src/components/message/MessageViewer/Message.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  useMattermost,
  useUserContext,
  withAuthentication,
} from "../../../context";
import {
  Box,
  Paper,
  Skeleton,
  Theme,
  Typography,
  alpha,
  Zoom,
} from "@mui/material";
import { MessageProps } from "./MessageTypes";
import { formatMessageText, formatTimestamp } from "../../../utils";
import MessageHeader from "./MessageHeader";
import MessageContent from "./MessageContent";
import MessageActions from "./MessageActions";
import MessageReactions from "./MessageReactions";
import ReferencedMessage from "./ReferencedMessage";
import { User, Message as MessageType } from "../../../types";
import { useDebugRenders } from "../../../hooks";

/**
 * A component that renders a single message in the channel view
 */
const Message: React.FC<MessageProps> = (props) => {
  useDebugRenders("Message", props);
  const {
    message,
    isFromCurrentUser = false,
    renderer,
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
    highlight = false,
    // Nouvelle prop pour éviter le fetch du message référencé
    referencedMessageData = null,
    // Nouvelle prop pour éviter le fetch de l'auteur du message référencé
    referencedAuthorData = null,
  } = props;
  const { services } = useMattermost();
  const { getUser, currentUser } = useUserContext();
  const [author, setAuthor] = useState<User | null>(null);
  const [formattedText, setFormattedText] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialiser avec les données fournies en props si disponibles
  const [referencedMessage, setReferencedMessage] =
    useState<MessageType | null>(referencedMessageData);
  const [referencedAuthor, setReferencedAuthor] = useState<User | null>(
    referencedAuthorData,
  );

  const messageRef = useRef<HTMLDivElement>(null);

  const isFromUser = useMemo(() => {
    return (
      isFromCurrentUser || (currentUser && message.user_id === currentUser.id)
    );
  }, [isFromCurrentUser, currentUser, message.user_id]);

  const mattermostService = services?.mattermostService;

  // Function to determine if the message is a reply
  const isReplyMessage = useCallback((msg: MessageType): boolean => {
    // In Mattermost, replies have a root_id which is the ID of the parent message
    // Sometimes, the information can also be in props.quoted_message_id
    return !!msg.root_id || !!(msg.props && msg.props.quoted_message_id);
  }, []);

  // Check if the message is a reply to another message
  useEffect(() => {
    // Si les données sont déjà fournies, on n'a pas besoin de faire le fetch
    if (referencedMessageData) {
      return;
    }

    // Utilisation du drapeau isMounted pour éviter les mises à jour d'état après démontage
    let isMounted = true;

    // Identifier le parent message ID
    const parentMessageId =
      message?.root_id || (message?.props && message?.props.quoted_message_id);

    if (parentMessageId) {
      const fetchReferencedMessage = async () => {
        try {
          // First, try a direct call to retrieve the specific message
          try {
            // Some API implementations allow retrieving a specific message
            if (typeof mattermostService?.getPost === "function") {
              const parentPost = await mattermostService?.getPost(
                parentMessageId as string,
              );

              // Vérifier si le composant est toujours monté avant de mettre à jour l'état
              if (isMounted) {
                setReferencedMessage(parentPost);

                if (parentPost.user_id) {
                  // Utiliser getUser plutôt que mattermostService?.getUsers
                  const author = await getUser(parentPost.user_id);
                  if (isMounted) {
                    // Vérifier à nouveau car nouvelle opération asynchrone
                    if (author) {
                      setReferencedAuthor(author);
                    }
                  }
                }
              }
              return;
            }
          } catch (directError) {
            console.log(
              "Direct attempt failed, trying alternative approach",
              directError,
            );
          }

          // Alternative approach: retrieve channel messages and look for the parent message
          const response = await mattermostService?.getChannelMessages(
            message.channel_id,
            {
              perPage: 100, // Increase to increase chances of finding the parent
            },
          );

          // Vérifier si composant toujours monté avant de continuer
          if (!isMounted || !response) return;

          if (response.posts && response.posts[parentMessageId as string]) {
            setReferencedMessage(response.posts[parentMessageId as string]);

            if (response.posts[parentMessageId as string].user_id) {
              // Utiliser getUser plutôt que mattermostService?.getUsers
              const author = await getUser(
                response.posts[parentMessageId as string].user_id,
              );
              if (isMounted && author) {
                setReferencedAuthor(author);
              }
            }
          } else {
            console.log(
              `Parent message ${parentMessageId} not found in results`,
            );
          }
        } catch (error) {
          console.error("Error retrieving referenced message:", error);
        }
      };

      void fetchReferencedMessage();
    }

    // Fonction de nettoyage qui change le drapeau
    return () => {
      isMounted = false;
    };
  }, [
    message?.root_id,
    message?.props,
    message.channel_id,
    mattermostService,
    getUser,
    referencedMessageData,
  ]);

  // Load author information
  useEffect(() => {
    let isMounted = true;

    if (!message || !message.user_id) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const fetchAuthor = async () => {
      try {
        const user = await getUser(message.user_id);
        if (isMounted) {
          setAuthor(user);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading author info:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchAuthor();

    return () => {
      isMounted = false;
    };
  }, [message?.user_id, getUser]);

  // Format message text
  useEffect(() => {
    let isMounted = true;

    if (!message?.message) {
      if (isMounted) {
        setFormattedText("");
      }
      return () => {
        isMounted = false;
      };
    }

    // Opération synchrone, mais par cohérence on maintient le pattern
    const formatted = formatMessageText(message.message);
    if (isMounted) {
      setFormattedText(formatted);
    }

    return () => {
      isMounted = false;
    };
  }, [message?.message]);

  // Scroll to highlighted message
  useEffect(() => {
    let isMounted = true;

    if (highlight && messageRef.current && isMounted) {
      // Faire défiler jusqu'au message si nécessaire
      messageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    return () => {
      isMounted = false;
    };
  }, [highlight]);

  // If a custom renderer is provided, use it
  if (renderer) {
    return <>{renderer({ message, author, formattedText })}</>;
  }

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
  const messageAlignment = isFromUser ? "flex-end" : "flex-start";
  const bubbleColor = (theme: Theme) =>
    isFromUser
      ? alpha(theme.palette.primary.main, 0.1)
      : theme.palette.background.paper;
  const bubbleBorder = isFromUser
    ? "1px solid rgba(25, 118, 210, 0.2)"
    : "1px solid rgba(0, 0, 0, 0.12)";

  return (
    <>
      <Zoom in={true} style={{ transitionDelay: "100ms" }}>
        <Box
          id={`message-${message.id}`}
          ref={messageRef}
          className={`${className} ${highlight ? "highlight" : ""}`}
          style={style}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: messageAlignment,
            mb: 2,
            maxWidth: { xs: "95%", sm: "85%" },
            alignSelf: messageAlignment,
            width: "auto",
            position: "relative",
            ...(highlight && {
              animation: "highlightMessage 2s ease-in-out",
            }),
            ...sx,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Message header with author info and timestamp */}
          <MessageHeader
            author={author}
            timestamp={timestamp}
            isFromCurrentUser={isFromUser}
            sx={authorSx}
            avatarSx={avatarSx}
          />

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
              {/* Referenced message (if this is a reply) */}
              {isReplyMessage(message) && referencedMessage && (
                <ReferencedMessage
                  message={referencedMessage}
                  author={referencedAuthor}
                />
              )}

              {/* Fallback for replies where we couldn't retrieve the referenced message */}
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
                    This is a reply to a previous message that is no longer
                    available
                  </Typography>
                </Box>
              )}

              {/* Message content */}
              <MessageContent
                message={message}
                formattedText={formattedText}
                sx={contentSx}
              />
            </Paper>

            {/* Message actions */}
            {showActions && (
              <MessageActions
                message={message}
                isHovered={isHovered}
                isFromCurrentUser={isFromUser}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                sx={actionsSx}
              />
            )}
          </Box>

          {/* Message reactions */}
          <MessageReactions message={message} isFromCurrentUser={isFromUser} />
        </Box>
      </Zoom>
    </>
  );
};

export default withAuthentication(Message);
