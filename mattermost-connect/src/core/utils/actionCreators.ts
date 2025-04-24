// src/core/store/utils/actionCreators.ts
/**
 * Utilitaires pour créer des actions typées et réutilisables
 * Facilite la création d'actions standardisées et type-safe
 */

import { Action } from "../store";

/**
 * Interface pour les actions de requête
 */
export interface RequestAction<T = any> extends Action {
  type: string;
  payload?: T;
  meta?: any;
}

/**
 * Interface pour les actions de succès
 */
export interface SuccessAction<T = any> extends Action {
  type: string;
  payload: {
    data: T;
    fromCache?: boolean;
    args?: any[];
  };
  meta?: any;
}

/**
 * Interface pour les actions d'erreur
 */
export interface ErrorAction extends Action {
  type: string;
  payload: {
    error: Error;
    args?: any[];
  };
  meta?: any;
}

/**
 * Crée un ensemble d'action creators pour un type d'action donné
 *
 * @param baseType Type de base pour les actions (ex: "USERS_FETCH")
 * @returns Objet contenant les action creators pour request, success et error
 *
 * @example
 * ```typescript
 * // Créer les actions pour la récupération des utilisateurs
 * const userActions = createAsyncActionCreators('USERS_FETCH');
 *
 * // Utiliser les actions
 * dispatch(userActions.request({ page: 1 }));
 * dispatch(userActions.success({ data: users, fromCache: true }));
 * dispatch(userActions.error({ error: new Error('Failed to fetch users') }));
 * ```
 */
export function createAsyncActionCreators<Req = any, Res = any>(
  baseType: string,
) {
  return {
    /**
     * Action creator pour la requête
     */
    request: (payload?: Req, meta?: any): RequestAction<Req> => ({
      type: `${baseType}_REQUEST`,
      payload,
      meta,
    }),

    /**
     * Action creator pour le succès
     */
    success: (
      payload: {
        data: Res;
        fromCache?: boolean;
        args?: any[];
      },
      meta?: any,
    ): SuccessAction<Res> => ({
      type: `${baseType}_SUCCESS`,
      payload,
      meta,
    }),

    /**
     * Action creator pour l'erreur
     */
    error: (
      payload: {
        error: Error;
        args?: any[];
      },
      meta?: any,
    ): ErrorAction => ({
      type: `${baseType}_ERROR`,
      payload,
      meta,
    }),
  };
}

/**
 * Crée un action creator typé
 *
 * @param type Type de l'action
 * @returns Fonction pour créer l'action avec payload typé
 *
 * @example
 * ```typescript
 * // Créer un action creator typé
 * const setActiveTeam = createAction<Team | null>('TEAMS_SET_ACTIVE');
 *
 * // Utiliser l'action creator
 * dispatch(setActiveTeam(team));
 * ```
 */
export function createAction<P = void>(type: string) {
  return (payload?: P): Action => ({
    type,
    payload,
  });
}

/**
 * Crée un action creator avec payload et meta
 *
 * @param type Type de l'action
 * @returns Fonction pour créer l'action avec payload et meta
 *
 * @example
 * ```typescript
 * // Créer un action creator avec meta
 * const setActiveTeam = createActionWithMeta<Team | null, { origin: string }>('TEAMS_SET_ACTIVE');
 *
 * // Utiliser l'action creator
 * dispatch(setActiveTeam(team, { origin: 'sidebar' }));
 * ```
 */
export function createActionWithMeta<P = void, M = any>(type: string) {
  return (payload?: P, meta?: M): Action => ({
    type,
    payload,
    meta,
  });
}

/**
 * Crée un ensemble d'action creators pour les opérations CRUD
 *
 * @param entityName Nom de l'entité (ex: "USER", "TEAM")
 * @returns Objet contenant tous les action creators CRUD
 *
 * @example
 * ```typescript
 * // Créer les actions CRUD pour les utilisateurs
 * const userActions = createCrudActions('USER');
 *
 * // Utiliser les actions
 * dispatch(userActions.fetchAll.request());
 * dispatch(userActions.fetchOne.request('user123'));
 * dispatch(userActions.create.request({ name: 'John' }));
 * ```
 */
export function createCrudActions<T = any, ID = string>(entityName: string) {
  const baseType = entityName.toUpperCase();

  return {
    fetchAll: createAsyncActionCreators<any, T[]>(`${baseType}_FETCH_ALL`),
    fetchOne: createAsyncActionCreators<ID, T>(`${baseType}_FETCH_ONE`),
    create: createAsyncActionCreators<Partial<T>, T>(`${baseType}_CREATE`),
    update: createAsyncActionCreators<{ id: ID; data: Partial<T> }, T>(
      `${baseType}_UPDATE`,
    ),
    delete: createAsyncActionCreators<ID, boolean>(`${baseType}_DELETE`),

    // Actions supplémentaires
    setActive: createAction<T | null>(`${baseType}_SET_ACTIVE`),
    clearActive: createAction(`${baseType}_CLEAR_ACTIVE`),
    reset: createAction(`${baseType}_RESET`),
    invalidateCache: createAction(`${baseType}_INVALIDATE_CACHE`),
  };
}

