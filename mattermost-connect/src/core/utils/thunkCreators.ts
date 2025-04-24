// src/core/store/utils/thunkCreators.ts
/**
 * Utilitaires pour créer des thunks réutilisables
 * Réduit la duplication de code dans les thunks en fournissant des créateurs génériques
 */

import { Dispatch } from "../store";
import { ApiClient } from "../../api/client";
import { CacheService } from "../../services/cache.service";
import { getServices } from "../../services";

/**
 * Options pour les thunks de récupération de données
 */
export interface FetchThunkOptions {
  /** Force un rafraîchissement, ignore le cache */
  forceRefresh?: boolean;

  /** TTL personnalisé pour cette entrée de cache */
  cacheTtl?: number;

  /** Métadonnées de cache */
  cacheMeta?: Record<string, any>;

  /** Fonction de transformation des données avant mise en cache */
  transform?: (data: any) => any;

  /** Fonction de mappage des arguments en paramètres de requête */
  mapArgsToParams?: (...args: any[]) => Record<string, any>;

  /** Indique si on doit initialiser les données avant la requête */
  withInitialData?: boolean;

  /** Données initiales (ex: pour afficher un squelette) */
  initialData?: any;
}

/**
 * Crée un thunk pour récupérer des données avec gestion du cache
 *
 * @param actionType Préfixe du type d'action (ex: "USERS_FETCH")
 * @param apiCall Fonction qui effectue l'appel API
 * @param cacheKeyFn Fonction qui génère la clé de cache à partir des arguments
 * @returns Un thunk prêt à être utilisé
 *
 * @example
 * ```typescript
 * // Définir le thunk
 * const getUser = createFetchThunk(
 *   'USER_FETCH',
 *   (api, userId) => api.get(`users/${userId}`),
 *   userId => `user_${userId}`
 * );
 *
 * // Utiliser le thunk
 * dispatch(getUser(apiClient, cacheService, 'user123', {
 *   forceRefresh: true
 * }));
 * ```
 */
export function createFetchThunk<T = any, Args extends any[] = any[]>(
  actionType: string,
  apiCall: (api: ApiClient, ...args: Args) => Promise<T>,
  cacheKeyFn?: (...args: Args) => string,
) {
  return (
      apiClient: ApiClient,
      cacheService: CacheService,
      ...args: [...Args, FetchThunkOptions?]
    ) =>
    async (dispatch: Dispatch) => {
      // Extraire les options (dernier argument)
      const options: FetchThunkOptions =
        typeof args[args.length - 1] === "object" &&
        !Array.isArray(args[args.length - 1])
          ? (args.pop() as FetchThunkOptions)
          : {};

      // Extraire les vrais arguments de la fonction
      const functionArgs = args as Args;

      // Générer la clé de cache si une fonction est fournie
      const cacheKey = cacheKeyFn ? cacheKeyFn(...functionArgs) : "";

      // Dispatch de l'action de requête
      dispatch({
        type: `${actionType}_REQUEST`,
        payload: { args: functionArgs },
      });

      // Si withInitialData est vrai, dispatcher immédiatement les données initiales
      if (options.withInitialData && options.initialData !== undefined) {
        dispatch({
          type: `${actionType}_INITIAL`,
          payload: { data: options.initialData, args: functionArgs },
        });
      }

      try {
        // Utiliser le cache si disponible et si une clé de cache est définie
        if (cacheService && cacheKey && !options.forceRefresh) {
          const cacheResult = await cacheService.getOrFetch(
            cacheKey,
            async () => {
              const result = await apiCall(apiClient, ...functionArgs);
              return options.transform ? options.transform(result) : result;
            },
            {
              ttl: options.cacheTtl,
              forceRefresh: options.forceRefresh,
              meta: options.cacheMeta,
            },
          );

          // Dispatch du succès
          dispatch({
            type: `${actionType}_SUCCESS`,
            payload: {
              data: cacheResult.data,
              args: functionArgs,
              fromCache: cacheResult.fromCache,
            },
          });

          return cacheResult.data;
        } else {
          // Appel API sans cache
          const result = await apiCall(apiClient, ...functionArgs);
          const transformedResult = options.transform
            ? options.transform(result)
            : result;

          // Dispatch du succès
          dispatch({
            type: `${actionType}_SUCCESS`,
            payload: {
              data: transformedResult,
              args: functionArgs,
              fromCache: false,
            },
          });

          return transformedResult;
        }
      } catch (error) {
        // Dispatch de l'erreur
        dispatch({
          type: `${actionType}_ERROR`,
          payload: { error, args: functionArgs },
        });

        throw error;
      }
    };
}

/**
 * Crée un thunk pour créer ou mettre à jour une ressource
 *
 * @param actionType Préfixe du type d'action (ex: "USER_CREATE")
 * @param apiCall Fonction qui effectue l'appel API
 * @param onSuccessFn Fonction à exécuter après un succès
 * @returns Un thunk prêt à être utilisé
 *
 * @example
 * ```typescript
 * // Définir le thunk
 * const createUser = createMutationThunk(
 *   'USER_CREATE',
 *   (api, userData) => api.post('users', userData),
 *   (result, dispatch) => {
 *     // Mettre à jour la liste des utilisateurs
 *     dispatch({ type: 'USERS_LIST_INVALIDATE' });
 *   }
 * );
 *
 * // Utiliser le thunk
 * dispatch(createUser(apiClient, { name: 'John', email: 'john@example.com' }));
 * ```
 */
