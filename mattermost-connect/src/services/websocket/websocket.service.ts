// src/services/websocket/websocket.service.ts
import { WebSocketConnection, WebSocketSetupOptions } from "../../types";

/**
 * Configuration pour le service WebSocket
 */
const CONFIG = {
  // Nombre maximum de tentatives de reconnexion
  MAX_RECONNECT_ATTEMPTS: 5,

  // Délai de base entre les tentatives de reconnexion (en ms)
  BASE_RECONNECT_DELAY: 1000,

  // Délai maximum entre les tentatives de reconnexion (en ms)
  MAX_RECONNECT_DELAY: 30000,

  // Intervalle de ping pour maintenir la connexion active (en ms)
  PING_INTERVAL: 30000,

  // Timeout pour les tentatives de connexion (en ms)
  CONNECTION_TIMEOUT: 10000,
};

/**
 * Classe Singleton pour gérer une seule instance de connexion WebSocket par URL/token
 * Permet de partager la connexion entre différents composants
 */
class WebSocketSingleton {
  private static instance: WebSocketSingleton | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();

  // Compteur de références pour les connexions
  private connectionRefs: Map<string, number> = new Map();

  // État pour les tentatives de reconnexion en cours
  private reconnecting: Set<string> = new Set();

  private pendingConnections: Map<string, Promise<WebSocketConnection>> =
    new Map();

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
    console.debug("WebSocketSingleton initialisé");
  }

  /**
   * Génère une clé unique pour une connexion WebSocket
   * Utilise uniquement l'URL et le token pour éviter les clés changeantes
   */
  private getConnectionKey(serverUrl: string, token: string): string {
    // CORRECTION: Utiliser la même méthode pour la création et la libération
    // S'assurer que l'URL ne contient pas déjà un protocole WebSocket
    const normalizedUrl = serverUrl.replace(/^(ws|wss):\/\//, "");
    return `${normalizedUrl}:${token}`;
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

    // Incrémenter le compteur de références
    const currentRefCount = this.connectionRefs.get(connectionKey) || 0;
    this.connectionRefs.set(connectionKey, currentRefCount + 1);

    console.debug(
      `Compteur de références de connexion pour ${connectionKey}: ${this.connectionRefs.get(connectionKey)}`,
    );

    // Vérifier si une connexion existe déjà
    if (this.connections.has(connectionKey)) {
      console.debug(
        `Réutilisation de la connexion WebSocket existante pour ${connectionKey}`,
      );
      const existingConnection = this.connections.get(connectionKey)!;

      // Si la connexion est fermée et qu'aucune reconnexion n'est en cours, la recréer
      if (
        existingConnection.getState() === WebSocket.CLOSED &&
        !this.reconnecting.has(connectionKey)
      ) {
        console.debug(
          `La connexion existante est fermée, recréation pour ${connectionKey}`,
        );
        this.connections.delete(connectionKey);
        // Supprimer aussi toute connexion en attente
        this.pendingConnections.delete(connectionKey);
        return this.createConnection(options, connectionKey);
      }

      return existingConnection;
    }

    // Vérifier si une connexion est en cours de création
    if (this.pendingConnections.has(connectionKey)) {
      console.debug(
        `Connexion en cours de création pour ${connectionKey}, attente...`,
      );
      return this.pendingConnections.get(connectionKey)!;
    }

    // Créer une nouvelle connexion
    const connectionPromise = this.createConnection(options, connectionKey);

    // Enregistrer la promesse de connexion en cours
    this.pendingConnections.set(connectionKey, connectionPromise);

    try {
      return await connectionPromise;
    } finally {
      // Supprimer de la liste des connexions en attente une fois terminé
      this.pendingConnections.delete(connectionKey);
    }
  }

  /**
   * Crée une nouvelle connexion WebSocket
   */
  private async createConnection(
    options: WebSocketSetupOptions,
    connectionKey: string,
  ): Promise<WebSocketConnection> {
    console.debug(
      `Création d'une nouvelle connexion WebSocket pour ${connectionKey}`,
    );

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
    // CORRECTION: Utiliser la même méthode pour la création et la libération
    const connectionKey = this.getConnectionKey(serverUrl, token);

    // Décrémenter le compteur de références
    const refCount = (this.connectionRefs.get(connectionKey) || 1) - 1;

    console.debug(
      `Libération de la connexion ${connectionKey}, nouveau compteur: ${refCount}`,
    );

    if (refCount <= 0) {
      // Si plus aucun client n'utilise cette connexion, la fermer
      console.debug(
        `Fermeture de la connexion WebSocket pour ${connectionKey} - plus aucun client`,
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
        `${refCount} clients utilisent encore la connexion ${connectionKey}`,
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

    // Valider les paramètres d'entrée
    if (!serverUrl) {
      throw new Error("L'URL du serveur WebSocket est requise");
    }

    console.debug(
      `Configuration de la connexion WebSocket vers: ${serverUrl} (mode: ${mode}, id: ${connectionId})`,
    );

    // Gestion d'état du WebSocket
    let socket: WebSocket | null = null;
    let pingInterval: number | undefined;
    let reconnectAttempt = 0;
    let isReconnecting = false;
    let isClosedIntentionally = false;

    // Compteur de séquence pour les messages - commence à 1 pour l'auth initiale
    let sequence = 1;

    /**
     * Crée une nouvelle connexion WebSocket
     */
    const createSocket = (): Promise<WebSocket> => {
      return new Promise((resolve, reject) => {
        console.debug(
          `[WebSocket ${connectionId}] Création d'une nouvelle connexion`,
        );

        // Créer une nouvelle instance WebSocket
        const newSocket = new WebSocket(serverUrl);

        // Définir un timeout pour la connexion
        const connectionTimeout = setTimeout(() => {
          if (newSocket.readyState !== WebSocket.OPEN) {
            console.error(`[WebSocket ${connectionId}] Timeout de connexion`);
            newSocket.close();
            reject(new Error("Timeout de connexion WebSocket"));
          }
        }, CONFIG.CONNECTION_TIMEOUT);

        // Gérer la connexion réussie
        newSocket.onopen = () => {
          clearTimeout(connectionTimeout);
          console.debug(`[WebSocket ${connectionId}] Connexion établie`);
          resolve(newSocket);
        };

        // Gérer l'erreur de connexion
        newSocket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error(
            `[WebSocket ${connectionId}] Erreur de connexion:`,
            error,
          );
          reject(error);
        };
      });
    };

    /**
     * Envoie le message d'authentification
     */
    const authenticate = async () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("Impossible de s'authentifier: WebSocket non connecté");
      }

      // Réinitialiser la séquence lors d'une nouvelle authentification
      sequence = 1;

      // Envoyer le challenge d'authentification avec la séquence 1
      const authMessage = {
        seq: sequence++,
        action: "authentication_challenge",
        data: {
          token,
        },
      };

      socket.send(JSON.stringify(authMessage));
      console.debug(
        `[WebSocket ${connectionId}] Message d'authentification envoyé`,
      );
    };

    /**
     * Configure l'intervalle de ping pour maintenir la connexion active
     */
    const setupPingInterval = () => {
      // Effacer tout intervalle existant
      if (pingInterval) {
        clearInterval(pingInterval);
      }

      // Configurer un ping périodique
      pingInterval = window.setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          const pingMessage = {
            seq: sequence++,
            action: "ping",
          };
          socket.send(JSON.stringify(pingMessage));
          console.debug(
            `[WebSocket ${connectionId}] Ping envoyé (seq: ${sequence - 1})`,
          );
        } else {
          // Si le socket est fermé, effacer l'intervalle
          clearInterval(pingInterval);
          pingInterval = undefined;
        }
      }, CONFIG.PING_INTERVAL);
    };

    /**
     * Reconnecte avec backoff exponentiel
     * Avec suivi des reconnexions en cours
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

      // Calculer le délai avec backoff exponentiel
      const delay = Math.min(
        CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt),
        CONFIG.MAX_RECONNECT_DELAY,
      );

      console.debug(
        `[WebSocket ${connectionId}] Reconnexion dans ${delay}ms (tentative ${reconnectAttempt}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`,
      );

      try {
        // Attendre le délai de backoff
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Ne tenter la reconnexion que si nous avons encore des références actives
        const refCount = this.connectionRefs.get(connectionId) || 0;
        if (refCount <= 0) {
          console.debug(
            `[WebSocket ${connectionId}] Plus aucune référence active, reconnexion ignorée`,
          );
          this.reconnecting.delete(connectionId);
          return;
        }

        // Créer et configurer un nouveau socket
        await setupSocketConnection();

        // Réinitialiser le compteur de tentatives en cas de succès
        reconnectAttempt = 0;
        console.debug(`[WebSocket ${connectionId}] Reconnexion réussie`);
      } catch (error) {
        console.error(
          `[WebSocket ${connectionId}] Échec de la reconnexion:`,
          error,
        );

        // Réessayer si nous n'avons pas atteint le nombre maximum de tentatives
        if (reconnectAttempt < CONFIG.MAX_RECONNECT_ATTEMPTS) {
          isReconnecting = false;
          void reconnectWithBackoff();
        } else {
          console.error(
            `[WebSocket ${connectionId}] Nombre maximum de tentatives de reconnexion (${CONFIG.MAX_RECONNECT_ATTEMPTS}) atteint`,
          );
          this.reconnecting.delete(connectionId);
        }
      } finally {
        isReconnecting = false;
      }
    };

    /**
     * Configure une nouvelle connexion socket avec tous les gestionnaires d'événements
     */
    const setupSocketConnection = async (): Promise<WebSocket> => {
      try {
        // Créer un nouveau socket
        const newSocket = await createSocket();
        socket = newSocket;

        // Configurer le gestionnaire de messages
        newSocket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            // Vérifier si c'est une réponse d'erreur
            if (msg.status === "FAIL") {
              console.error(
                `[WebSocket ${connectionId}] Réponse d'erreur:`,
                msg,
              );

              // Vérifier si c'est une erreur de séquence, qui peut nécessiter une reconnexion
              if (msg.error?.id === "api.web_socket_router.bad_seq.app_error") {
                console.warn(
                  `[WebSocket ${connectionId}] Erreur de séquence détectée, reconnexion`,
                );
                newSocket.close();
                return;
              }

              return; // Ne pas propager les messages d'erreur
            }

            // Traiter différents types de messages
            if (msg.event === "hello") {
              console.debug(
                `[WebSocket ${connectionId}] Authentification réussie`,
              );

              // Si authentification réussie, nous ne sommes plus en cours de reconnexion
              this.reconnecting.delete(connectionId);
            }
            // Transmettre les messages au callback
            else if (onMessage) {
              onMessage(msg);
            }
          } catch (err) {
            console.error(
              `[WebSocket ${connectionId}] Erreur de traitement du message:`,
              err,
            );
          }
        };

        // Configurer le gestionnaire d'erreurs
        newSocket.onerror = (error) => {
          console.error(`[WebSocket ${connectionId}] Erreur:`, error);
          if (onError) onError(error);

          // Tenter une reconnexion en cas d'erreur si pas déjà en cours
          if (
            newSocket.readyState !== WebSocket.OPEN &&
            !isReconnecting &&
            !isClosedIntentionally
          ) {
            void reconnectWithBackoff();
          }
        };

        // Configurer le gestionnaire de fermeture
        newSocket.onclose = (event) => {
          console.debug(
            `[WebSocket ${connectionId}] Connexion fermée:`,
            event.code,
            event.reason,
          );

          // Nettoyer les ressources
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = undefined;
          }

          // Notifier les écouteurs
          if (onClose) onClose(event);

          // Tenter une reconnexion en cas de fermeture inattendue
          if (
            !isClosedIntentionally &&
            event.code !== 1000 && // 1000 est la fermeture normale
            !isReconnecting
          ) {
            void reconnectWithBackoff();
          }
        };

        // Authentifier et configurer l'intervalle de ping
        await authenticate();
        setupPingInterval();

        return newSocket;
      } catch (error) {
        console.error(
          `[WebSocket ${connectionId}] Échec de la configuration de la connexion:`,
          error,
        );
        throw error;
      }
    };

    // Configuration initiale du socket
    await setupSocketConnection();

    return {
      // Fermer la connexion
      close: () => {
        console.debug(
          `[WebSocket ${connectionId}] Fermeture intentionnelle de la connexion`,
        );
        isClosedIntentionally = true;

        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = undefined;
        }

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close(1000, "Connexion fermée par le client");
        }

        // Supprimer les états de reconnexion
        this.reconnecting.delete(connectionId);
      },

      // Envoyer un message personnalisé
      send: (message: unknown) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket non connecté");
        }

        // Ajouter un numéro de séquence aux messages sortants
        const messageWithSeq =
          typeof message === "object" && message !== null
            ? { seq: sequence++, ...message }
            : { seq: sequence++, message };

        socket.send(JSON.stringify(messageWithSeq));
      },

      // Obtenir l'état de la connexion
      getState: () => {
        return socket ? socket.readyState : WebSocket.CLOSED;
      },

      // Forcer la reconnexion
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
 * Configure et obtient une connexion WebSocket partagée
 * Utilise le singleton pour garantir une seule connexion par paire (serverUrl, token)
 *
 * @param options Options de configuration WebSocket
 * @returns Promise résolvant vers l'interface de connexion WebSocket
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
    console.error(
      "Erreur lors de la configuration de la connexion WebSocket:",
      error,
    );
    throw error;
  }
};

/**
 * Libère une connexion WebSocket
 * À appeler lors du démontage de composants ou lorsque la connexion n'est plus nécessaire
 *
 * @param serverUrl URL du serveur WebSocket
 * @param token Token d'authentification
 */
export const releaseWebsocket = (serverUrl: string, token: string): void => {
  const singleton = WebSocketSingleton.getInstance();
  singleton.releaseConnection(serverUrl, token);
};

export default setupWebsocket;
