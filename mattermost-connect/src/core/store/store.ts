// src/core/store/store.ts
/**
 * Store central inspiré de Redux mais sans dépendances externes
 * Gère l'état global de l'application avec une architecture proche de Redux
 */

import { Middleware } from "./middleware";

// Types de base pour le store
export type Action = {
  type: string;
  payload?: any;
};

export type Reducer<S> = (state: S, action: Action) => S;

export type Selector<S, R> = (state: S) => R;

export type Dispatch = (action: Action) => void;

export type Listener = () => void;

export type Store<S> = {
  getState: () => S;
  dispatch: Dispatch;
  subscribe: (listener: Listener) => () => void;
  replaceReducer: (nextReducer: Reducer<S>) => void;
};

let globalStore: Store<any> | null = null;

/**
 * Définit le store global pour l'application
 */
export function setStore<S>(store: Store<S>): void {
  globalStore = store;
}

/**
 * Récupère le store global
 */
export function getStore<S>(): Store<S> {
  if (!globalStore) {
    throw new Error("Store not initialized. Make sure to call setStore first.");
  }
  return globalStore as Store<S>;
}

/**
 * Crée un store centralisé pour la gestion d'état
 * @param reducer Fonction qui retourne le nouvel état basé sur une action
 * @param preloadedState État initial (optionnel)
 * @param middlewares Liste des middlewares à appliquer
 */
export function createStore<S>(
  reducer: Reducer<S>,
  preloadedState?: S,
  middlewares: Middleware<S>[] = [],
): Store<S> {
  // État actuel du store
  let currentState = preloadedState as S;
  let currentReducer = reducer;
  let listeners: Set<Listener> = new Set();
  let isDispatching = false;

  // Fonction pour obtenir l'état actuel
  function getState(): S {
    if (isDispatching) {
      throw new Error(
        "Vous ne pouvez pas appeler getState() pendant le traitement d'une action",
      );
    }
    return currentState;
  }

  // Dispatch de base sans middleware
  function baseDispatch(action: Action): Action {
    if (isDispatching) {
      throw new Error("Les reducers ne doivent pas dispatcher des actions");
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    // Notification des listeners
    listeners.forEach((listener) => listener());

    return action;
  }

  // Fonction dispatch avec application des middlewares
  let dispatch: Dispatch = (action: Action) => baseDispatch(action);

  // Application des middlewares (similaire à Redux)
  if (middlewares.length > 0) {
    const chain = middlewares.map((middleware) =>
      middleware({
        getState,
        dispatch: (action: Action) => dispatch(action),
      }),
    );

    // Composition des middlewares
    dispatch = chain.reduce(
      (prev, current) => (action: Action) => current(prev)(action),
      baseDispatch,
    );
  }

  // Abonnement aux changements d'état
  function subscribe(listener: Listener): () => void {
    if (isDispatching) {
      throw new Error(
        "Vous ne pouvez pas vous abonner au store pendant le traitement d'une action",
      );
    }

    listeners.add(listener);

    // Retourne une fonction pour se désabonner
    return () => {
      listeners.delete(listener);
    };
  }

  // Remplacer le reducer courant
  function replaceReducer(nextReducer: Reducer<S>): void {
    currentReducer = nextReducer;
    // Déclencher une action pour recalculer l'état
    dispatch({ type: "@@store/REPLACE" });
  }

  // Initialiser le store
  dispatch({ type: "@@store/INIT" });

  return {
    getState,
    dispatch,
    subscribe,
    replaceReducer,
  };
}

/**
 * Combine plusieurs reducers en un seul
 * @param reducers Objet avec des reducers par slice d'état
 */
export function combineReducers<S>(reducers: {
  [K in keyof S]: Reducer<S[K]>;
}): Reducer<S> {
  return (state: S = {} as S, action: Action): S => {
    const nextState: Partial<S> = {};
    let hasChanged = false;

    // Appliquer chaque reducer à sa portion d'état
    Object.entries(reducers).forEach(([key, reducer]) => {
      const previousStateForKey = state[key as keyof S];
      const nextStateForKey = reducer(previousStateForKey, action);

      nextState[key as keyof S] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    });

    return hasChanged ? (nextState as S) : state;
  };
}

/**
 * Crée une fonction pour dispatcher une action avec un type spécifique
 * @param type Type de l'action
 */
export function createAction<P = void>(type: string) {
  return (payload?: P): Action => ({
    type,
    payload,
  });
}

/**
 * Crée un sélecteur mémoïsé pour optimiser les performances
 */
export function createSelector<S, R1, Result>(
  selector1: Selector<S, R1>,
  resultFunc: (res1: R1) => Result,
): Selector<S, Result> {
  let lastInput1: R1;
  let lastResult: Result;
  let hasRun = false;

  return (state: S): Result => {
    const input1 = selector1(state);

    if (hasRun && input1 === lastInput1) {
      return lastResult;
    }

    lastInput1 = input1;
    lastResult = resultFunc(input1);
    hasRun = true;

    return lastResult;
  };
}

// Le sélecteur ci-dessus est simplifié. Pour des sélecteurs plus complexes
// avec plusieurs entrées, il faudrait implémenter une logique similaire
// mais avec plusieurs paramètres d'entrée.

/**
 * Crée un sélecteur pour une slice d'état spécifique
 */
export function createSliceSelector<State, SliceKey extends keyof State>(
  sliceKey: SliceKey,
): Selector<State, State[SliceKey]> {
  return (state: State) => state[sliceKey];
}

/**
 * Simplifie la création d'un reducer avec des handlers par action
 */
export function createReducer<S>(
  initialState: S,
  handlers: { [key: string]: (state: S, payload: any) => S },
): Reducer<S> {
  return (state = initialState, action: Action): S => {
    if (Object.prototype.hasOwnProperty.call(handlers, action.type)) {
      return handlers[action.type](state, action.payload);
    }
    return state;
  };
}

/**
 * Crée un écouteur pour appeler une fonction spécifique sur certains types d'actions
 */
export function createActionListener<S>(
  store: Store<S>,
  actionType: string,
  listener: (state: S, action: Action) => void,
): () => void {
  let currentState = store.getState();

  return store.subscribe(() => {
    const previousState = currentState;
    currentState = store.getState();

    if (currentState !== previousState) {
      // Le listener est appelé après un changement d'état
      // Nous devrions avoir un mécanisme pour suivre les actions
      // qui ont causé ce changement
      listener(currentState, { type: actionType });
    }
  });
}
