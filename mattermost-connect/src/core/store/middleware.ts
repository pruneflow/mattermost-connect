// src/core/store/middleware.ts
/**
 * Définition des middlewares pour le store
 * Permet d'intercepter les actions et d'effectuer des opérations asynchrones
 */

import { Action, Dispatch, Store } from "./store";

// Type du contexte fourni au middleware
export interface MiddlewareContext<S> {
  getState: () => S;
  dispatch: Dispatch;
}

// Type de base pour un middleware
export type Middleware<S> = (
  context: MiddlewareContext<S>,
) => (next: Dispatch) => (action: Action) => any;

/**
 * Middleware de journalisation
 * Utile pour le développement et le débogage
 */
export const loggerMiddleware = <S>({
  getState,
}: MiddlewareContext<S>): ((next: Dispatch) => (action: Action) => Action) => {
  return (next: Dispatch) => (action: Action) => {
    // Console groupée pour une meilleure lisibilité
    if (process.env.NODE_ENV !== "production") {
      console.group(`Action: ${action.type}`);
      console.log("Action payload:", action.payload);
      if (action.meta) {
        console.log("Action meta:", action.meta);
      }
      console.log("Previous state:", getState());
      const result = next(action);
      console.log("Next state:", getState());
      console.groupEnd();
      return result;
    }
    return next(action);
  };
};

/**
 * Middleware pour la gestion du cache
 * Permet de mettre en cache les résultats des requêtes et d'éviter les requêtes redondantes
 */
export const createCacheMiddleware = <S>(
  options: {
    ttl?: number; // Durée de vie du cache en ms (défaut: 5 minutes)
    maxSize?: number; // Taille maximum du cache (défaut: 100 entrées)
  } = {},
) => {
  const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes par défaut
  const maxSize = options.maxSize || 100;

  // Structure de cache avec LRU (Least Recently Used)
  type CacheEntry = {
    data: any;
    timestamp: number;
    key: string;
  };

  const cache = new Map<string, CacheEntry>();
  const keyOrder: string[] = [];

  // Fonction pour générer une clé de cache à partir d'une action
  const getCacheKey = (action: Action): string => {
    return `${action.type}_${JSON.stringify(action.payload || {})}`;
  };

  // Fonction pour vérifier si une entrée du cache est encore valide
  const isValidCacheEntry = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < ttl;
  };

  // Gestion de l'ordre LRU
  const touchEntry = (key: string): void => {
    const idx = keyOrder.indexOf(key);
    if (idx > -1) {
      keyOrder.splice(idx, 1);
    }
    keyOrder.push(key);

    // Supprimer les entrées les plus anciennes si le cache dépasse sa taille max
    while (keyOrder.length > maxSize) {
      const oldestKey = keyOrder.shift();
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
  };

  return ({ dispatch }: MiddlewareContext<S>) => {
    return (next: Dispatch) => (action: Action) => {
      // Nous gérons uniquement les actions de type 'FETCH_*' et 'CACHE_*'
      if (
        !action.type.startsWith("FETCH_") &&
        !action.type.startsWith("CACHE_")
      ) {
        return next(action);
      }

      // Actions spécifiques au cache
      if (action.type === "CACHE_CLEAR") {
        cache.clear();
        keyOrder.length = 0;
        return next(action);
      }

      if (action.type === "CACHE_INVALIDATE" && action.payload?.key) {
        const invalidateKey = action.payload.key;
        cache.delete(invalidateKey);
        const idx = keyOrder.indexOf(invalidateKey);
        if (idx > -1) {
          keyOrder.splice(idx, 1);
        }
        return next(action);
      }

      // Si c'est une action FETCH_* avec le flag forceRefresh, ignorons le cache
      if (action.payload?.forceRefresh) {
        return next(action);
      }

      // Générer la clé de cache
      const cacheKey = getCacheKey(action);

      // Vérifier si l'action est dans le cache et valide
      if (cache.has(cacheKey)) {
        const cacheEntry = cache.get(cacheKey)!;

        if (isValidCacheEntry(cacheEntry)) {
          // Mettre à jour l'ordre LRU
          touchEntry(cacheKey);

          // Dispatch d'une action de succès avec les données du cache
          const successAction = {
            type: action.type.replace("FETCH_", "FETCH_SUCCESS_"),
            payload: {
              ...action.payload,
              data: cacheEntry.data,
              fromCache: true,
            },
            meta: action.meta, // Préserver les métadonnées d'action
          };

          return dispatch(successAction);
        } else {
          // Supprimer l'entrée expirée
          cache.delete(cacheKey);
          const idx = keyOrder.indexOf(cacheKey);
          if (idx > -1) {
            keyOrder.splice(idx, 1);
          }
        }
      }

      // Si nous arrivons ici, nous devons continuer et potentiellement mettre à jour le cache
      const originalResult = next(action);

      // Si c'est une promesse, nous attendons sa résolution pour mettre à jour le cache
      if (originalResult instanceof Promise) {
        return originalResult.then((result) => {
          // Si le résultat est un succès, mise à jour du cache
          if (result && result.type && result.type.includes("SUCCESS")) {
            cache.set(cacheKey, {
              data: result.payload?.data,
              timestamp: Date.now(),
              key: cacheKey,
            });

            touchEntry(cacheKey);
          }

          return result;
        });
      }

      return originalResult;
    };
  };
};

