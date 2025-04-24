// src/core/services/error.service.ts
/**
 * Service centralisé pour la gestion des erreurs
 * Responsable de la collecte, du traitement et de la notification des erreurs
 */

/**
 * Interface d'un gestionnaire d'erreurs
 */
export type ErrorHandler = (error: Error, context?: any) => void;

/**
 * Interface d'une erreur enrichie
 */
export interface EnhancedError extends Error {
  /** Code d'erreur pour identification */
  code?: string;

  /** Données additionnelles sur l'erreur */
  data?: any;

  /** Statut HTTP (pour les erreurs d'API) */
  status?: number;

  /** Origine de l'erreur */
  source?: string;

  /** Timestamp de l'erreur */
  timestamp?: number;

  /** Erreur originale (si c'est un wrapper) */
  originalError?: Error;
}

/**
 * Options pour la configuration du service d'erreurs
 */
export interface ErrorServiceOptions {
  /** Envoyer les erreurs à un service externe */
  enableReporting?: boolean;

  /** URL du service de rapport d'erreurs */
  reportingEndpoint?: string;

  /** Niveau de détail du logging (0-3) */
  logLevel?: number;

  /** Nombre maximal d'erreurs à conserver en mémoire */
  maxStoredErrors?: number;

  /** Envoyer automatiquement les erreurs non gérées */
  catchUnhandledErrors?: boolean;

  /** Filtrer certaines erreurs */
  errorFilter?: (error: Error) => boolean;
}

/**
 * Service de gestion centralisée des erreurs
 */
export class ErrorService {
  /** Handlers enregistrés pour les erreurs */
  private handlers: ErrorHandler[] = [];

  /** Dernières erreurs survenues */
  private recentErrors: Array<{
    error: EnhancedError;
    timestamp: number;
    context?: any;
  }> = [];

  /** Options du service */
  private options: ErrorServiceOptions;

