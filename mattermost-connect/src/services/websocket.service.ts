// src/services/websocket.service.ts

import {
  WebSocketConnection,
  WebSocketSetupOptions,
} from "../types/websocket.types";

/**
 * Maximum reconnection attempts
 */
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Base delay between reconnection attempts (in ms)
 */
const BASE_RECONNECT_DELAY = 1000;

/**
 * Maximum delay between reconnection attempts (in ms)
 */
const MAX_RECONNECT_DELAY = 30000;

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

  // Normalize and determine WebSocket URL based on mode
  let wsUrl: string;
  if (mode === "direct") {
    // Format specific to direct mode
    wsUrl = serverUrl.replace(/^http/, "ws");
    wsUrl = `${wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl}/api/v4/websocket`;
  } else {
    // Format for proxy or custom modes
    wsUrl = serverUrl.replace(/^http/, "ws");
    wsUrl = `${wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl}/websocket`;
  }

  console.debug(`Setting up WebSocket connection to: ${wsUrl}`);

  // Create WebSocket connection
  const socket = new WebSocket(wsUrl);
  let pingInterval: number | undefined;
  let reconnectAttempt = 0;
  let isReconnecting = false;

  // Function to handle reconnection with exponential backoff
  const reconnectWithBackoff = () => {
    if (isReconnecting || reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return;

    isReconnecting = true;
    reconnectAttempt++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt),
      MAX_RECONNECT_DELAY,
    );

    console.debug(
      `WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempt})`,
    );

    setTimeout(() => {
      try {
        // Create a new WebSocket
        const newSocket = new WebSocket(wsUrl);

        // Set up the new socket handlers
        // ... (similar to the initial setup)

        isReconnecting = false;
      } catch (err) {
        console.error("Error during WebSocket reconnection:", err);
        isReconnecting = false;
        reconnectWithBackoff();
      }
    }, delay);
  };

  // WebSocket events
  socket.onopen = () => {
    console.debug("WebSocket connection established");

    // Reset reconnection counter on successful connection
    reconnectAttempt = 0;

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

    // Try to reconnect on error
    if (socket.readyState !== WebSocket.OPEN && !isReconnecting) {
      reconnectWithBackoff();
    }
  };

  socket.onclose = (event) => {
    console.debug("WebSocket connection closed:", event.code, event.reason);
    clearInterval(pingInterval);
    if (onClose) onClose(event);

    // Try to reconnect on unexpected close
    if (event.code !== 1000 && !isReconnecting) {
      // 1000 is normal closure
      reconnectWithBackoff();
    }
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
