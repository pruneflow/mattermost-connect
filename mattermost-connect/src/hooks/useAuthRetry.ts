// src/hooks/useAuthRetry.ts
import { useState, useCallback } from "react";
import { useMattermost } from "../context/MattermostProvider";

interface UseAuthRetryOptions {
  /**
   * Nombre maximum de tentatives
   * @default 2
   */
  maxRetries?: number;

  /**
   * Délai entre les tentatives (en ms)
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Callback à appeler lorsqu'une erreur d'authentification se produit
   */
  onAuthError?: (error: Error) => void;

  /**
   * Callback à appeler lorsque la réauthentification a réussi
   */
  onAuthSuccess?: () => void;

  /**
   * Callback à appeler lorsque toutes les tentatives ont échoué
   */
  onMaxRetriesExceeded?: (error: Error) => void;
}

interface UseAuthRetryResult<T> {
  /**
   * Exécuter une fonction avec réessai automatique en cas d'erreur d'authentification
   */
  executeWithRetry: <R>(fn: () => Promise<R>) => Promise<R>;

  /**
   * Indique si une opération est en cours
   */
  isLoading: boolean;

  /**
   * La dernière erreur survenue
   */
  error: Error | null;

  /**
   * Réinitialiser l'état d'erreur
   */
  resetError: () => void;
}

/**
 * Hook personnalisé pour exécuter des opérations avec réessai automatique
 * en cas d'erreur d'authentification
 */
export const useAuthRetry = <T = unknown>(
  options: UseAuthRetryOptions = {},
): UseAuthRetryResult<T> => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    onAuthError,
    onAuthSuccess,
    onMaxRetriesExceeded,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { fileService } = useMattermost();

  /**
   * Vérifie si une erreur est liée à l'authentification
   */
  const isAuthError = useCallback((error: Error): boolean => {
    return (
      error.message.includes("401") ||
      error.message.includes("unauthorized") ||
      error.message.includes("session invalide") ||
      error.message.includes("invalid session")
    );
  }, []);

  /**
   * Tente de se réauthentifier en utilisant le service de fichiers amélioré
   */
  const attemptReauth = useCallback(async (): Promise<boolean> => {
    if (!fileService || !("handleAuthError" in fileService)) {
      return false;
    }

    try {
      return await (fileService as any).handleAuthError();
    } catch (error) {
      console.error(
        "Erreur lors de la tentative de réauthentification:",
        error,
      );
      return false;
    }
  }, [fileService]);

  /**
   * Exécute une fonction avec réessai automatique en cas d'erreur d'authentification
   */
  const executeWithRetry = useCallback(
    async <R>(fn: () => Promise<R>): Promise<R> => {
      setIsLoading(true);
      setError(null);

      let retryCount = 0;

      const execute = async (): Promise<R> => {
        try {
          return await fn();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));

          // Vérifier si c'est une erreur d'authentification et si on peut réessayer
          if (isAuthError(error) && retryCount < maxRetries) {
            retryCount++;

            // Notifier l'erreur d'authentification
            if (onAuthError) {
              onAuthError(error);
            }

            // Attendre le délai de réessai
            await new Promise((resolve) => setTimeout(resolve, retryDelay));

            // Tenter de se réauthentifier
            const reauthSuccess = await attemptReauth();

            if (reauthSuccess) {
              // Notifier le succès de la réauthentification
              if (onAuthSuccess) {
                onAuthSuccess();
              }

              // Réessayer la fonction
              return execute();
            }
          }

          // Si on atteint cette ligne, c'est qu'on ne peut pas réessayer
          setError(error);

          if (retryCount >= maxRetries && onMaxRetriesExceeded) {
            onMaxRetriesExceeded(error);
          }

          throw error;
        } finally {
          setIsLoading(false);
        }
      };

      return execute();
    },
    [
      isAuthError,
      attemptReauth,
      maxRetries,
      retryDelay,
      onAuthError,
      onAuthSuccess,
      onMaxRetriesExceeded,
    ],
  );

  /**
   * Réinitialise l'état d'erreur
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    executeWithRetry,
    isLoading,
    error,
    resetError,
  };
};

export default useAuthRetry;
