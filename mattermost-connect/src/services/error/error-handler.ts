// src/services/error/error-handler.ts

/**
 * Classe d'erreur de base pour MattermostConnect
 * Toutes les erreurs spécifiques étendent cette classe
 */
export class MattermostError extends Error {
  /**
   * Code de l'erreur pour identification
   */
  public readonly code: string;

  /**
   * Erreur originale qui a causé celle-ci (si applicable)
   */
  public readonly cause?: unknown;

  constructor(
    message: string,
    code: string = "MATTERMOST_ERROR",
    cause?: unknown,
  ) {
    super(message);
    this.name = "MattermostError";
    this.code = code;
    this.cause = cause;
    // Corriger la chaîne prototype pour la bonne instance d'erreur
    Object.setPrototypeOf(this, MattermostError.prototype);
  }
}

/**
 * Erreurs liées à l'authentification
 */
export class AuthError extends MattermostError {
  constructor(message: string, code: string = "AUTH_ERROR", cause?: unknown) {
    super(message, code, cause);
    this.name = "AuthError";
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Erreurs liées au réseau ou aux communications HTTP
 */
export class NetworkError extends MattermostError {
  /**
   * Code de statut HTTP (si applicable)
   */
  public readonly status?: number;

  constructor(
    message: string,
    status?: number,
    code: string = "NETWORK_ERROR",
    cause?: unknown,
  ) {
    super(message, code, cause);
    this.name = "NetworkError";
    this.status = status;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Erreurs de validation des données
 */
export class ValidationError extends MattermostError {
  /**
   * Champ qui a échoué à la validation (si applicable)
   */
  public readonly field?: string;

  /**
   * Erreurs de validation par champ (si disponible)
   */
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    field?: string,
    errors?: Record<string, string[]>,
    code: string = "VALIDATION_ERROR",
    cause?: unknown,
  ) {
    super(message, code, cause);
    this.name = "ValidationError";
    this.field = field;
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Erreurs liées aux autorisations et permissions
 */
export class PermissionError extends MattermostError {
  constructor(
    message: string,
    code: string = "PERMISSION_ERROR",
    cause?: unknown,
  ) {
    super(message, code, cause);
    this.name = "PermissionError";
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * Erreurs liées aux limites de taux et quotas
 */
export class RateLimitError extends MattermostError {
  /**
   * Délai suggéré avant de réessayer (en secondes)
   */
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    code: string = "RATE_LIMIT_ERROR",
    cause?: unknown,
  ) {
    super(message, code, cause);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Erreurs liées aux ressources non trouvées
 */
export class NotFoundError extends MattermostError {
  /**
   * Type de ressource non trouvée
   */
  public readonly resourceType?: string;

  /**
   * ID ou identifiant de la ressource
   */
  public readonly resourceId?: string;

  constructor(
    message: string,
    resourceType?: string,
    resourceId?: string,
    code: string = "NOT_FOUND_ERROR",
    cause?: unknown,
  ) {
    super(message, code, cause);
    this.name = "NotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Interface pour le gestionnaire d'erreurs
 */
export interface ErrorHandlerInterface {
  /**
   * Traite les erreurs HTTP et les convertit en erreurs typées
   * @param error Erreur à traiter
   * @returns Erreur typée
   */
  handleHttpError(error: unknown): Error;

  /**
   * Crée un message d'erreur approprié à partir de n'importe quelle erreur
   * @param error Erreur à formater
   * @returns Message d'erreur formaté
   */
  formatErrorMessage(error: unknown): string;

  /**
   * Détermine si une erreur est d'un type spécifique
   * @param error Erreur à vérifier
   * @param errorType Type d'erreur à vérifier
   * @returns true si l'erreur est du type spécifié
   */
  isErrorType(error: unknown, errorType: string): boolean;

  /**
   * Crée une erreur pour une ressource non trouvée
   * @param resourceType Type de ressource
   * @param resourceId ID de la ressource
   * @returns Erreur typée NotFoundError
   */
  createNotFoundError(resourceType: string, resourceId: string): NotFoundError;
}

/**
 * Implémentation du gestionnaire d'erreurs
 */
export class ErrorHandler implements ErrorHandlerInterface {
  /**
   * Traite les erreurs HTTP et les convertit en erreurs typées selon le code d'état
   */
  handleHttpError(error: unknown): Error {
    // Si c'est déjà une de nos erreurs typées, la retourner directement
    if (error instanceof MattermostError) {
      return error;
    }

    // Extraire les informations si c'est une erreur HTTP avec un statut
    if (error && typeof error === "object" && "status" in error) {
      const httpError = error as any;
      const status = httpError.status;
      const data = httpError.data || {};
      const headers = httpError.headers || {};

      // Trouver le message d'erreur le plus approprié
      let message =
        data.message || data.error || this.formatErrorMessage(error);

      // Traiter selon le code d'état HTTP
      switch (status) {
        case 400:
          // Erreur de validation
          const fieldErrors = data.errors || {};
          return new ValidationError(
            `Validation error: ${message}`,
            data.field,
            fieldErrors,
            "VALIDATION_ERROR",
            error,
          );

        case 401:
          // Erreur d'authentification
          return new AuthError(
            `Authentication error: ${message || "Invalid or expired token"}`,
            "AUTH_UNAUTHORIZED",
            error,
          );

        case 403:
          // Erreur de permission
          return new PermissionError(
            `Permission denied: ${message || "Insufficient privileges"}`,
            "AUTH_FORBIDDEN",
            error,
          );

        case 404:
          // Ressource non trouvée
          return new NotFoundError(
            `Resource not found: ${message || "The requested resource does not exist"}`,
            data.resourceType || "unknown",
            data.resourceId,
            "RESOURCE_NOT_FOUND",
            error,
          );

        case 429:
          // Limite de taux dépassée
          const retryAfter = parseInt(headers["retry-after"] || "60", 10);
          return new RateLimitError(
            `Rate limit exceeded: ${message || "Too many requests"}`,
            retryAfter,
            "RATE_LIMIT_EXCEEDED",
            error,
          );

        case 500:
        case 502:
        case 503:
        case 504:
          // Erreurs serveur
          return new NetworkError(
            `Server error: ${message || "The server encountered an error"}`,
            status,
            "SERVER_ERROR",
            error,
          );

        default:
          // Autres erreurs HTTP
          return new NetworkError(
            `Network error: ${message || `HTTP ${status}`}`,
            status,
            "HTTP_ERROR",
            error,
          );
      }
    }

    // Traiter les erreurs de connexion connues
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("timed out")
      ) {
        return new NetworkError(
          "Request timeout: Server is not responding",
          undefined,
          "REQUEST_TIMEOUT",
          error,
        );
      }

      if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("offline")
      ) {
        return new NetworkError(
          "Network error: Unable to connect to server",
          undefined,
          "CONNECTION_ERROR",
          error,
        );
      }

      // Erreur inconnue mais avec un message d'erreur
      return new MattermostError(
        this.formatErrorMessage(error),
        "UNKNOWN_ERROR",
        error,
      );
    }

    // Cas par défaut pour tout autre type d'erreur
    return new MattermostError(
      this.formatErrorMessage(error),
      "UNKNOWN_ERROR",
      error,
    );
  }

  /**
   * Formate un message d'erreur à partir de divers types d'erreurs
   */
  formatErrorMessage(error: unknown): string {
    // Cas simple : chaîne de caractères
    if (typeof error === "string") {
      return error;
    }

    // Erreur standard
    if (error instanceof Error) {
      return error.message || error.toString();
    }

    // Objet avec un message
    if (error && typeof error === "object") {
      if ("message" in error && typeof (error as any).message === "string") {
        return (error as any).message;
      }

      if ("error" in error && typeof (error as any).error === "string") {
        return (error as any).error;
      }

      if ("data" in error && typeof (error as any).data === "object") {
        const data = (error as any).data;
        if (data && typeof data.message === "string") {
          return data.message;
        }
        if (data && typeof data.error === "string") {
          return data.error;
        }
      }

      // Tenter de convertir l'objet en chaîne JSON
      try {
        return `Error: ${JSON.stringify(error)}`;
      } catch (e) {
        // Ignorer les erreurs de sérialisation
      }
    }

    // Valeur primitive non-chaîne
    if (error !== undefined && error !== null) {
      return String(error);
    }

    // Cas par défaut
    return "An unknown error occurred";
  }

  /**
   * Vérifie si une erreur est d'un type spécifique
   */
  isErrorType(error: unknown, errorType: string): boolean {
    if (!error) return false;

    // Vérifier le nom de la classe d'erreur
    if (error instanceof Error) {
      return (
        error.name === errorType ||
        (error instanceof MattermostError && error.code === errorType)
      );
    }

    return false;
  }

  /**
   * Crée une erreur pour une ressource non trouvée
   */
  createNotFoundError(resourceType: string, resourceId: string): NotFoundError {
    return new NotFoundError(
      `The ${resourceType} with ID '${resourceId}' was not found`,
      resourceType,
      resourceId,
      "RESOURCE_NOT_FOUND",
    );
  }
}

/**
 * Crée un gestionnaire d'erreurs
 * @returns Une instance du gestionnaire d'erreurs
 */
export function createErrorHandler(): ErrorHandlerInterface {
  return new ErrorHandler();
}

export default {
  MattermostError,
  AuthError,
  NetworkError,
  ValidationError,
  PermissionError,
  RateLimitError,
  NotFoundError,
  ErrorHandler,
  createErrorHandler,
};
