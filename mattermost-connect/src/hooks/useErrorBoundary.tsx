// src/hooks/useErrorBoundary.ts
/**
 * Hook pour gérer les erreurs dans les composants fonctionnels
 * Simule le comportement d'un ErrorBoundary dans un hook
 */
import { useState, useCallback } from "react";
import { useError } from "../providers/ErrorProvider";

/**
 * Interface de retour du hook useErrorBoundary
 */
interface UseErrorBoundaryReturn {
  /** Erreur courante (null si aucune) */
  error: Error | null;

  /** Fonction pour capturer une erreur */
  captureError: (error: unknown) => void;

  /** Fonction pour réinitialiser l'erreur */
  resetError: () => void;

  /** Fonction pour envelopper une opération asynchrone risquée */
  asyncBoundary: <T>(promise: Promise<T>) => Promise<T>;

  /** Fonction pour exécuter une fonction risquée */
  tryExec: <T>(fn: () => T) => T;
}

/**
 * Options pour le hook useErrorBoundary
 */
interface UseErrorBoundaryOptions {
  /** Callback appelé lorsqu'une erreur est capturée */
  onError?: (error: Error) => void;

  /** Callback appelé lorsque l'erreur est réinitialisée */
  onReset?: () => void;

  /** Journaliser les erreurs capturées */
  logErrors?: boolean;

  /** Contexte pour les erreurs rapportées */
  errorContext?: Record<string, any>;
}

/**
 * Type pour la fonction asyncBoundary
 */
type AsyncBoundaryFunction = <T>(promise: Promise<T>) => Promise<T>;

/**
 * Hook qui fournit des fonctionnalités de boundary d'erreur dans un composant fonctionnel
 *
 * @param options Options de configuration
 * @returns Interface pour gérer les erreurs
 *
 * @example
 * ```tsx
 * function DataComponent() {
 *   const { error, asyncBoundary, resetError } = useErrorBoundary();
 *   const [data, setData] = useState(null);
 *
 *   const fetchData = async () => {
 *     try {
 *       const result = await asyncBoundary(api.getData());
 *       setData(result);
 *     } catch (err) {
 *       // L'erreur a déjà été capturée par le boundary
 *     }
 *   };
 *
 *   if (error) {
 *     return (
 *       <div>
 *         <p>Error: {error.message}</p>
 *         <button onClick={resetError}>Try Again</button>
 *       </div>
 *     );
 *   }
 *
 *   return <div>{data ? <DataDisplay data={data} /> : <Spinner />}</div>;
 * }
 * ```
 */