  /**
   * Crée une nouvelle instance du service d'erreurs
   */
  constructor(options: ErrorServiceOptions = {}) {
    this.options = {
      enableReporting: false,
      logLevel: 2,
      maxStoredErrors: 10,
      catchUnhandledErrors: true,
      ...options,
    };

    // Capturer les erreurs non gérées si l'option est activée
    if (this.options.catchUnhandledErrors && typeof window !== "undefined") {
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Enregistre un gestionnaire d'erreurs
   *
   * @param handler Fonction à appeler lors d'une erreur
   * @returns Fonction pour désinscrire le handler
   */
  public registerHandler(handler: ErrorHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index !== -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Traite une erreur
   *
   * @param error Erreur à traiter
   * @param context Contexte de l'erreur (ex: composant, action)
   */
  public handleError(error: Error, context?: any): void {
    // Enrichir l'erreur avec des informations supplémentaires
    const enhancedError = this.enhanceError(error, context);

    // Enregistrer l'erreur dans la liste des erreurs récentes
    this.addToRecentErrors(enhancedError, context);

    // Notifier tous les handlers enregistrés
    this.notifyHandlers(enhancedError, context);

    // Logger l'erreur selon le niveau configuré
    this.logError(enhancedError, context);

    // Envoyer l'erreur au service de reporting si activé
    if (this.options.enableReporting) {
      this.reportError(enhancedError, context);
    }
  }

  /**
   * Récupère les erreurs récentes
   */
  public getRecentErrors(): Array<{
    error: EnhancedError;
    timestamp: number;
    context?: any;
  }> {
    return [...this.recentErrors];
  }

  /**
   * Récupère la dernière erreur survenue
   */
  public getLastError(): EnhancedError | null {
    return this.recentErrors.length > 0 ? this.recentErrors[0].error : null;
  }

  /**
   * Efface la liste des erreurs récentes
   */
  public clearErrors(): void {
    this.recentErrors = [];
  }

  /**
   * Configure les gestionnaires d'erreurs globaux
   */
  private setupGlobalErrorHandlers(): void {
    // Erreurs JavaScript non capturées
    window.addEventListener("error", (event: ErrorEvent) => {
      this.handleError(event.error || new Error(event.message), {
        source: "window.onerror",
        lineno: event.lineno,
        colno: event.colno,
        filename: event.filename,
      });
    });

    // Rejets de promesses non capturés
    window.addEventListener(
      "unhandledrejection",
      (event: PromiseRejectionEvent) => {
        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));

        this.handleError(error, {
          source: "unhandledrejection",
        });
      },
    );
  }

  /**
   * Enrichit une erreur avec des métadonnées supplémentaires
   */
  private enhanceError(error: Error, context?: any): EnhancedError {
    const enhancedError = error as EnhancedError;

    // Ajouter un timestamp si non présent
    if (!enhancedError.timestamp) {
      enhancedError.timestamp = Date.now();
    }

    // Ajouter la source si présente dans le contexte
    if (context?.source && !enhancedError.source) {
      enhancedError.source = context.source;
    }

    return enhancedError;
  }

  /**
   * Ajoute une erreur à la liste des erreurs récentes
   */
  private addToRecentErrors(error: EnhancedError, context?: any): void {
    // Ajouter l'erreur au début de la liste
    this.recentErrors.unshift({
      error,
      timestamp: Date.now(),
      context,
    });

    // Limiter la taille de la liste
    if (this.recentErrors.length > this.options.maxStoredErrors!) {
      this.recentErrors.pop();
    }
  }

  /**
   * Notifie tous les handlers enregistrés
   */
  private notifyHandlers(error: EnhancedError, context?: any): void {
    this.handlers.forEach((handler) => {
      try {
        handler(error, context);
      } catch (handlerError) {
        // Éviter les boucles infinies en cas d'erreur dans un handler
        console.error("Error in error handler:", handlerError);
      }
    });
  }

  /**
   * Journalise une erreur selon le niveau configuré
   */
  private logError(error: EnhancedError, context?: any): void {
    const { logLevel } = this.options;

    if (logLevel === 0) {
      return;
    }

    const errorInfo = {
      ...error,
      context,
    };

    if (logLevel === 1) {
      // Minimal logging
      console.error(`[Error] ${error.message}`);
    } else if (logLevel === 2) {
      // Standard logging
      console.error(`[Error] ${error.message}`, { error, context });
    } else {
      // Verbose logging
      console.group(`[Error] ${error.message}`);
      console.error("Error details:", errorInfo);
      console.error("Stack trace:", error.stack);
      console.groupEnd();
    }
  }

  /**
   * Envoie une erreur à un service externe
   */
  private reportError(error: EnhancedError, context?: any): void {
    // Filtrer l'erreur si un filtre est configuré
    if (this.options.errorFilter && !this.options.errorFilter(error)) {
      return;
    }

    // Préparer les données à envoyer
    const reportData = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      status: error.status,
      source: error.source,
      timestamp: error.timestamp,
      context: context ? JSON.stringify(context) : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Envoyer au point de terminaison configuré
    if (this.options.reportingEndpoint) {
      try {
        fetch(this.options.reportingEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reportData),
          // Ne pas attendre une réponse
          keepalive: true,
        }).catch((e) => {
          // Éviter les erreurs de reporting qui pourraient interrompre l'application
          console.error("Error reporting error:", e);
        });
      } catch (e) {
        // Ignore les erreurs de reporting
        console.error("Error reporting error:", e);
      }
    }
  }

  /**
   * Crée une fonction qui capture les erreurs d'une fonction asynchrone
   *
   * @param fn Fonction à protéger
   * @param context Contexte pour l'erreur
   * @returns Fonction protégée qui capturera les erreurs
   *
   * @example
   * ```typescript
   * const safeFunction = errorService.captureAsync(
   *   async () => await api.fetchData(),
   *   { source: 'fetchData' }
   * );
   *
   * // Utilisation
   * const result = await safeFunction();
   * ```
   */
  public captureAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: any,
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          context,
        );
        throw error;
      }
    };
  }

  /**
   * Crée une fonction qui capture les erreurs d'une fonction synchrone
   *
   * @param fn Fonction à protéger
   * @param context Contexte pour l'erreur
   * @returns Fonction protégée qui capturera les erreurs
   *
   * @example
   * ```typescript
   * const safeFunction = errorService.captureSync(
   *   () => JSON.parse(invalidJson),
   *   { source: 'parseData' }
   * );
   *
   * // Utilisation
   * try {
   *   const result = safeFunction();
   * } catch (error) {
   *   // L'erreur a été loggée et traitée mais est quand même propagée
   * }
   * ```
   */
  public captureSync<T extends (...args: any[]) => any>(
    fn: T,
    context?: any,
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>): ReturnType<T> => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          context,
        );
        throw error;
      }
    };
  }
}
