import { User } from "../../../types";
import Message from "./Message";
import { useRef } from "react";
import { Box } from "@mui/material";
import { Message as MessageType } from "../../../types";

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
}) => {
  // Référence pour le scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          renderer={messageRenderer}
          isFromCurrentUser={message.user_id === currentUserId}
          showActions={!readOnly}
          onReply={handleReply}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          {...messageProps}
        />
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
};