/**
 * Middleware pour la gestion des effets asynchrones (thunks)
 * Permet de dispatcher des fonctions qui peuvent effectuer des opérations asynchrones
 */
export const thunkMiddleware = <S>({
  dispatch,
  getState,
}: MiddlewareContext<S>) => {
  return (next: Dispatch) => (action: Action) => {
    // Si l'action est une fonction, l'exécuter avec dispatch et getState
    if (typeof action === "function") {
      return action(dispatch, getState);
    }

    // Sinon, continuer normalement
    return next(action);
  };
};

/**
 * Middleware pour la gestion des WebSockets
 * Gère la connexion, la déconnexion et les messages WebSocket
 */
export const createWebSocketMiddleware = <S>(
  options: {
    // Action types
    connectType?: string;
    disconnectType?: string;
    messageType?: string;
    sendType?: string;
    // Callbacks
    onConnect?: (socket: WebSocket) => void;
    onDisconnect?: (event: CloseEvent) => void;
    onMessage?: (message: any) => Action | null;
    onError?: (error: Event) => void;
  } = {},
) => {
  // Options par défaut
  const connectType = options.connectType || "WS_CONNECT";
  const disconnectType = options.disconnectType || "WS_DISCONNECT";
  const messageType = options.messageType || "WS_MESSAGE";
  const sendType = options.sendType || "WS_SEND";

  // État du middleware
  let socket: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;

  // Backoff exponentiel pour les reconnexions
  const getReconnectDelay = (): number => {
    return Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  };

  // Fonction pour nettoyer les ressources
  const cleanup = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onopen = null;

      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
      socket = null;
    }
  };

  return ({ dispatch }: MiddlewareContext<S>) => {
    return (next: Dispatch) => (action: Action) => {
      switch (action.type) {
        case connectType: {
          // Nettoyer toute connexion existante
          cleanup();

          // Extraire l'URL et le protocole des options
          const { url, protocols, reconnect = true } = action.payload || {};

          if (!url) {
            throw new Error("URL is required for WebSocket connection");
          }

          try {
            // Créer la nouvelle connexion
            socket = new WebSocket(url, protocols);
            reconnectAttempts = 0;

            // Configurer les gestionnaires d'événements
            socket.onopen = (event) => {
              dispatch({
                type: "WS_CONNECTED",
                payload: { url, protocols, timestamp: Date.now() },
                meta: action.meta, // Préserver les métadonnées
              });
              if (options.onConnect) {
                options.onConnect(socket!);
              }
            };

            socket.onclose = (event) => {
              if (options.onDisconnect) {
                options.onDisconnect(event);
              }

              dispatch({
                type: "WS_DISCONNECTED",
                payload: { code: event.code, reason: event.reason },
                meta: action.meta, // Préserver les métadonnées
              });

              // Tentative de reconnexion si activée
              if (reconnect && reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = getReconnectDelay();

                console.log(
                  `WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempts})`,
                );

                reconnectTimeout = setTimeout(() => {
                  dispatch({
                    type: connectType,
                    payload: { url, protocols, reconnect },
                    meta: action.meta, // Préserver les métadonnées
                  });
                }, delay);
              }
            };

            socket.onmessage = (event) => {
              try {
                const message = JSON.parse(event.data);

                // Dispatcher l'action de message WebSocket
                dispatch({
                  type: messageType,
                  payload: message,
                  meta: {
                    ...action.meta, // Préserver les métadonnées originales
                    websocket: true,
                  },
                });

                // Appeler le callback personnalisé si fourni
                if (options.onMessage) {
                  const actionToDispatch = options.onMessage(message);
                  if (actionToDispatch) {
                    dispatch(actionToDispatch);
                  }
                }
              } catch (error) {
                console.error("Error processing WebSocket message:", error);
              }
            };

            socket.onerror = (error) => {
              dispatch({
                type: "WS_ERROR",
                payload: { error },
                meta: action.meta, // Préserver les métadonnées
              });
              if (options.onError) {
                options.onError(error);
              }
            };
          } catch (error) {
            console.error("WebSocket connection error:", error);
            dispatch({
              type: "WS_CONNECTION_FAILED",
              payload: { error },
              meta: action.meta, // Préserver les métadonnées
            });
          }

          return next(action);
        }

        case disconnectType: {
          if (socket) {
            // Indiquer une déconnexion volontaire
            const intentionalDisconnect = true;

            socket.close(1000, "Disconnected by user");
            socket = null;

            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }

            return next({
              ...action,
              payload: {
                ...action.payload,
                intentional: true,
              },
            });
          }
          return next(action);
        }

        case sendType: {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error("WebSocket is not connected");
            return next({
              type: "WS_SEND_FAILED",
              payload: {
                ...action.payload,
                error: "WebSocket not connected",
              },
              meta: action.meta, // Préserver les métadonnées
            });
          }

          try {
            // Extraire le message à envoyer
            const { message } = action.payload;

            if (!message) {
              throw new Error("No message provided");
            }

            // Convertir en chaîne JSON si ce n'est pas déjà une chaîne
            const data =
              typeof message === "string" ? message : JSON.stringify(message);

            socket.send(data);
            return next(action);
          } catch (error) {
            console.error("Error sending WebSocket message:", error);
            return next({
              type: "WS_SEND_FAILED",
              payload: {
                ...action.payload,
                error,
              },
              meta: action.meta, // Préserver les métadonnées
            });
          }
        }

        default:
          return next(action);
      }
    };
  };
};

