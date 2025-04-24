// src/core/store/store.config.ts
/**
 * Configuration et initialisation du store centralisé
 */
import { combineReducers, createStore } from "./store";
import { authReducer } from "./slices/auth.slice";
import { teamsReducer } from "./slices/teams.slice";
import { channelsReducer } from "./slices/channels.slice";
import { messagesReducer } from "./slices/messages.slice";
import { usersReducer } from "./slices/users.slice";

import {
  createApiMiddleware,
  createAuthMiddleware,
  createCacheMiddleware,
  createWebSocketMiddleware,
  loggerMiddleware,
  thunkMiddleware,
} from "./middleware";
import { ApiClient } from "../api/client";
import { WebSocketService } from "../services/ws.service";

export interface RootState {
  auth: ReturnType<typeof authReducer>;
  teams: ReturnType<typeof teamsReducer>;
  channels: ReturnType<typeof channelsReducer>;
  messages: ReturnType<typeof messagesReducer>;
  users: ReturnType<typeof usersReducer>;
}

/**
 * Combinaison de tous les reducers en un seul reducer racine
 */
export const rootReducer = combineReducers<RootState>({
  auth: authReducer,
  teams: teamsReducer,
  channels: channelsReducer,
  messages: messagesReducer,
  users: usersReducer,
});

/**
 * Crée et configure le store global
 */
export function configureStore(
  apiClient: ApiClient,
  webSocketService: WebSocketService,
) {
  // Configuration des middlewares
  const middlewares = [
    // Middleware pour les thunks (actions asynchrones)
    thunkMiddleware,

    // Middleware pour le cache
    createCacheMiddleware({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 200,
    }),

    // Middleware pour l'API
    createApiMiddleware(apiClient),

    // Middleware pour l'authentification
    createAuthMiddleware({
      storageKey: "mattermost_token",
    }),

    // Middleware pour les WebSockets
    createWebSocketMiddleware({
      onMessage: (message) => {
        // Traiter les messages WebSocket et les convertir en actions
        if (message && message.event) {
          return {
            type: `WS_EVENT_${message.event.toUpperCase()}`,
            payload: message.data,
          };
        }
        return null;
      },
    }),
  ];

  // Ajouter le logger uniquement en développement
  if (process.env.NODE_ENV !== "production") {
    middlewares.unshift(loggerMiddleware);
  }

  // Créer le store avec le reducer racine et les middlewares
  return createStore(
    rootReducer,
    undefined, // Pas d'état initial préchargé
    middlewares,
  );
}

/**
 * Exporte le type du store pour être utilisé dans les hooks
 */
export type AppStore = ReturnType<typeof configureStore>;

/**
 * Exporte le type de la fonction dispatch pour les thunks
 */
export type AppDispatch = AppStore["dispatch"];