/**
 * Crée un action creator pour les transitions d'état
 *
 * @param entityName Nom de l'entité
 * @param fromState État initial
 * @param toState État cible
 * @returns Action creator pour la transition d'état
 *
 * @example
 * ```typescript
 * // Créer un action creator pour la transition d'état
 * const markMessageAsRead = createStateTransition('MESSAGE', 'unread', 'read');
 *
 * // Utiliser l'action creator
 * dispatch(markMessageAsRead('message123'));
 * ```
 */
export function createStateTransition<ID = string>(
  entityName: string,
  fromState: string,
  toState: string,
) {
  const type = `${entityName.toUpperCase()}_TRANSITION_${fromState.toUpperCase()}_TO_${toState.toUpperCase()}`;

  return (id: ID, meta?: any): Action => ({
    type,
    payload: {
      id,
      fromState,
      toState,
    },
    meta,
  });
}

/**
 * Crée un action creator pour gérer les événements WebSocket
 *
 * @param eventType Type d'événement WebSocket
 * @returns Action creator pour l'événement
 *
 * @example
 * ```typescript
 * // Créer un action creator pour l'événement WebSocket
 * const messagePosted = createWebSocketAction('posted');
 *
 * // Utiliser l'action creator
 * dispatch(messagePosted({ message: { id: '123', text: 'Hello' } }));
 * ```
 */
export function createWebSocketAction<T = any>(eventType: string) {
  const type = `WS_EVENT_${eventType.toUpperCase()}`;

  return (data: T): Action => ({
    type,
    payload: data,
    meta: {
      source: "websocket",
      event: eventType,
    },
  });
}

/**
 * Groupe d'actions liées et fortement typées
 */
export interface ActionGroup<S = any> {
  types: {
    [key: string]: string;
  };
  creators: {
    [key: string]: (...args: any[]) => Action;
  };
  reducer: (state: S, action: Action) => S;
}

/**
 * Crée un groupe d'actions avec reducer intégré
 *
 * @param namespace Espace de noms pour le groupe d'actions
 * @param actionCreators Map d'action creators
 * @param reducerHandlers Map de fonctions de réduction par type d'action
 * @param initialState État initial pour le reducer
 * @returns Groupe d'actions avec reducer
 *
 * @example
 * ```typescript
 * // Créer un groupe d'actions pour les messages
 * const messagesActions = createActionGroup(
 *   'messages',
 *   {
 *     setHighlighted: (messageId: string) => ({ payload: { messageId } }),
 *     clearHighlighted: () => ({}),
 *     markAsRead: (messageId: string) => ({ payload: { messageId } })
 *   },
 *   {
 *     setHighlighted: (state, action) => ({ ...state, highlightedId: action.payload.messageId }),
 *     clearHighlighted: (state) => ({ ...state, highlightedId: null }),
 *     markAsRead: (state, action) => ({
 *       ...state,
 *       unread: state.unread.filter(id => id !== action.payload.messageId)
 *     })
 *   },
 *   { highlightedId: null, unread: [] }
 * );
 *
 * // Utiliser le groupe d'actions
 * dispatch(messagesActions.creators.setHighlighted('msg123'));
 * ```
 */
export function createActionGroup<S = any>(
  namespace: string,
  actionCreators: {
    [key: string]: (...args: any[]) => Omit<Action, "type">;
  },
  reducerHandlers: {
    [key: string]: (state: S, action: Action) => S;
  },
  initialState: S,
): ActionGroup<S> {
  const types: { [key: string]: string } = {};
  const creators: { [key: string]: (...args: any[]) => Action } = {};

  // Créer les types et les creators
  Object.keys(actionCreators).forEach((key) => {
    const type = `${namespace.toUpperCase()}/${key}`;
    types[key] = type;

    creators[key] = (...args: any[]) => ({
      type,
      ...actionCreators[key](...args),
    });
  });

  // Créer le reducer
  const reducer = (state: S = initialState, action: Action): S => {
    const actionType = action.type;

    // Trouver la clé correspondant au type d'action
    const actionKey = Object.keys(types).find(
      (key) => types[key] === actionType,
    );

    if (actionKey && reducerHandlers[actionKey]) {
      return reducerHandlers[actionKey](state, action);
    }

    return state;
  };

  return {
    types,
    creators,
    reducer,
  };
}