export function useErrorBoundary(
  options: UseErrorBoundaryOptions = {},
): UseErrorBoundaryReturn {
  const { onError, onReset, logErrors = true, errorContext = {} } = options;
  const [error, setError] = useState<Error | null>(null);
  const { reportError } = useError();

  /**
   * Capture une erreur et la stocke dans l'état
   */
  const captureError = useCallback(
    (err: unknown) => {
      // Convertir l'erreur en objet Error si nécessaire
      const error = err instanceof Error ? err : new Error(String(err));

      // Journaliser l'erreur si demandé
      if (logErrors) {
        console.error("Error captured by boundary:", error);
      }

      // Définir l'erreur dans l'état
      setError(error);

      // Rapporter l'erreur au service d'erreur
      reportError(error, {
        source: "ErrorBoundary",
        ...errorContext,
      });

      // Appeler le callback onError si fourni
      if (onError) {
        onError(error);
      }
    },
    [onError, logErrors, reportError, errorContext],
  );

  /**
   * Réinitialise l'erreur
   */
  const resetError = useCallback(() => {
    setError(null);

    // Appeler le callback onReset si fourni
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  /**
   * Exécute une promesse et capture les erreurs
   * Utilise une syntaxe compatible avec TypeScript pour les génériques
   */
  const asyncBoundary = useCallback(
    async function <T>(promise: Promise<T>): Promise<T> {
      try {
        return await promise;
      } catch (err) {
        captureError(err);
        throw err;
      }
    },
    [captureError],
  );

  /**
   * Exécute une fonction et capture les erreurs
   */
  const tryExec = useCallback(
    function <T>(fn: () => T): T {
      try {
        return fn();
      } catch (err) {
        captureError(err);
        throw err;
      }
    },
    [captureError],
  );

  return {
    error,
    captureError,
    resetError,
    asyncBoundary,
    tryExec,
  };
}

/**
 * Options pour le hook useDataFetchBoundary
 */
interface UseDataFetchBoundaryOptions<T> extends UseErrorBoundaryOptions {
  /** Données initiales */
  initialData?: T;
}

/**
 * Résultat du hook useDataFetchBoundary
 */
interface UseDataFetchBoundaryResult<T> {
  /** Données chargées */
  data: T | undefined;

  /** Erreur survenue pendant le chargement */
  error: Error | null;

  /** Indique si un chargement est en cours */
  isLoading: boolean;

  /** Fonction pour charger des données */
  fetchData: <R>(fetcher: () => Promise<R>) => Promise<R | undefined>;

  /** Fonction pour réessayer le dernier chargement */
  retryFetch: <R>(fetcher?: () => Promise<R>) => Promise<R | undefined>;

  /** Fonction pour réinitialiser l'erreur */
  resetError: () => void;
}

/**
 * Type pour la fonction fetchData dans useDataFetchBoundary
 */
type FetchDataFunction = <R>(
  fetcher: () => Promise<R>,
) => Promise<R | undefined>;

/**
 * Version spécialisée du hook pour les opérations de données
 *
 * @param options Options de configuration
 * @returns Interface pour gérer les données et les erreurs
 *
 * @example
 * ```tsx
 * function ProductList() {
 *   const { data: products, error, isLoading, fetchData, retryFetch } =
 *     useDataFetchBoundary({ initialData: [] });
 *
 *   useEffect(() => {
 *     fetchData(() => api.getProducts());
 *   }, [fetchData]);
 *
 *   if (error) {
 *     return (
 *       <ErrorDisplay
 *         error={error}
 *         onRetry={() => retryFetch(() => api.getProducts())}
 *       />
 *     );
 *   }
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return <ProductGrid products={products || []} />;
 * }
 * ```
 */
export function useDataFetchBoundary<T>(
  options: UseDataFetchBoundaryOptions<T> = {},
): UseDataFetchBoundaryResult<T> {
  const { initialData, ...boundaryOptions } = options;
  const { error, resetError, asyncBoundary } =
    useErrorBoundary(boundaryOptions);
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetcher, setLastFetcher] = useState<(() => Promise<any>) | null>(
    null,
  );

  /**
   * Charge des données avec gestion d'erreur
   * Utilise une définition de fonction au lieu d'une arrow function pour éviter les problèmes de génériques
   */
  const fetchData = useCallback(
    function <R>(fetcher: () => Promise<R>): Promise<R | undefined> {
      setIsLoading(true);
      setLastFetcher(() => fetcher); // Stocker la fonction pour pouvoir la réexécuter

      return (async () => {
        try {
          const result = await asyncBoundary(fetcher());
          // Pour maintenir la cohérence des types, nous faisons un cast uniquement si c'est le même type
          if (
            typeof initialData === "undefined" ||
            typeof result === typeof initialData
          ) {
            setData(result as unknown as T);
          }
          return result;
        } catch (err) {
          // L'erreur est déjà capturée par asyncBoundary
          return undefined;
        } finally {
          setIsLoading(false);
        }
      })();
    },
    [asyncBoundary, initialData],
  );

  /**
   * Réessaie l'opération de chargement
   */
  const retryFetch = useCallback(
    function <R>(fetcher?: () => Promise<R>): Promise<R | undefined> {
      resetError();
      const fetcherToUse = fetcher || lastFetcher;
      if (!fetcherToUse) {
        console.warn("No fetcher available for retry");
        return Promise.resolve(undefined);
      }
      return fetchData(fetcherToUse);
    },
    [resetError, fetchData, lastFetcher],
  );

  return {
    data,
    error,
    isLoading,
    fetchData,
    retryFetch,
    resetError,
  };
}
