// src/hooks/useRealtime.ts
/**
 * Hook pour la gestion des événements en temps réel
 */
import { useCallback, useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { getServices } from "../core/services";
import { useAuth } from "./useAuth";
import { useStoreDispatch } from "./useStoreDispatch";
import {
  receiveNewMessage,
  receiveEditedMessage,
  receiveDeletedMessage,
} from "../core/store/slices/messages.slice";
import { updateTypingUsers } from "../core/store/slices/channels.slice";
import { setUserStatus } from "../core/store/slices/users.slice";

export function useRealtime(): void {
  const { webSocketService } = getServices();
  const { isConnected, connect, disconnect, addMessageHandler } =
    useWebSocket(webSocketService);
  const { isAuthenticated, currentUser } = useAuth();
  const dispatch = useStoreDispatch();

  // Stocker les états des saisies
  const typingTimeoutsRef = useRef<
    Record<string, Record<string, NodeJS.Timeout>>
  >({});
  const typingUsersRef = useRef<Record<string, Record<string, number>>>({});

  // Effet pour gérer la connexion/déconnexion WebSocket
  useEffect(() => {
    if (isAuthenticated && currentUser && !isConnected) {
      // Construire l'URL WebSocket
      const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/v4/websocket`;

      // Se connecter avec le token
      connect(wsUrl, localStorage.getItem("mattermost_token") || "");
    } else if (!isAuthenticated && isConnected) {
      disconnect();
    }

    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isAuthenticated, currentUser, isConnected, connect, disconnect]);

  // Gérer les événements de message
  useEffect(() => {
    if (!isConnected) return;

    // Gestionnaire pour les nouveaux messages
    const handleNewPost = (data: any) => {
      try {
        const post = JSON.parse(data.post);
        // Ignorer les messages envoyés par l'utilisateur courant
        if (post.user_id !== currentUser?.id) {
          dispatch(receiveNewMessage({ message: post }));
        }
      } catch (error) {
        console.error("Error processing new message:", error);
      }
    };

    // Gestionnaire pour les messages édités
    const handleEditedPost = (data: any) => {
      try {
        const post = JSON.parse(data.post);
        dispatch(receiveEditedMessage({ message: post }));
      } catch (error) {
        console.error("Error processing edited message:", error);
      }
    };

    // Gestionnaire pour les messages supprimés
    const handleDeletedPost = (data: any) => {
      try {
        const post = JSON.parse(data.post);
        dispatch(
          receiveDeletedMessage({
            messageId: post.id,
            channelId: post.channel_id,
          }),
        );
      } catch (error) {
        console.error("Error processing deleted message:", error);
      }
    };

    // Gestionnaire pour les changements de statut
    const handleStatusChange = (data: any) => {
      if (data.user_id && data.status) {
        dispatch(
          setUserStatus({
            userId: data.user_id,
            status: data.status,
          }),
        );
      }
    };

    // Gestionnaire pour les événements de saisie
    const handleTyping = (data: any) => {
      if (!data.user_id || data.user_id === currentUser?.id) return;

      const channelId = data.channel_id;
      const userId = data.user_id;

      // Initialiser les structures si nécessaire
      if (!typingUsersRef.current[channelId]) {
        typingUsersRef.current[channelId] = {};
      }

      if (!typingTimeoutsRef.current[channelId]) {
        typingTimeoutsRef.current[channelId] = {};
      }

      // Effacer le timeout existant si présent
      if (typingTimeoutsRef.current[channelId][userId]) {
        clearTimeout(typingTimeoutsRef.current[channelId][userId]);
      }

      // Enregistrer l'horodatage de la dernière activité de frappe
      typingUsersRef.current[channelId][userId] = Date.now();

      // Mettre à jour les utilisateurs en train de taper
      dispatch(
        updateTypingUsers({
          channelId,
          userIds: Object.keys(typingUsersRef.current[channelId]),
        }),
      );

      // Définir un nouveau timeout pour supprimer l'utilisateur après 5 secondes
      typingTimeoutsRef.current[channelId][userId] = setTimeout(() => {
        if (typingUsersRef.current[channelId]) {
          delete typingUsersRef.current[channelId][userId];

          dispatch(
            updateTypingUsers({
              channelId,
              userIds: Object.keys(typingUsersRef.current[channelId]),
            }),
          );

          // Nettoyer si plus personne ne tape
          if (Object.keys(typingUsersRef.current[channelId]).length === 0) {
            delete typingUsersRef.current[channelId];
            delete typingTimeoutsRef.current[channelId];
          }
        }
      }, 5000);
    };

    // S'abonner aux événements WebSocket
    const unsubscribeNewPost = addMessageHandler("posted", handleNewPost);
    const unsubscribeEditedPost = addMessageHandler(
      "post_edited",
      handleEditedPost,
    );
    const unsubscribeDeletedPost = addMessageHandler(
      "post_deleted",
      handleDeletedPost,
    );
    const unsubscribeStatusChange = addMessageHandler(
      "status_change",
      handleStatusChange,
    );
    const unsubscribeTyping = addMessageHandler("typing", handleTyping);

    // Se désabonner lors du démontage
    return () => {
      unsubscribeNewPost();
      unsubscribeEditedPost();
      unsubscribeDeletedPost();
      unsubscribeStatusChange();
      unsubscribeTyping();

      // Nettoyer les timeouts
      Object.values(typingTimeoutsRef.current).forEach((channelTimeouts) => {
        Object.values(channelTimeouts).forEach((timeout) => {
          clearTimeout(timeout);
        });
      });
    };
  }, [isConnected, addMessageHandler, dispatch, currentUser]);
}
