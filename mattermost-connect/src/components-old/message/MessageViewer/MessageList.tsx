// src/components/message/MessageViewer/MessageList.tsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import { User } from "../../../types";
import Message from "./Message";
import { Message as MessageType } from "../../../types";
import { useUserContext, withAuthentication } from "../../../context";
import { useDebugRenders } from "../../../hooks";

interface MessageListProps {
  /** List of messages to display */
  messages: MessageType[];
  /** Whether the channel is read-only */
  readOnly: boolean;
  /** Current user ID */
  currentUserId?: string;
  /** Custom render function for messages */
  messageRenderer?: (props: {
    message: MessageType;
    author: User | null;
    formattedText: string;
  }) => React.ReactNode;
  /** Function to reply to a message */
  handleReply: (message: MessageType) => void;
  /** Function to edit a message */
  handleEditMessage: (message: MessageType) => void;
  /** Function to delete a message */
  handleDeleteMessage: (message: MessageType) => void;
  /** Custom properties for messages */
  messageProps?: Partial<React.ComponentProps<typeof Message>>;
  /** Set of message IDs to highlight */
  messagesToHighlight: Set<string>;
  /** Whether automatic scrolling to bottom should be enabled */
  autoScrollToBottom?: boolean;
  /** Map of referenced messages for optimization (optional) */
  referencedMessages?: Record<string, MessageType>;
  /** Map of authors of referenced messages for optimization (optional) */
  referencedAuthors?: Record<string, User>;
}

const Messages: React.FC<MessageListProps> = (props) => {
  useDebugRenders("MessageList", props);
  const {
    messages,
    readOnly,
    currentUserId,
    messageRenderer,
    handleReply,
    handleEditMessage,
    handleDeleteMessage,
    messageProps,
    messagesToHighlight,
    autoScrollToBottom = true,
    referencedMessages = {},
    referencedAuthors = {},
  } = props;
  const { currentUser } = useUserContext();
  // Reference for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reference to track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  // Create a map of messages that are replies
  const replyMessages = useMemo(() => {
    const repliesMap: Record<string, MessageType[]> = {};
    messages.forEach((msg) => {
      if (msg.root_id) {
        if (!repliesMap[msg.root_id]) {
          repliesMap[msg.root_id] = [];
        }
        repliesMap[msg.root_id].push(msg);
      }
    });
    return repliesMap;
  }, [messages]);

  // Automatic scrolling to the bottom after rendering
  useEffect(() => {
    // Don't create a local function for cleanup
    // because it's recreated on each render
    isMountedRef.current = true;

    // Function to scroll to the bottom
    const scrollToBottom = () => {
      if (
        isMountedRef.current &&
        messagesEndRef.current &&
        autoScrollToBottom
      ) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    };

    // Use a timeout to ensure rendering is complete
    const timeoutId = setTimeout(scrollToBottom, 100);

    // Clean up the timeout and isMounted flag on unmounting
    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [messagesEndRef, autoScrollToBottom, messages.length]);

  // Memoized function to determine if a message is from the current user
  const isMessageFromCurrentUser = useCallback(
    (message: MessageType): boolean => {
      return (
        // Use userId from props if present
        (!!currentUserId && message.user_id === currentUserId) ||
        // Otherwise, use the user from context
        (!!currentUser && message.user_id === currentUser.id)
      );
    },
    [currentUserId, currentUser],
  );

  // Safe handler for replying to a message
  const safeHandleReply = useCallback(
    (message: MessageType) => {
      if (isMountedRef.current) {
        handleReply(message);
      }
    },
    [handleReply],
  );

  // Safe handler for editing a message
  const safeHandleEditMessage = useCallback(
    (message: MessageType) => {
      if (isMountedRef.current) {
        handleEditMessage(message);
      }
    },
    [handleEditMessage],
  );

  // Safe handler for deleting a message
  const safeHandleDeleteMessage = useCallback(
    (message: MessageType) => {
      if (isMountedRef.current) {
        handleDeleteMessage(message);
      }
    },
    [handleDeleteMessage],
  );

  // For each message, find the referenced message if it's a reply
  const getReferencedMessageData = useCallback(
    (message: MessageType) => {
      if (!message.root_id) return null;

      // Essayer d'abord dans le map fourni en props
      if (referencedMessages && referencedMessages[message.root_id]) {
        return referencedMessages[message.root_id];
      }

      // Ensuite chercher dans les messages actuels
      return messages.find((msg) => msg.id === message.root_id) || null;
    },
    [messages, referencedMessages],
  );

  // For each referenced message, find its author
  const getReferencedAuthorData = useCallback(
    (referencedMsg: MessageType | null) => {
      if (!referencedMsg || !referencedMsg.user_id) return null;

      // Essayer d'abord dans le map fourni en props
      if (referencedAuthors && referencedAuthors[referencedMsg.user_id]) {
        return referencedAuthors[referencedMsg.user_id];
      }

      // Pas d'autre moyen de trouver l'auteur ici
      return null;
    },
    [referencedAuthors],
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      {messages.map((message) => {
        // Trouver le message référencé et son auteur pour ce message
        const refMessage = getReferencedMessageData(message);
        const refAuthor = getReferencedAuthorData(refMessage);

        return (
          <Message
            key={message.id}
            message={message}
            renderer={messageRenderer}
            isFromCurrentUser={isMessageFromCurrentUser(message)}
            showActions={!readOnly}
            onReply={safeHandleReply}
            onEdit={safeHandleEditMessage}
            onDelete={safeHandleDeleteMessage}
            highlight={messagesToHighlight.has(message.id)}
            // Passer les données du message référencé si disponibles
            referencedMessageData={refMessage}
            referencedAuthorData={refAuthor}
            {...messageProps}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export const MessageList = withAuthentication(Messages);
