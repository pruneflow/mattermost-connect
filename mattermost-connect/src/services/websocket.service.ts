// src/services/websocket.service.ts

import {
  WebSocketConnection,
  WebSocketSetupOptions,
} from "../types/websocket.types";

/**
 * Sets up and manages a WebSocket connection to Mattermost
 * Enables real-time updates and notifications
 *
 * @param options - WebSocket connection options
 * @returns A Promise resolving to the WebSocket connection interface
 */
export const setupWebsocket = async (
  options: WebSocketSetupOptions,
): Promise<WebSocketConnection> => {
  const { mode, serverUrl, token, onMessage, onError, onClose } = options;

  // Determine WebSocket URL based on mode
  let wsUrl: string;
  if (mode === "direct") {
    wsUrl = serverUrl.replace(/^http/, "ws");
    wsUrl = `${wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl}/api/v4/websocket`;
  } else {
    wsUrl = serverUrl.replace(/^http/, "ws");
    wsUrl = `${wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl}/websocket`;
  }

  // Create WebSocket connection
  const socket = new WebSocket(wsUrl);
  let pingInterval: number | undefined;

  // WebSocket events
  socket.onopen = () => {
    console.debug("WebSocket connection established");

    // Authentication
    const authMessage = {
      seq: 1,
      action: "authentication_challenge",
      data: {
        token,
      },
    };

    socket.send(JSON.stringify(authMessage));

    // Set up periodic ping to keep connection alive
    pingInterval = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "ping" }));
      }
    }, 30000); // 30 seconds interval
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      // Process different message types
      if (msg.event === "hello") {
        console.debug("WebSocket authentication successful");
      }
      // Pass messages to callback
      else if (onMessage) {
        onMessage(msg);
      }
    } catch (err) {
      console.error("Error processing WebSocket message:", err);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    if (onError) onError(error);
  };

  socket.onclose = (event) => {
    console.debug("WebSocket connection closed:", event.code, event.reason);
    clearInterval(pingInterval);
    if (onClose) onClose(event);
  };

  // Wait for connection to establish
  await new Promise<void>((resolve, reject) => {
    const checkState = () => {
      if (socket.readyState === WebSocket.OPEN) {
        resolve();
      } else if (
        socket.readyState === WebSocket.CLOSED ||
        socket.readyState === WebSocket.CLOSING
      ) {
        reject(new Error("WebSocket connection failed"));
      } else {
        setTimeout(checkState, 100);
      }
    };

    checkState();
  });

  // Return interface to control the WebSocket connection
  return {
    // Close the connection
    close: () => {
      clearInterval(pingInterval);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    },

    // Send a custom message
    send: (message: unknown) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        throw new Error("WebSocket not connected");
      }
    },

    // Get connection state
    getState: () => {
      return socket.readyState;
    },
  };
};

export default setupWebsocket;
