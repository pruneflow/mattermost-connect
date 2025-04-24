// src/hooks/useStoreSelector.ts
/**
 * Hook utilitaire pour sélectionner des données du store avec mémoisation
 * Évite les re-renders inutiles en comparant les valeurs précédentes
 */
import { useEffect, useRef, useState } from "react";
import { Selector } from "../core/store/store";
import { getStore } from "../core/store/store"; // Supposons que le store soit accessible via une fonction getStore

/**
 * Hook générique pour sélectionner des données du store et s'abonner aux changements
 * @param selector Fonction qui extrait des données du state
 * @param equalityFn Fonction optionnelle pour comparer l'ancien et le nouveau résultat
 * @returns Données sélectionnées du store
 */
export function useStoreSelector<S, R>(
  selector: Selector<S, R>,
  equalityFn: (a: R, b: R) => boolean = (a, b) => a === b,
): R {
  // Référence au store
  const store = getStore();

  // État local qui sera mis à jour quand le store change
  const [selectedState, setSelectedState] = useState<R>(() =>
    selector(store.getState() as S),
  );

  // Référence à la dernière valeur sélectionnée pour éviter les mises à jour inutiles
  const latestSelectedState = useRef<R>(selectedState);

  // Référence aux fonctions passées pour les comparer
  const latestSelector = useRef<Selector<S, R>>(selector);
  const latestEqualityFn = useRef<(a: R, b: R) => boolean>(equalityFn);

  // Mettre à jour les références quand les fonctions changent
  useEffect(() => {
    latestSelector.current = selector;
    latestEqualityFn.current = equalityFn;
  }, [selector, equalityFn]);

  // S'abonner aux changements du store
  useEffect(() => {
    // Fonction de vérification qui sera appelée quand le store change
    const checkForUpdates = () => {
      try {
        const newSelectedState = latestSelector.current(store.getState() as S);

        // Ne mettre à jour que si la valeur sélectionnée a changé
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
        // En cas d'erreur dans le sélecteur, forcer une mise à jour pour réessayer
        console.error("Error in selector:", err);
      }
    };

    // S'abonner aux changements
    const unsubscribe = store.subscribe(checkForUpdates);

    // Vérifier une fois immédiatement (pour le cas où le store aurait changé entre le moment où
    // le composant a été rendu et le moment où l'effet est exécuté)
    checkForUpdates();

    // Se désabonner lors du démontage
    return unsubscribe;
  }, [store]);

  return selectedState;
}
