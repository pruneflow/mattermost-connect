// src/hooks/useStoreDispatch.ts
/**
 * Hook pour accéder à la fonction dispatch du store
 */
import { useCallback } from "react";
import { Dispatch, Action } from "../core/store/store";
import { getStore } from "../core/store/store";

/**
 * Hook qui fournit une référence stable à la fonction dispatch
 * @returns Fonction dispatch mémorisée
 */
export function useStoreDispatch(): Dispatch {
  const store = getStore();

  // Mémoiser la fonction dispatch pour éviter des re-renders inutiles
  const dispatch = useCallback(
    (action: Action) => store.dispatch(action),
    [store],
  );

  return dispatch;
}
