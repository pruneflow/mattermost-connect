// src/core/api/client.ts
/**
 * Client API centralisé pour toutes les communications avec le serveur Mattermost
 * Supporte les modes direct et proxy avec une interface unifiée
 */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  timeout?: number;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

type ApiMode = "direct" | "proxy" | "custom";

interface ApiClientConfig {
  // Mode direct
  serverUrl?: string;
  token?: string;

  // Mode proxy
  proxyUrl?: string;
  clientId?: string;
  userId?: string;

  // Général
  mode?: ApiMode;
  tokenProvider?: () => string | null | undefined;
  onError?: (error: any) => void;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private tokenProvider?: () => string | null | undefined;
  private token?: string;
  private mode: ApiMode;
  private onError?: (error: any) => void;
  private userId?: string;
  private clientId?: string;

  /**
   * Crée une nouvelle instance du client API
   */
  constructor(config: ApiClientConfig) {
    this.mode = config.mode || "direct";

    if (this.mode === "direct" && !config.serverUrl) {
      throw new Error("serverUrl is required for direct mode");
    }

    if (this.mode === "proxy" && (!config.proxyUrl || !config.clientId)) {
      throw new Error("proxyUrl and clientId are required for proxy mode");
    }

    // Configurer l'URL de base selon le mode
    this.baseUrl =
      this.mode === "direct"
        ? `${config.serverUrl}/api/v4`
        : config.proxyUrl || "";

    // Normaliser l'URL (supprimer le slash final si présent)
    this.baseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;

    // Configurer le fournisseur de token
    if (config.tokenProvider) {
      this.tokenProvider = config.tokenProvider;
    } else if (config.token) {
      this.token = config.token;
      this.tokenProvider = () => this.token;
    }

    // Configurer les en-têtes par défaut
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
    };

    // En mode proxy, ajouter les en-têtes spécifiques
    if (this.mode === "proxy") {
      this.clientId = config.clientId;
      this.userId = config.userId;

      if (this.clientId) {
        this.defaultHeaders["X-Mattermost-Client-ID"] = this.clientId;
      }

      if (this.userId) {
        this.defaultHeaders["X-Mattermost-User-ID"] = this.userId;
      }
    }

    this.onError = config.onError;
  }

  /**
   * Construire l'URL complète pour une requête
   */
  private getFullUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseUrl}/${normalizedPath}`;
  }

  /**
   * Ajouter l'en-tête d'authentification si nécessaire
   */
  private addAuthHeader(
    headers: Record<string, string>,
  ): Record<string, string> {
    if (!this.tokenProvider) {
      return headers;
    }

    const token = this.tokenProvider();
    if (!token) {
      return headers;
    }

    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Méthode principale pour les requêtes HTTP
   */
  public async request<T = any>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      body,
      headers = {},
      requireAuth = true,
      timeout = 30000, // Timeout par défaut: 30 secondes
    } = options;

    const fullUrl = this.getFullUrl(path);

    // Combiner les en-têtes
    let requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Ajouter l'en-tête d'authentification si nécessaire
    if (requireAuth) {
      requestHeaders = this.addAuthHeader(requestHeaders);
    }

    // Préparer les options de la requête
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    };

    // Gérer le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, requestOptions);

      // Construire un objet Map pour les en-têtes
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failure: Session invalid or expired");
        }

        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // Si le parsing échoue, continuer avec l'erreur par défaut
        }

        const errorMessage =
          errorData.message ||
          `HTTP Error: ${response.status} ${response.statusText}`;
        const error = new Error(errorMessage);
        Object.assign(error, {
          status: response.status,
          data: errorData,
        });

        if (this.onError) {
          this.onError(error);
        }

        throw error;
      }

      // Parser les données de la réponse
      let data: any;
      if (response.status === 204) {
        // No content
        data = null;
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`);
        if (this.onError) {
          this.onError(timeoutError);
        }
        throw timeoutError;
      }

      if (this.onError) {
        this.onError(error);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Effectue une requête GET
   */
  public async get<T = any>(
    path: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  /**
   * Effectue une requête POST
   */
  public async post<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  /**
   * Effectue une requête PUT
   */
  public async put<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  /**
   * Effectue une requête DELETE
   */
  public async delete<T = any>(
    path: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  /**
   * Méthode spéciale pour uploader des fichiers
   */
  public async uploadFiles(
    formData: FormData,
    path: string = "files",
  ): Promise<ApiResponse> {
    const fullUrl = this.getFullUrl(path);

    let headers: Record<string, string> = {};

    // En mode direct, ajouter l'en-tête d'authentification
    if (this.mode === "direct") {
      const token = this.tokenProvider ? this.tokenProvider() : null;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        throw new Error("Authentication token required for file upload");
      }
    }
    // En mode proxy, ajouter les en-têtes spécifiques
    else if (this.mode === "proxy") {
      if (this.clientId) {
        headers["X-Mattermost-Client-ID"] = this.clientId;
      }
      if (this.userId) {
        headers["X-Mattermost-User-ID"] = this.userId;
      }
    }

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `File upload error: ${response.status}`,
        );
      }

      const data = await response.json();

      // Construire un objet Map pour les en-têtes
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Met à jour le token d'authentification
   */
  public setToken(token: string | null): void {
    this.token = token || undefined;
  }

  /**
   * Met à jour l'ID utilisateur (pour le mode proxy)
   */
  public setUserId(userId: string | null): void {
    this.userId = userId || undefined;

    if (this.userId && this.mode === "proxy") {
      this.defaultHeaders["X-Mattermost-User-ID"] = this.userId;
    } else {
      delete this.defaultHeaders["X-Mattermost-User-ID"];
    }
  }

  /**
   * Récupère l'URL de base du serveur/proxy
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Récupère le mode du client API
   */
  public getMode(): ApiMode {
    return this.mode;
  }
}

/**
 * Crée un client API adapté à la configuration fournie
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
