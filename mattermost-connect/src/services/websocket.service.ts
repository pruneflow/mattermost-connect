// src/services/websocket.service.ts

import { WebSocketConnection, WebSocketSetupOptions } from "../types";

/**
 * Configuration for the WebSocket service
 */
const CONFIG = {
  // Maximum number of reconnection attempts
  MAX_RECONNECT_ATTEMPTS: 5,

  // Base delay between reconnection attempts (in ms)
  BASE_RECONNECT_DELAY: 1000,

  // Maximum delay between reconnection attempts (in ms)
  MAX_RECONNECT_DELAY: 30000,

  // Ping interval to keep connection alive (in ms)
  PING_INTERVAL: 30000,

  // Timeout for connection attempts (in ms)
  CONNECTION_TIMEOUT: 10000,
};

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
  const {
    serverUrl,
    token,
    onMessage,
    onError,
    onClose,
    mode = "direct",
  } = options;

  // Validate input parameters
  if (!serverUrl) {
    throw new Error("WebSocket serverUrl is required");
  }

  console.debug(
    `Setting up WebSocket connection to: ${serverUrl} (mode: ${mode})`,
  );

  // State management for the WebSocket
  let socket: WebSocket | null = null;
  let pingInterval: number | undefined;
  let reconnectAttempt = 0;
  let isReconnecting = false;
  let isClosedIntentionally = false;

  // Sequence counter for messages - starts at 1 for the initial auth
  let sequence = 1;

  /**
   * Creates a new WebSocket connection
   */
  const createSocket = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      // Create new WebSocket instance
      const newSocket = new WebSocket(serverUrl);

      // Set timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (newSocket.readyState !== WebSocket.OPEN) {
          newSocket.close();
          reject(new Error("WebSocket connection timeout"));
        }
      }, CONFIG.CONNECTION_TIMEOUT);

      // Handle successful connection
      newSocket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.debug("WebSocket connection established");
        resolve(newSocket);
      };

      // Handle connection error
      newSocket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("WebSocket connection error:", error);
        reject(error);
      };
    });
  };

  /**
   * Sends authentication message
   */
  const authenticate = async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Cannot authenticate: WebSocket not connected");
    }

    // Reset sequence on new authentication
    sequence = 1;

    // Send authentication challenge with sequence 1
    const authMessage = {
      seq: sequence++,
      action: "authentication_challenge",
      data: {
        token,
      },
    };

    socket.send(JSON.stringify(authMessage));
    console.debug("WebSocket authentication message sent");
  };

  /**
   * Sets up ping interval to keep connection alive
   */
  const setupPingInterval = () => {
    // Clear any existing interval
    if (pingInterval) {
      clearInterval(pingInterval);
    }

    // Set up periodic ping
    pingInterval = window.setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const pingMessage = {
          seq: sequence++,
          action: "ping",
        };
        socket.send(JSON.stringify(pingMessage));
        console.debug(`WebSocket ping sent (seq: ${sequence - 1})`);
      } else {
        // If socket is closed, clear the interval
        clearInterval(pingInterval);
        pingInterval = undefined;
      }
    }, CONFIG.PING_INTERVAL);
  };

  /**
   * Reconnects with exponential backoff
   */
  const reconnectWithBackoff = async () => {
    if (
      isReconnecting ||
      isClosedIntentionally ||
      reconnectAttempt >= CONFIG.MAX_RECONNECT_ATTEMPTS
    ) {
      return;
    }

    isReconnecting = true;
    reconnectAttempt++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt),
      CONFIG.MAX_RECONNECT_DELAY,
    );

    console.debug(
      `WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempt}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`,
    );

    try {
      // Wait for backoff delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Create and setup a new socket
      await setupSocketConnection();

      // Reset reconnect attempt counter on success
      reconnectAttempt = 0;
      console.debug("WebSocket reconnection successful");
    } catch (error) {
      console.error("WebSocket reconnection failed:", error);

      // Try again if we haven't reached the max attempts
      if (reconnectAttempt < CONFIG.MAX_RECONNECT_ATTEMPTS) {
        isReconnecting = false;
        void reconnectWithBackoff();
      } else {
        console.error(
          `Maximum reconnection attempts (${CONFIG.MAX_RECONNECT_ATTEMPTS}) reached`,
        );
      }
    } finally {
      isReconnecting = false;
    }
  };

  /**
   * Sets up a new socket connection with all event handlers
   */
  const setupSocketConnection = async (): Promise<WebSocket> => {
    try {
      // Create new socket
      const newSocket = await createSocket();
      socket = newSocket;

      // Set up message handler
      newSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Check if it's an error response
          if (msg.status === "FAIL") {
            console.error("WebSocket error response:", msg);

            // Check if it's a sequence error, which might require reconnection
            if (msg.error?.id === "api.web_socket_router.bad_seq.app_error") {
              console.warn("Sequence error detected, reconnecting WebSocket");
              newSocket.close();
              return;
            }

            return; // Don't propagate error messages
          }

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

      // Set up error handler
      newSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (onError) onError(error);

        // Try to reconnect on error if not already reconnecting
        if (
          newSocket.readyState !== WebSocket.OPEN &&
          !isReconnecting &&
          !isClosedIntentionally
        ) {
          void reconnectWithBackoff();
        }
      };

      // Set up close handler
      newSocket.onclose = (event) => {
        console.debug("WebSocket connection closed:", event.code, event.reason);

        // Clean up resources
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = undefined;
        }

        // Notify listeners
        if (onClose) onClose(event);

        // Try to reconnect on unexpected close
        if (!isClosedIntentionally && event.code !== 1000 && !isReconnecting) {
          // 1000 is normal closure
          void reconnectWithBackoff();
        }
      };

      // Authenticate and set up ping interval
      await authenticate();
      setupPingInterval();

      return newSocket;
    } catch (error) {
      console.error("Failed to setup WebSocket connection:", error);
      throw error;
    }
  };

  // Initial socket setup
  await setupSocketConnection();

  return {
    // Close the connection
    close: () => {
      isClosedIntentionally = true;

      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = undefined;
      }

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Connection closed by client");
      }
    },

    // Send a custom message
    send: (message: unknown) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket not connected");
      }

      // Add sequence number to outgoing messages
      const messageWithSeq =
        typeof message === "object" && message !== null
          ? { seq: sequence++, ...message }
          : { seq: sequence++, message };

      socket.send(JSON.stringify(messageWithSeq));
    },

    // Get connection state
    getState: () => {
      return socket ? socket.readyState : WebSocket.CLOSED;
    },

    // Force reconnection
    reconnect: async () => {
      if (socket) {
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close();
        }
      }

      isClosedIntentionally = false;
      reconnectAttempt = 0;

      return setupSocketConnection();
    },
  };
};

export default setupWebsocket;
