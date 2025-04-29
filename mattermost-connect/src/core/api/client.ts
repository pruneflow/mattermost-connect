// src/core/api/client.ts
/**
 * API client for Mattermost communication
 * Supports both direct and proxy modes with centralized configuration
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ApiMode = "direct" | "proxy";

/**
 * Options for API requests
 */
export interface RequestOptions {
  /** HTTP method to use */
  method?: HttpMethod;
  /** Request body */
  body?: any;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Query parameters for GET requests */
  params?: Record<string, any>;
}

/**
 * Structured API response
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * API Error type
 */
export interface ApiError extends Error {
  status?: number;
  data?: any;
  request?: {
    url: string;
    method: string;
  };
}

/**
 * Configuration options for the API client
 */
export interface ApiClientConfig {
  /** Mode of operation (direct or proxy) */
  mode?: ApiMode;
  /** Mattermost server URL (for direct mode) */
  serverUrl?: string;
  /** Authentication token */
  token?: string;
  /** Proxy URL (for proxy mode) */
  proxyUrl?: string;
  /** Client ID for proxy mode */
  clientId?: string;
  /** User ID for proxy mode */
  userId?: string;
  /** Default headers to include with all requests */
  defaultHeaders?: Record<string, string>;
  /** Callback for error handling */
  onError?: (error: any) => void;
}

/**
 * API client for making requests to Mattermost API
 * Supports both direct communication with Mattermost server and
 * communication via a proxy service
 */
class ApiClient {
  private baseUrl: string = "";
  private defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  private token?: string;
  private mode: ApiMode = "direct";
  private onError?: (error: any) => void;
  private userId?: string;
  private clientId?: string;

  /**
   * Configures the API client with the provided options
   * @param config Configuration options
   */
  public configure(config: ApiClientConfig): void {
    this.mode = config.mode || "direct";

    if (this.mode === "direct" && !config.serverUrl) {
      throw new Error("serverUrl is required for direct mode");
    }

    if (this.mode === "proxy" && (!config.proxyUrl || !config.clientId)) {
      throw new Error("proxyUrl and clientId are required for proxy mode");
    }

    // Configure base URL based on mode
    this.baseUrl =
      this.mode === "direct"
        ? `${config.serverUrl}/api/v4`
        : config.proxyUrl || "";

    // Normalize base URL (remove trailing slash)
    this.baseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;

    // Configure token if provided
    if (config.token) {
      this.token = config.token;
    }

    // Configure default headers
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
    };

    // Configure proxy-specific headers
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
   * Sets the authentication token
   * @param token Authentication token
   */
  public setToken(token: string | null): void {
    this.token = token || undefined;
  }

  /**
   * Sets the user ID (for proxy mode)
   * @param userId User ID
   */
  public setUserId(userId: string | null): void {
    this.userId = userId || undefined;

    if (this.userId && this.mode === "proxy") {
      this.defaultHeaders["X-Mattermost-User-ID"] = this.userId;
    } else {
      delete this.defaultHeaders["X-Mattermost-User-ID"];
    }
  }

  public getUserId() {
    return this.userId;
  }

  /**
   * Gets the current base URL
   * @returns The base URL
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Gets the current API mode
   * @returns The API mode
   */
  public getMode(): ApiMode {
    return this.mode;
  }

  /**
   * Constructs the full URL for a request
   * @param path API endpoint path
   * @returns Full URL
   */
  private getFullUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseUrl}/${normalizedPath}`;
  }

  /**
   * Adds authentication header if necessary
   * @param headers Current headers
   * @returns Headers with authentication if needed
   */
  private addAuthHeader(
    headers: Record<string, string>,
  ): Record<string, string> {
    if (!this.token) {
      return headers;
    }

    return {
      ...headers,
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Extracts headers from a response into a plain object
   * @param response Fetch response
   * @returns Headers as a plain object
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Handles error responses
   * @param response Fetch response
   * @returns Processed API error
   */
  private async handleErrorResponse(
    response: Response,
    url: string,
    method: string,
  ): Promise<ApiError> {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Continue with default error if parsing fails
    }

    const errorMessage =
      errorData.message ||
      `HTTP Error: ${response.status} ${response.statusText}`;
    const error = new Error(errorMessage) as ApiError;

    error.status = response.status;
    error.data = errorData;
    error.request = { url, method };

    if (this.onError) {
      this.onError(error);
    }

    return error;
  }

  /**
   * Makes an HTTP request to the API
   * @param path API endpoint path
   * @param options Request options
   * @returns Promise resolving to an API response
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
      timeout = 30000, // 30 seconds default timeout
      params,
    } = options;

    let fullUrl = this.getFullUrl(path);

    if (params && method === "GET") {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      // Add parameters to URL if not empty
      const queryString = queryParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString;
      }
    }

    // Combine headers
    let requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Add auth header if required
    if (requireAuth) {
      requestHeaders = this.addAuthHeader(requestHeaders);
    }

    // Prepare request options
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

    // Handle timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, requestOptions);

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failure: Session invalid or expired");
        }

        throw await this.handleErrorResponse(response, fullUrl, method);
      }

      // Parse response data
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
        headers: this.extractHeaders(response),
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
   * Makes a GET request
   * @param path API endpoint path
   * @param options Request options
   * @returns Promise resolving to an API response
   */
  public async get<T = any>(
    path: string,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  /**
   * Makes a POST request
   * @param path API endpoint path
   * @param body Request body
   * @param options Request options
   * @returns Promise resolving to an API response
   */
  public async post<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  /**
   * Makes a PUT request
   * @param path API endpoint path
   * @param body Request body
   * @param options Request options
   * @returns Promise resolving to an API response
   */
  public async put<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  /**
   * Makes a DELETE request
   * @param path API endpoint path
   * @param options Request options
   * @returns Promise resolving to an API response
   */
  public async delete<T = any>(
    path: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  /**
   * Uploads files
   * @param formData Form data containing files
   * @param path API endpoint path
   * @returns Promise resolving to an API response
   */
  public async uploadFiles(
    formData: FormData,
    path: string = "files",
  ): Promise<ApiResponse> {
    const fullUrl = this.getFullUrl(path);

    let headers: Record<string, string> = {};

    // Direct mode: add auth header
    if (this.mode === "direct") {
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      } else {
        throw new Error("Authentication token required for file upload");
      }
    }
    // Proxy mode: add proxy headers
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
        throw await this.handleErrorResponse(response, fullUrl, "POST");
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.extractHeaders(response),
      };
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }
}

/**
 * Singleton instance of the API client
 */
export const apiClient = new ApiClient();