export function createMutationThunk<T = any, Args extends any[] = any[]>(
  actionType: string,
  apiCall: (api: ApiClient, ...args: Args) => Promise<T>,
  onSuccessFn?: (result: T, dispatch: Dispatch, ...args: Args) => void,
) {
  return (apiClient: ApiClient, ...args: Args) =>
    async (dispatch: Dispatch) => {
      dispatch({
        type: `${actionType}_REQUEST`,
        payload: { args },
      });

      try {
        const result = await apiCall(apiClient, ...args);

        dispatch({
          type: `${actionType}_SUCCESS`,
          payload: { data: result, args },
        });

        // Exécuter la fonction de succès si définie
        if (onSuccessFn) {
          onSuccessFn(result, dispatch, ...args);
        }

        return result;
      } catch (error) {
        dispatch({
          type: `${actionType}_ERROR`,
          payload: { error, args },
        });

        throw error;
      }
    };
}

/**
 * Crée un thunk pour supprimer une ressource
 *
 * @param actionType Préfixe du type d'action (ex: "USER_DELETE")
 * @param apiCall Fonction qui effectue l'appel API
 * @param cacheInvalidationFn Fonction pour invalider les entrées de cache reliées
 * @returns Un thunk prêt à être utilisé
 *
 * @example
 * ```typescript
 * // Définir le thunk
 * const deleteUser = createDeleteThunk(
 *   'USER_DELETE',
 *   (api, userId) => api.delete(`users/${userId}`),
 *   (cache, userId) => {
 *     cache.delete(`user_${userId}`);
 *     cache.deleteByPrefix('users_list');
 *   }
 * );
 *
 * // Utiliser le thunk
 * dispatch(deleteUser(apiClient, cacheService, 'user123'));
 * ```
 */
export function createDeleteThunk<Args extends any[] = any[]>(
  actionType: string,
  apiCall: (api: ApiClient, ...args: Args) => Promise<any>,
  cacheInvalidationFn?: (cache: CacheService, ...args: Args) => void,
) {
  return (apiClient: ApiClient, cacheService: CacheService, ...args: Args) =>
    async (dispatch: Dispatch) => {
      dispatch({
        type: `${actionType}_REQUEST`,
        payload: { args },
      });

      try {
        await apiCall(apiClient, ...args);

        // Invalider le cache si une fonction est fournie
        if (cacheService && cacheInvalidationFn) {
          cacheInvalidationFn(cacheService, ...args);
        }

        dispatch({
          type: `${actionType}_SUCCESS`,
          payload: { args },
        });

        return true;
      } catch (error) {
        dispatch({
          type: `${actionType}_ERROR`,
          payload: { error, args },
        });

        throw error;
      }
    };
}

/**
 * Crée un thunk pour batching d'actions
 *
 * @param thunks Liste des thunks à exécuter
 * @param options Options pour le batching
 * @returns Un thunk qui exécute tous les thunks spécifiés
 *
 * @example
 * ```typescript
 * // Définir le thunk
 * const initializeApp = createBatchThunk([
 *   thunks.fetchUser('currentUser'),
 *   thunks.fetchTeams(),
 *   thunks.fetchNotifications()
 * ], { parallel: true });
 *
 * // Utiliser le thunk
 * dispatch(initializeApp());
 * ```
 */
export function createBatchThunk(
  thunks: ((dispatch: Dispatch, getState: () => any) => any)[],
  options: {
    parallel?: boolean;
    onStart?: () => any;
    onComplete?: (results: any[]) => any;
    ignoreErrors?: boolean;
  } = {},
) {
  return () => async (dispatch: Dispatch, getState: () => any) => {
    const {
      parallel = false,
      onStart,
      onComplete,
      ignoreErrors = false,
    } = options;

    if (onStart) {
      dispatch(onStart());
    }

    try {
      let results: any[];

      if (parallel) {
        // Exécuter tous les thunks en parallèle
        const promises = thunks.map((thunk) => {
          try {
            return Promise.resolve(thunk(dispatch, getState));
          } catch (error) {
            return ignoreErrors ? Promise.resolve(null) : Promise.reject(error);
          }
        });

        results = await Promise.all(promises);
      } else {
        // Exécuter les thunks séquentiellement
        results = [];
        for (const thunk of thunks) {
          try {
            const result = await thunk(dispatch, getState);
            results.push(result);
          } catch (error) {
            if (!ignoreErrors) {
              throw error;
            }
            results.push(null);
          }
        }
      }

      if (onComplete) {
        dispatch(onComplete(results));
      }

      return results;
    } catch (error) {
      // En cas d'erreur, la propager
      throw error;
    }
  };
}

/**
 * Crée un thunk qui utilise les services globaux
 * Évite de passer les services en paramètres
 *
 * @param thunkFn Fonction thunk à exécuter avec les services
 * @returns Un thunk qui injecte automatiquement les services
 *
 * @example
 * ```typescript
 * // Définir le thunk
 * const getUserProfile = withServices((apiClient, cacheService, userId) =>
 *   createFetchThunk(
 *     'USER_PROFILE_FETCH',
 *     (api) => api.get(`users/${userId}`),
 *     () => `user_profile_${userId}`
 *   )(apiClient, cacheService)
 * );
 *
 * // Utiliser le thunk
 * dispatch(getUserProfile('user123'));
 * ```
 */
export function withServices<Args extends any[] = any[], R = any>(
  thunkFn: (
    apiClient: ApiClient,
    cacheService: CacheService,
    ...args: Args
  ) => (dispatch: Dispatch, getState: () => any) => Promise<R>,
) {
  return (...args: Args) =>
    (dispatch: Dispatch, getState: () => any) => {
      const { apiClient, cacheService } = getServices();
      return thunkFn(apiClient, cacheService, ...args)(dispatch, getState);
    };
}
