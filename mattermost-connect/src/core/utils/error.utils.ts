// src/core/utils/error.utils.ts
/**
 * Utilitaires pour la gestion des erreurs
 * Fournit des fonctions pour formater, transformer et analyser les erreurs
 */
import { EnhancedError } from "../services/error.service";
import { ApiError } from "../types/api.types";

/**
 * Crée une erreur API enrichie à partir d'une réponse
 *
 * @param response Réponse fetch ou objet d'erreur
 * @param url URL qui a généré l'erreur
 * @param method Méthode HTTP utilisée
 * @returns Erreur enrichie avec des détails sur la requête
 */
export function createApiError(
  response: Response | any,
  url: string,
  method: string = "GET",
): ApiError {
  // Si c'est déjà une erreur, l'enrichir
  if (response instanceof Error) {
    const apiError = response as ApiError;
    apiError.request = { url, method };

    if (!apiError.status && response instanceof Response) {
      apiError.status = response.status;
    }

    return apiError;
  }

  // Créer une nouvelle erreur à partir de la réponse
  const status = response instanceof Response ? response.status : undefined;
  const statusText =
    response instanceof Response ? response.statusText : undefined;

  const message = status
    ? `API Error: ${status} ${statusText || ""} for ${method} ${url}`
    : `API Error for ${method} ${url}`;

  const error = new Error(message) as ApiError;
  error.status = status;
  error.request = { url, method };

  // Ajouter la réponse si disponible
  if (response instanceof Response) {
    error.data = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? { _response: "JSON body not parsed" }
      : { _response: "Non-JSON response" };
  } else if (response) {
    error.data = response;
  }

  return error;
}

/**
 * Transforme une erreur en erreur enrichie avec métadonnées
 *
 * @param error Erreur originale
 * @param metadata Métadonnées à ajouter
 * @returns Erreur enrichie
 */
export function enhanceError(
  error: Error | string,
  metadata: Record<string, any> = {},
): EnhancedError {
  // Créer une erreur si une chaîne est passée
  const originalError = typeof error === "string" ? new Error(error) : error;

  // Copier les propriétés de l'erreur originale
  const enhancedError = originalError as EnhancedError;

  // Ajouter les métadonnées
  Object.entries(metadata).forEach(([key, value]) => {
    if (!(key in enhancedError)) {
      (enhancedError as any)[key] = value;
    }
  });

  // Ajouter un timestamp si non présent
  if (!enhancedError.timestamp) {
    enhancedError.timestamp = Date.now();
  }

  // Conserver la référence à l'erreur originale
  enhancedError.originalError = originalError;

  return enhancedError;
}

/**
 * Extrait un message d'erreur lisible d'une erreur
 *
 * @param error Erreur à traiter
 * @param defaultMessage Message par défaut si l'erreur n'a pas de message
 * @returns Message d'erreur formaté
 */
export function getErrorMessage(
  error: any,
  defaultMessage: string = "An unknown error occurred",
): string {
  if (!error) {
    return defaultMessage;
  }

  // Si c'est une erreur API avec un champ message dans les données
  if (
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object"
  ) {
    if ("message" in error.data && typeof error.data.message === "string") {
      return error.data.message;
    }
    if ("error" in error.data && typeof error.data.error === "string") {
      return error.data.error;
    }
    if ("detail" in error.data && typeof error.data.detail === "string") {
      return error.data.detail;
    }
  }

  // Si c'est une erreur standard
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // Si c'est un objet avec un message
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  // Si c'est une chaîne
  if (typeof error === "string") {
    return error;
  }

  // Sinon, convertir en chaîne
  try {
    return JSON.stringify(error) || defaultMessage;
  } catch (e) {
    return defaultMessage;
  }
}

/**
 * Catégorise l'erreur selon son type
 *
 * @param error Erreur à catégoriser
 * @returns Type d'erreur (network, auth, validation, server, etc.)
 */
