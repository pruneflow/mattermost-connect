// src/components/message/MessageViewer/MessageList.tsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import { User } from "../../../types";
import Message from "./Message";
import { Message as MessageType } from "../../../types";
import { useUserContext, withAuthentication } from "../../../context";
import { useDebugRenders } from "../../../hooks";

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
  /** Ensemble des IDs des messages à mettre en évidence */
  messagesToHighlight: Set<string>;
  /** Si le défilement automatique vers le bas doit être activé */
  autoScrollToBottom?: boolean;
  /** Map des messages référencés pour optimisation (optionnel) */
  referencedMessages?: Record<string, MessageType>;
  /** Map des auteurs des messages référencés pour optimisation (optionnel) */
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
  // Référence pour le scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Référence pour suivre si le composant est monté
  const isMountedRef = useRef<boolean>(true);

  // Créer une map des messages qui sont des réponses
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

  // Défilement automatique vers le bas après rendu
  useEffect(() => {
    // Ne pas créer une fonction locale pour le nettoyage
    // car elle est recréée à chaque rendu
    isMountedRef.current = true;

    // Fonction pour défiler vers le bas
    const scrollToBottom = () => {
      if (
        isMountedRef.current &&
        messagesEndRef.current &&
        autoScrollToBottom
      ) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    };

    // Utiliser un délai pour s'assurer que le rendu est terminé
    const timeoutId = setTimeout(scrollToBottom, 100);

    // Nettoyer le timeout et le drapeau isMounted au démontage
    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [messagesEndRef, autoScrollToBottom, messages.length]);

  // Fonction mémorisée pour déterminer si un message vient de l'utilisateur actuel
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

  // Gestionnaire sécurisé pour la réponse à un message
  const safeHandleReply = useCallback(
    (message: MessageType) => {
      if (isMountedRef.current) {
        handleReply(message);
      }
    },
    [handleReply],
  );

  // Gestionnaire sécurisé pour l'édition d'un message
  const safeHandleEditMessage = useCallback(
    (message: MessageType) => {
      if (isMountedRef.current) {
        handleEditMessage(message);
      }
    },
    [handleEditMessage],
  );

  // Gestionnaire sécurisé pour la suppression d'un message
  const safeHandleDeleteMessage = useCallback(
    (message: MessageType) => {
      if (isMountedRef.current) {
        handleDeleteMessage(message);
      }
    },
    [handleDeleteMessage],
  );

  // Pour chaque message, trouver le message référencé s'il s'agit d'une réponse
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

  // Pour chaque message référencé, trouver son auteur
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
