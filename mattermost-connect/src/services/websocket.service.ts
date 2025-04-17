// src/services/websocket.service.ts

import { WebSocketConnection, WebSocketSetupOptions } from "../types";

/**
 * Configuration pour le service WebSocket
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
 * Classe Singleton pour gérer une seule instance de connexion WebSocket par URL/token
 */
class WebSocketSingleton {
  private static instance: WebSocketSingleton | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();

  // Nouveau compteur de références pour les connexions
  private connectionRefs: Map<string, number> = new Map();

  // Nouvel état pour les tentatives de reconnexion en cours
  private reconnecting: Set<string> = new Set();

  /**
   * Obtient l'instance unique du singleton
   */
  public static getInstance(): WebSocketSingleton {
    if (!WebSocketSingleton.instance) {
      WebSocketSingleton.instance = new WebSocketSingleton();
    }
    return WebSocketSingleton.instance;
  }

  /**
   * Constructeur privé pour empêcher l'instanciation directe
   */
  private constructor() {
    console.debug("WebSocketSingleton initialized");
  }

  /**
   * Génère une clé unique pour une connexion WebSocket
   */
  private getConnectionKey(serverUrl: string, token: string): string {
    return `${serverUrl}:${token}`;
  }

  /**
   * Obtient ou crée une connexion WebSocket
   * Utilise un système de comptage de références pour gérer la durée de vie des connexions
   */
  public async getConnection(
    options: WebSocketSetupOptions,
  ): Promise<WebSocketConnection> {
    const { serverUrl, token } = options;
    const connectionKey = this.getConnectionKey(serverUrl, token);

    // Incrémenter le compteur de références pour cette connexion
    const currentRefCount = this.connectionRefs.get(connectionKey) || 0;
    this.connectionRefs.set(connectionKey, currentRefCount + 1);

    console.debug(
      `Connection ref count for ${connectionKey}: ${this.connectionRefs.get(connectionKey)}`,
    );

    // Si une connexion existe déjà, la réutiliser
    if (this.connections.has(connectionKey)) {
      console.debug(
        `Reusing existing WebSocket connection for ${connectionKey}`,
      );

      const existingConnection = this.connections.get(connectionKey)!;

      // Si la connexion est fermée et qu'aucune reconnexion n'est en cours, la recréer
      if (
        existingConnection.getState() === WebSocket.CLOSED &&
        !this.reconnecting.has(connectionKey)
      ) {
        console.debug(
          `Existing connection is closed, recreating for ${connectionKey}`,
        );
        this.connections.delete(connectionKey);
        return this.createConnection(options, connectionKey);
      }

      return existingConnection;
    }

    // Sinon, créer une nouvelle connexion
    return this.createConnection(options, connectionKey);
  }

  /**
   * Crée une nouvelle connexion WebSocket
   */
  private async createConnection(
    options: WebSocketSetupOptions,
    connectionKey: string,
  ): Promise<WebSocketConnection> {
    console.debug(`Creating new WebSocket connection for ${connectionKey}`);

    // Créer une connexion avec setupWebsocket
    const connection = await this.setupWebsocket(options, connectionKey);

    // Stocker la connexion
    this.connections.set(connectionKey, connection);

    return connection;
  }

  /**
   * Libère une connexion WebSocket
   * Ne ferme la connexion que lorsque plus aucun client ne l'utilise
   */
  public releaseConnection(serverUrl: string, token: string): void {
    const connectionKey = this.getConnectionKey(serverUrl, token);

    // Décrémenter le compteur de références
    const refCount = (this.connectionRefs.get(connectionKey) || 1) - 1;

    if (refCount <= 0) {
      // Si plus aucun client n'utilise cette connexion, la fermer
      console.debug(
        `Closing WebSocket connection for ${connectionKey} - no more clients`,
      );

      const connection = this.connections.get(connectionKey);
      if (connection) {
        connection.close();
        this.connections.delete(connectionKey);
      }

      this.connectionRefs.delete(connectionKey);
      this.reconnecting.delete(connectionKey);
    } else {
      // Sinon, mettre à jour le compteur
      this.connectionRefs.set(connectionKey, refCount);
      console.debug(
        `${refCount} clients still using connection ${connectionKey}`,
      );
    }
  }