/**
 * Middleware pour les requêtes API
 * Transforme les actions FETCH en appels API avec gestion des erreurs
 */
export const createApiMiddleware = <S>(apiClient: any) => {
  return ({ dispatch }: MiddlewareContext<S>) => {
    return (next: Dispatch) => (action: Action) => {
      // Ne traiter que les actions de type "API_REQUEST"
      if (action.type !== "API_REQUEST") {
        return next(action);
      }

      const { endpoint, method, body, headers, onSuccess, onError, meta } =
        action.payload || {};

      // Dispatcher l'action indiquant le début de la requête
      dispatch({
        type: "API_REQUEST_START",
        payload: { endpoint, method, meta },
        meta: action.meta, // Préserver les métadonnées
      });

      // Exécuter la requête API
      return apiClient
        .request(endpoint, { method, body, headers })
        .then((response: any) => {
          // Dispatcher l'action de succès
          const successAction = {
            type: "API_REQUEST_SUCCESS",
            payload: {
              data: response.data,
              meta,
              endpoint,
            },
            meta: action.meta, // Préserver les métadonnées
          };

          dispatch(successAction);

          // Si une action de succès personnalisée est fournie, la dispatcher
          if (onSuccess) {
            dispatch({
              type: onSuccess,
              payload: {
                data: response.data,
                meta,
                endpoint,
              },
              meta: action.meta, // Préserver les métadonnées
            });
          }

          return successAction;
        })
        .catch((error: any) => {
          // Dispatcher l'action d'erreur
          const errorAction = {
            type: "API_REQUEST_ERROR",
            payload: {
              error,
              meta,
              endpoint,
            },
            meta: action.meta, // Préserver les métadonnées
          };

          dispatch(errorAction);

          // Si une action d'erreur personnalisée est fournie, la dispatcher
          if (onError) {
            dispatch({
              type: onError,
              payload: {
                error,
                meta,
                endpoint,
              },
              meta: action.meta, // Préserver les métadonnées
            });
          }

          return errorAction;
        });
    };
  };
};

