// src/core/store/middleware/error.middleware.ts
/**
 * Middleware pour capturer et gérer les erreurs dans les actions Redux
 * Permet d'intercepter et de traiter les erreurs de manière centralisée
 */
import { Action } from "../store";
import { MiddlewareContext } from "../middleware";
import { ErrorService } from "../../services/error.service";

/**
 * Options pour le middleware d'erreur
 */
interface ErrorMiddlewareOptions {
  /** Liste des types d'actions à surveiller */
  actionTypes?: string[] | RegExp;

  /** Types d'actions d'erreur (par défaut, les actions se terminant par _ERROR) */
  errorTypes?: string[] | RegExp;

  /** Ignorer certains types d'actions pour la gestion d'erreurs */
  ignoreTypes?: string[] | RegExp;

  /** Fonction pour extraire l'erreur de l'action */
  getError?: (action: Action) => Error | null;

  /** Fonction pour déterminer si une action contient une erreur */
  isErrorAction?: (action: Action) => boolean;

  /** Fonction pour extraire le contexte d'une action */
  getErrorContext?: (action: Action) => any;

  /** Logger les actions avec des erreurs */
  logErrors?: boolean;
}

/**
 * Vérifie si un type d'action correspond à un pattern
 */
function matchesPattern(type: string, pattern: string[] | RegExp): boolean {
  if (Array.isArray(pattern)) {
    return pattern.includes(type);
  }
  return pattern.test(type);
}

/**
 * Extrait l'erreur d'une action (fonction par défaut)
 */
function defaultGetError(action: Action): Error | null {
  // Si l'action a un payload d'erreur direct
  if (action.payload && action.payload instanceof Error) {
    return action.payload;
  }

  // Si l'action a un champ d'erreur dans le payload
  if (
    action.payload &&
    typeof action.payload === "object" &&
    "error" in action.payload
  ) {
    const error = action.payload.error;

    if (error instanceof Error) {
      return error;
    }

    if (typeof error === "string") {
      return new Error(error);
    }
  }

  return null;
}

/**
 * Détermine si une action est une action d'erreur (fonction par défaut)
 */
function defaultIsErrorAction(action: Action): boolean {
  // Vérifier si le type se termine par _ERROR
  return /(_ERROR|_FAILURE|_FAILED|FAILURE|ERROR)$/.test(action.type);
}

/**
 * Extrait le contexte d'une action (fonction par défaut)
 */
function defaultGetContext(action: Action): any {
  return {
    actionType: action.type,
    // Extraire les informations pertinentes du payload mais pas l'erreur complète
    ...(action.payload &&
    typeof action.payload === "object" &&
    "error" in action.payload
      ? Object.fromEntries(
          Object.entries(action.payload).filter(([key]) => key !== "error"),
        )
      : {}),
    meta: action.meta,
  };
}

/**
 * Crée un middleware pour gérer les erreurs dans les actions Redux
 *
 * @param errorService Service d'erreur pour le traitement
 * @param options Options de configuration
 * @returns Middleware Redux
 */
export function createErrorMiddleware<S>(
  errorService: ErrorService,
  options: ErrorMiddlewareOptions = {},
) {
  const {
    actionTypes,
    errorTypes = /(_ERROR|_FAILURE|_FAILED|FAILURE|ERROR)$/,
    ignoreTypes,
    getError = defaultGetError,
    isErrorAction = defaultIsErrorAction,
    getErrorContext = defaultGetContext,
    logErrors = true,
  } = options;

  return ({ getState }: MiddlewareContext<S>) => {
    return (next: (action: Action) => any) => (action: Action) => {
      // Ignorer les actions spécifiées
      if (ignoreTypes && matchesPattern(action.type, ignoreTypes)) {
        return next(action);
      }

      // Vérifier si l'action est à surveiller
      const shouldProcess =
        !actionTypes || matchesPattern(action.type, actionTypes);

      // Si l'action n'est pas à surveiller, la laisser passer
      if (!shouldProcess) {
        return next(action);
      }

      // Vérifier si c'est une action d'erreur
      const isError =
        (errorTypes && matchesPattern(action.type, errorTypes)) ||
        isErrorAction(action);

      // Si ce n'est pas une action d'erreur, la laisser passer
      if (!isError) {
        return next(action);
      }

      // Extraire l'erreur
      const error = getError(action);

      // Si une erreur est trouvée, la traiter
      if (error) {
        // Extraire le contexte
        const context = {
          ...getErrorContext(action),
          state: getState(),
        };

        // Journaliser l'erreur si demandé
        if (logErrors) {
          console.group(`Redux Error: ${action.type}`);
          console.error("Error:", error);
          console.info("Action:", action);
          console.info("Context:", context);
          console.groupEnd();
        }

        // Traiter l'erreur avec le service
        errorService.handleError(error, {
          source: "redux",
          actionType: action.type,
          ...context,
        });
      }

      // Laisser l'action continuer son chemin
      return next(action);
    };
  };
}

/**
 * Middleware simplifié pour les erreurs Redux
 * Utilise les configurations par défaut
 */
export function errorMiddleware<S>(errorService: ErrorService) {
  return createErrorMiddleware(errorService, {
    logErrors: process.env.NODE_ENV !== "production",
  });
}