export function categorizeError(error: any): string {
  // Erreurs réseau
  if (
    !navigator.onLine ||
    (error.message &&
      (error.message.includes("network") ||
        error.message.includes("connection") ||
        error.message.includes("offline")))
  ) {
    return "network";
  }

  // Erreurs d'authentification
  if (
    error.status === 401 ||
    error.status === 403 ||
    (error.message &&
      (error.message.toLowerCase().includes("unauthorized") ||
        error.message.toLowerCase().includes("forbidden") ||
        error.message.toLowerCase().includes("authentication") ||
        error.message.toLowerCase().includes("not logged in")))
  ) {
    return "auth";
  }

  // Erreurs de validation
  if (
    error.status === 400 ||
    (error.data &&
      (error.data.validation || error.data.errors || error.data.fields))
  ) {
    return "validation";
  }

  // Erreurs serveur
  if (error.status && error.status >= 500) {
    return "server";
  }

  // Ressource non trouvée
  if (error.status === 404) {
    return "not_found";
  }

  // Erreur de permission
  if (error.status === 403) {
    return "permission";
  }

  // Autres erreurs HTTP
  if (error.status) {
    return "http";
  }

  // Erreurs JavaScript
  if (error instanceof TypeError) {
    return "type";
  }
  if (error instanceof SyntaxError) {
    return "syntax";
  }
  if (error instanceof ReferenceError) {
    return "reference";
  }

  // Par défaut
  return "unknown";
}

/**
 * Génère des suggestions pour résoudre une erreur
 *
 * @param error Erreur à analyser
 * @returns Liste de suggestions pour résoudre l'erreur
 */
export function getSuggestions(error: any): string[] {
  const category = categorizeError(error);
  const suggestions: string[] = [];

  switch (category) {
    case "network":
      suggestions.push("Check your internet connection");
      suggestions.push("The server might be down, try again later");
      suggestions.push("If you're using a VPN, try disabling it");
      break;

    case "auth":
      suggestions.push("Your session may have expired, try logging in again");
      suggestions.push("Check if you have the necessary permissions");
      suggestions.push("Verify your credentials");
      break;

    case "validation":
      suggestions.push("Check the input values for errors");
      suggestions.push("Make sure all required fields are filled");
      suggestions.push("Verify that the data is in the correct format");
      break;

    case "server":
      suggestions.push("The server is experiencing issues, try again later");
      suggestions.push("Contact support if the problem persists");
      break;

    case "not_found":
      suggestions.push(
        "The requested resource might have been moved or deleted",
      );
      suggestions.push("Check the URL or identifier for typos");
      break;

    case "permission":
      suggestions.push("You don't have permission to access this resource");
      suggestions.push("Contact your administrator for access");
      break;

    default:
      suggestions.push("Try refreshing the page");
      suggestions.push("If the problem persists, contact support");
      break;
  }

  return suggestions;
}

/**
 * Fonction utilitaire qui exécute un callback et capture les erreurs
 *
 * @param callback Fonction à exécuter
 * @param onError Fonction à appeler en cas d'erreur (facultatif)
 * @returns Résultat du callback
 * @throws L'erreur originale
 */
export function tryCatch<T>(
  callback: () => T,
  onError?: (error: Error) => void,
): T {
  try {
    return callback();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    throw error;
  }
}

/**
 * Version asynchrone de tryCatch
 *
 * @param callback Fonction asynchrone à exécuter
 * @param onError Fonction à appeler en cas d'erreur (facultatif)
 * @returns Promise avec le résultat du callback
 * @throws L'erreur originale
 */
export async function tryCatchAsync<T>(
  callback: () => Promise<T>,
  onError?: (error: Error) => void,
): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    throw error;
  }
}

/**
 * Crée un wrapper de fonction qui capture les erreurs et les transmet à un service d'erreur
 *
 * @param fn Fonction à protéger
 * @param errorHandler Service d'erreur ou fonction de gestion d'erreur
 * @param context Contexte pour l'erreur
 * @returns Fonction protégée
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  errorHandler:
    | { handleError: (error: Error, context?: any) => void }
    | ((error: Error, context?: any) => void),
  context?: any,
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      const handler =
        typeof errorHandler === "function"
          ? errorHandler
          : errorHandler.handleError.bind(errorHandler);

      handler(
        error instanceof Error ? error : new Error(String(error)),
        context,
      );

      throw error;
    }
  };
}

/**
 * Version asynchrone de withErrorHandling
 */
export function withAsyncErrorHandling<
  T extends (...args: any[]) => Promise<any>,
>(
  fn: T,
  errorHandler:
    | { handleError: (error: Error, context?: any) => void }
    | ((error: Error, context?: any) => void),
  context?: any,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args);
    } catch (error) {
      const handler =
        typeof errorHandler === "function"
          ? errorHandler
          : errorHandler.handleError.bind(errorHandler);

      handler(
        error instanceof Error ? error : new Error(String(error)),
        context,
      );

      throw error;
    }
  };
}
