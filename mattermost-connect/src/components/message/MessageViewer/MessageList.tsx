import { User } from "../../../types";
import Message from "./Message";
import React, { useCallback, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { Message as MessageType } from "../../../types";
import { useMattermost } from "../../../context/MattermostProvider";

interface MessageListProps {
  /** Liste des messages à afficher */
  messages: MessageType[];
  /** Si le canal est en lecture seule */
  readOnly: boolean;
  /** ID de l'utilisateur actuel */
  currentUserId?: string;
  /** Fonction de rendu personnalisée pour les messages */
  messageRenderer?: (props: {
    message: MessageType;
    author: User | null;
    formattedText: string;
  }) => React.ReactNode;
  /** Fonction pour répondre à un message */
  handleReply: (message: MessageType) => void;
  /** Fonction pour éditer un message */
  handleEditMessage: (message: MessageType) => void;
  /** Fonction pour supprimer un message */
  handleDeleteMessage: (message: MessageType) => void;
  /** Propriétés personnalisées pour les messages */
  messageProps?: Partial<React.ComponentProps<typeof Message>>;
  messagesToHighlight: Set<string>;
  autoScrollToBottom?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
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
}) => {
  const { currentUser } = useMattermost();
  // Référence pour le scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMessageFromCurrentUser = useCallback(
    (message: MessageType): boolean => {
      return (
        // Utiliser userId des props si présent
        (!!currentUserId && message.user_id === currentUserId) ||
        // Sinon, utiliser l'utilisateur du contexte
        (!!currentUser && message.user_id === currentUser.id)
      );
    },
    [currentUserId, currentUser],
  );

  useEffect(() => {
    // Forcer le défilement après le montage du composant
    if (messagesEndRef.current && autoScrollToBottom) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        }
      }, 100);
    }
  }, [messagesEndRef]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          renderer={messageRenderer}
          isFromCurrentUser={isMessageFromCurrentUser(message)}
          showActions={!readOnly}
          onReply={handleReply}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          highlight={messagesToHighlight.has(message.id)}
          {...messageProps}
        />
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
};
