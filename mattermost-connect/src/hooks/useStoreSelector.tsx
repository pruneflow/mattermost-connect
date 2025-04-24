// src/hooks/useStoreSelector.ts
/**
 * Hook utilitaire optimisé pour sélectionner des données du store avec mémoisation
 * Évite les re-renders inutiles en comparant les valeurs précédentes
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Selector } from "../core/store/store";
import { getStore } from "../core/store/store";
import { shallowEqual } from "../core/utils/comparison";

/**
 * Options pour le hook useStoreSelector
 */
interface UseSelectorOptions<R> {
  /** Fonction de comparaison pour déterminer si la valeur a changé */
  equalityFn?: (a: R, b: R) => boolean;

  /** Si vrai, n'effectue la sélection que lorsque la dépendance change */
  memoize?: boolean;

  /** Profondeur maximale de comparaison si on utilise la comparaison profonde */
  maxDepth?: number;
}

/**
 * Fonction pour sélectionner et s'abonner à une partie du state store
 *
 * @param selector Fonction qui extrait des données du state
 * @param options Options de configuration (comparaison, mémoisation)
 * @returns Données sélectionnées du store
 *
 * @example
 * ```tsx
 * // Sélection simple
 * const isAuthenticated = useStoreSelector(state => state.auth.isAuthenticated);
 *
 * // Sélection avec comparaison personnalisée
 * const user = useStoreSelector(state => state.auth.currentUser, {
 *   equalityFn: (prev, next) => prev?.id === next?.id
 * });
 *
 * // Sélection avec mémoisation (moins efficace pour les sélections simples)
 * const channels = useStoreSelector(
 *   state => state.channels.channelsByTeam[teamId],
 *   { memoize: true }
 * );
 * ```
 */
export function useStoreSelector<S, R>(
  selector: Selector<S, R>,
  options: UseSelectorOptions<R> = {},
): R {
  // Options par défaut
  const { equalityFn = shallowEqual, memoize = false, maxDepth = 1 } = options;

  // Référence au store
  const store = getStore();

  // Mémoiser le sélecteur si demandé
  const memoizedSelector = useCallback(selector, memoize ? [] : [selector]);

  // État local qui sera mis à jour quand le store change
  const [selectedState, setSelectedState] = useState<R>(() =>
    memoizedSelector(store.getState() as S),
  );

  // Référence à la dernière valeur sélectionnée pour éviter les mises à jour inutiles
  const latestSelectedState = useRef<R>(selectedState);

  // Référence au sélecteur pour les comparaisons
  const latestSelector = useRef<Selector<S, R>>(memoizedSelector);

  // Référence à la fonction de comparaison
  const latestEqualityFn = useRef<(a: R, b: R) => boolean>(equalityFn);

  // Mettre à jour les références quand les fonctions changent
  useEffect(() => {
    latestSelector.current = memoizedSelector;
    latestEqualityFn.current = equalityFn;
  }, [memoizedSelector, equalityFn]);

  // S'abonner aux changements du store
  useEffect(() => {
    // Optimisation: si le sélecteur change, recalculer immédiatement
    const newSelectedState = latestSelector.current(store.getState() as S);

    // Ne mettre à jour que si la valeur a changé selon la fonction de comparaison
    if (
      !latestEqualityFn.current(newSelectedState, latestSelectedState.current)
    ) {
      latestSelectedState.current = newSelectedState;
      setSelectedState(newSelectedState);
    }

    // Fonction de vérification qui sera appelée quand le store change
    const checkForUpdates = () => {
      try {
        const newSelectedState = latestSelector.current(store.getState() as S);

        // Ne mettre à jour que si la valeur a changé selon la fonction de comparaison
        if (
          !latestEqualityFn.current(
            newSelectedState,
            latestSelectedState.current,
          )
        ) {
          latestSelectedState.current = newSelectedState;
          setSelectedState(newSelectedState);
        }
      } catch (err) {
        // En cas d'erreur dans le sélecteur, logger et réessayer au prochain changement
        console.error("Error in selector:", err);
      }
    };

    // S'abonner aux changements
    const unsubscribe = store.subscribe(checkForUpdates);

    // Se désabonner lors du démontage
    return unsubscribe;
  }, [store, memoizedSelector]);

  return selectedState;
}

/**
 * Version du hook optimisée pour les sélecteurs Factory
 *
 * @param selectorFactory Fonction factory qui crée un sélecteur
 * @param deps Dépendances pour la factory
 * @param options Options de configuration
 *
 * @example
 * ```tsx
 * // Utilisation avec des sélecteurs factory
 * const makeSelectUserById = () => (state, userId) => state.users.byId[userId];
 *
 * function UserComponent({ userId }) {
 *   const user = useStoreFactorySelector(makeSelectUserById, [userId]);
 *   // ...
 * }
 * ```
 */
export function useStoreFactorySelector<S, R, D extends any[]>(
  selectorFactory: (...deps: D) => (state: S, ...args: D) => R,
  deps: D,
  options: UseSelectorOptions<R> = {},
): R {
  // Créer un sélecteur mémoïsé qui applique les dépendances
  const memoizedSelector = useCallback(
    (state: S) => {
      const selector = selectorFactory(...deps);
      return selector(state, ...deps);
    },
    deps, // Dépend uniquement des dépendances passées
  );

  // Utiliser le hook standard avec notre sélecteur mémoïsé
  return useStoreSelector(memoizedSelector, { ...options, memoize: true });
}