/**
 * Middleware pour l'authentification
 * Intercepte les actions relatives à l'authentification pour gérer le token
 */
export const createAuthMiddleware = <S>(
  options: {
    storageKey?: string;
    refreshTokenAction?: string;
    logoutAction?: string;
    loginSuccessAction?: string;
  } = {},
) => {
  // Options par défaut
  const storageKey = options.storageKey || "mattermost_token";
  const refreshTokenAction = options.refreshTokenAction || "AUTH_REFRESH_TOKEN";
  const logoutAction = options.logoutAction || "AUTH_LOGOUT";
  const loginSuccessAction = options.loginSuccessAction || "AUTH_LOGIN_SUCCESS";

  return ({ dispatch }: MiddlewareContext<S>) => {
    return (next: Dispatch) => (action: Action) => {
      // Gérer l'action de login réussi
      if (action.type === loginSuccessAction && action.payload?.token) {
        try {
          // Stocker le token dans le localStorage
          localStorage.setItem(storageKey, action.payload.token);

          // Si un userId est présent, le stocker également
          if (action.payload.userId) {
            localStorage.setItem(
              `${storageKey}_user_id`,
              action.payload.userId,
            );
          }

          // Si un serverUrl est présent, le stocker également
          if (action.payload.serverUrl) {
            localStorage.setItem(
              `${storageKey}_server_url`,
              action.payload.serverUrl,
            );
          }
        } catch (error) {
          console.error("Error storing auth token:", error);
        }
      }

      // Gérer l'action de logout
      if (action.type === logoutAction) {
        try {
          // Supprimer le token du localStorage
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`${storageKey}_user_id`);
          localStorage.removeItem(`${storageKey}_server_url`);
        } catch (error) {
          console.error("Error removing auth token:", error);
        }
      }

      // Gérer l'action de rafraîchissement du token
      if (action.type === refreshTokenAction) {
        try {
          const token = localStorage.getItem(storageKey);

          if (token) {
            // Dispatcher une action avec le token récupéré
            dispatch({
              type: "AUTH_TOKEN_LOADED",
              payload: {
                token,
                userId: localStorage.getItem(`${storageKey}_user_id`),
                serverUrl: localStorage.getItem(`${storageKey}_server_url`),
              },
              meta: action.meta, // Préserver les métadonnées
            });
          } else {
            // Dispatcher une action indiquant qu'aucun token n'a été trouvé
            dispatch({
              type: "AUTH_NO_TOKEN",
              meta: action.meta, // Préserver les métadonnées
            });
          }
        } catch (error) {
          console.error("Error refreshing auth token:", error);
          dispatch({
            type: "AUTH_TOKEN_ERROR",
            payload: { error },
            meta: action.meta, // Préserver les métadonnées
          });
        }
      }

      return next(action);
    };
  };
};
