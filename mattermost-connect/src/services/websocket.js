// src/services/websocket.js
/**
 * Service pour gérer les connexions WebSocket avec Mattermost
 * Permet des mises à jour en temps réel
 */
export const setupWebsocket = async ({
  mode,
  serverUrl,
  token,
  onMessage,
  onError,
  onClose,
}) => {
  // Déterminer l'URL WebSocket en fonction du mode
  let wsUrl;
  if (mode === "direct") {
    wsUrl = serverUrl.replace(/^http/, "ws");
    wsUrl = `${wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl}/api/v4/websocket`;
  } else {
    wsUrl = serverUrl.replace(/^http/, "ws");
    wsUrl = `${wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl}/websocket`;
  }

  // Créer la connexion WebSocket
  const socket = new WebSocket(wsUrl);
  let pingInterval;

  // Événements WebSocket
  socket.onopen = () => {
    console.debug("WebSocket connexion établie");

    // Authentification
    const authMessage = {
      seq: 1,
      action: "authentication_challenge",
      data: {
        token,
      },
    };

    socket.send(JSON.stringify(authMessage));

    // Établir un ping périodique pour maintenir la connexion active
    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "ping" }));
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      // Traiter les différents types de messages
      if (msg.event === "hello") {
        console.debug("WebSocket authentification réussie");
      }
      // Passer les messages à la fonction de callback
      else if (onMessage) {
        onMessage(msg);
      }
    } catch (err) {
      console.error("Erreur lors du traitement du message WebSocket:", err);
    }
  };

  socket.onerror = (error) => {
    console.error("Erreur WebSocket:", error);
    if (onError) onError(error);
  };

  socket.onclose = (event) => {
    console.debug("WebSocket connexion fermée:", event.code, event.reason);
    clearInterval(pingInterval);
    if (onClose) onClose(event);
  };

  // Attendre que la connexion soit établie
  await new Promise((resolve, reject) => {
    const checkState = () => {
      if (socket.readyState === WebSocket.OPEN) {
        resolve();
      } else if (
        socket.readyState === WebSocket.CLOSED ||
        socket.readyState === WebSocket.CLOSING
      ) {
        reject(new Error("La connexion WebSocket a échoué"));
      } else {
        setTimeout(checkState, 100);
      }
    };

    checkState();
  });

  // Retourner une interface pour contrôler la connexion WebSocket
  return {
    // Fermer la connexion
    close: () => {
      clearInterval(pingInterval);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    },

    // Envoyer un message personnalisé
    send: (message) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        throw new Error("WebSocket non connecté");
      }
    },

    // État de la connexion
    getState: () => {
      return socket.readyState;
    },
  };
};

export default setupWebsocket;