  /**
   * Configure une connexion WebSocket avec toutes les options nécessaires
   */
  private async setupWebsocket(
    options: WebSocketSetupOptions,
    connectionId: string,
  ): Promise<WebSocketConnection> {
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
      `Setting up WebSocket connection to: ${serverUrl} (mode: ${mode}, id: ${connectionId})`,
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
        console.debug(`[WebSocket ${connectionId}] Creating new connection`);

        // Create new WebSocket instance
        const newSocket = new WebSocket(serverUrl);

        // Set timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (newSocket.readyState !== WebSocket.OPEN) {
            console.error(`[WebSocket ${connectionId}] Connection timeout`);
            newSocket.close();
            reject(new Error("WebSocket connection timeout"));
          }
        }, CONFIG.CONNECTION_TIMEOUT);

        // Handle successful connection
        newSocket.onopen = () => {
          clearTimeout(connectionTimeout);
          console.debug(`[WebSocket ${connectionId}] Connection established`);
          resolve(newSocket);
        };

        // Handle connection error
        newSocket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error(`[WebSocket ${connectionId}] Connection error:`, error);
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
      console.debug(`[WebSocket ${connectionId}] Authentication message sent`);
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
          console.debug(
            `[WebSocket ${connectionId}] Ping sent (seq: ${sequence - 1})`,
          );
        } else {
          // If socket is closed, clear the interval
          clearInterval(pingInterval);
          pingInterval = undefined;
        }
      }, CONFIG.PING_INTERVAL);
    };

    /**
     * Reconnects with exponential backoff
     * Maintenant avec suivi des reconnexions en cours
     */
    const reconnectWithBackoff = async () => {
      // Marquer cette connexion comme en cours de reconnexion
      this.reconnecting.add(connectionId);

      if (
        isReconnecting ||
        isClosedIntentionally ||
        reconnectAttempt >= CONFIG.MAX_RECONNECT_ATTEMPTS
      ) {
        this.reconnecting.delete(connectionId);
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
        `[WebSocket ${connectionId}] Reconnecting in ${delay}ms (attempt ${reconnectAttempt}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`,
      );

      try {
        // Wait for backoff delay
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Only attempt reconnection if we still have active references
        const refCount = this.connectionRefs.get(connectionId) || 0;
        if (refCount <= 0) {
          console.debug(
            `[WebSocket ${connectionId}] No more active references, skipping reconnection`,
          );
          this.reconnecting.delete(connectionId);
          return;
        }

        // Create and setup a new socket
        await setupSocketConnection();

        // Reset reconnect attempt counter on success
        reconnectAttempt = 0;
        console.debug(`[WebSocket ${connectionId}] Reconnection successful`);
      } catch (error) {
        console.error(
          `[WebSocket ${connectionId}] Reconnection failed:`,
          error,
        );

        // Try again if we haven't reached the max attempts
        if (reconnectAttempt < CONFIG.MAX_RECONNECT_ATTEMPTS) {
          isReconnecting = false;
          void reconnectWithBackoff();
        } else {
          console.error(
            `[WebSocket ${connectionId}] Maximum reconnection attempts (${CONFIG.MAX_RECONNECT_ATTEMPTS}) reached`,
          );
          this.reconnecting.delete(connectionId);
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
              console.error(`[WebSocket ${connectionId}] Error response:`, msg);

              // Check if it's a sequence error, which might require reconnection
              if (msg.error?.id === "api.web_socket_router.bad_seq.app_error") {
                console.warn(
                  `[WebSocket ${connectionId}] Sequence error detected, reconnecting`,
                );
                newSocket.close();
                return;
              }

              return; // Don't propagate error messages
            }

            // Process different message types
            if (msg.event === "hello") {
              console.debug(
                `[WebSocket ${connectionId}] Authentication successful`,
              );

              // On succès d'authentification, on n'est plus en cours de reconnexion
              this.reconnecting.delete(connectionId);
            }
            // Pass messages to callback
            else if (onMessage) {
              onMessage(msg);
            }
          } catch (err) {
            console.error(
              `[WebSocket ${connectionId}] Error processing message:`,
              err,
            );
          }
        };

        // Set up error handler
        newSocket.onerror = (error) => {
          console.error(`[WebSocket ${connectionId}] Error:`, error);
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
          console.debug(
            `[WebSocket ${connectionId}] Connection closed:`,
            event.code,
            event.reason,
          );

          // Clean up resources
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = undefined;
          }

          // Notify listeners
          if (onClose) onClose(event);

          // Try to reconnect on unexpected close
          if (
            !isClosedIntentionally &&
            event.code !== 1000 &&
            !isReconnecting
          ) {
            // 1000 is normal closure
            void reconnectWithBackoff();
          }
        };

        // Authenticate and set up ping interval
        await authenticate();
        setupPingInterval();

        return newSocket;
      } catch (error) {
        console.error(
          `[WebSocket ${connectionId}] Failed to setup connection:`,
          error,
        );
        throw error;
      }
    };

    // Initial socket setup
    await setupSocketConnection();

    return {
      // Close the connection
      close: () => {
        console.debug(
          `[WebSocket ${connectionId}] Closing connection intentionally`,
        );
        isClosedIntentionally = true;

        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = undefined;
        }

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close(1000, "Connection closed by client");
        }

        // Supprimer les états de reconnexion
        this.reconnecting.delete(connectionId);
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
  }
}

/**
 * Fonction pour configurer et obtenir une connexion WebSocket partagée
 * Utilise le singleton pour garantir une seule connexion par paire (serverUrl, token)
 *
 * @param options - Options de configuration WebSocket
 * @returns Une Promise résolvant vers l'interface de connexion WebSocket
 */
export const setupWebsocket = async (
  options: WebSocketSetupOptions,
): Promise<WebSocketConnection> => {
  // Obtenir l'instance singleton
  const singleton = WebSocketSingleton.getInstance();

  try {
    // Obtenir ou créer une connexion
    return await singleton.getConnection(options);
  } catch (error) {
    console.error("Error setting up WebSocket connection:", error);
    throw error;
  }
};

/**
 * Libère une connexion WebSocket
 * À appeler lors du démontage de composants ou lorsque la connexion n'est plus nécessaire
 *
 * @param serverUrl - URL du serveur WebSocket
 * @param token - Token d'authentification
 */
export const releaseWebsocket = (serverUrl: string, token: string): void => {
  const singleton = WebSocketSingleton.getInstance();
  singleton.releaseConnection(serverUrl, token);
};

export default setupWebsocket;
