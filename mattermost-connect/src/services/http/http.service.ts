// services/http/http.service.ts

/**
 * Interface for HTTP request options
 */
export interface HttpRequestOptions {
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Whether to require authentication */
  requireAuth?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Interface for HTTP response
 */
export interface HttpResponse<T> {
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
 * Interface for HTTP client service
 */
export interface HttpClient {
  /**
   * Sends an HTTP request
   */
  request<T>(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;

  /**
   * Sends a GET request
   */
  get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Sends a POST request
   */
  post<T>(
    url: string,
    data?: any,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;

  /**
   * Sends a PUT request
   */
  put<T>(
    url: string,
    data?: any,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;

  /**
   * Sends a DELETE request
   */
  delete<T>(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;
}

/**
 * Base HTTP client implementation
 */
export class HttpService implements HttpClient {
  /**
   * Base URL for all requests
   */
  protected baseUrl: string;

  /**
   * Default headers to include in all requests
   */
  protected defaultHeaders: Record<string, string>;

  /**
   * Authentication token provider function
   */
  protected tokenProvider?: () => string | null | undefined;

  /**
   * Creates a new HTTP client
   */
  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    tokenProvider?: () => string | null | undefined,
  ) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.defaultHeaders = defaultHeaders;
    this.tokenProvider = tokenProvider;
  }

  /**
   * Gets the full URL for a request
   */
  protected getFullUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseUrl}/${normalizedPath}`;
  }

  // services/http/http.service.ts (continued)

  /**
   * Adds authentication headers if required
   */
  protected addAuthHeader(
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
   * Sends an HTTP request
   */
  public async request<T>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      requireAuth = true,
      timeout = 30000, // Default timeout: 30 seconds
    } = options;

    const fullUrl = this.getFullUrl(url);

    // Combine headers
    let requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Add auth header if required
    if (requireAuth) {
      requestHeaders = this.addAuthHeader(requestHeaders);
    }

    // Add content-type header for JSON requests if not already set
    if (
      body &&
      !requestHeaders["Content-Type"] &&
      !(body instanceof FormData)
    ) {
      requestHeaders["Content-Type"] = "application/json";
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

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, requestOptions);

      // Build headers map
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Handle specific error status codes
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failure: Session invalid or expired");
        }

        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // If parsing fails, continue with default error
        }

        const errorMessage =
          errorData.message ||
          `HTTP Error: ${response.status} ${response.statusText}`;
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }

      // Parse response data
      let data: any;
      if (response.status === 204) {
        // No content
        data = {};
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
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sends a GET request
   */
  public async get<T>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  /**
   * Sends a POST request
   */
  public async post<T>(
    url: string,
    data?: any,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "POST", body: data });
  }

  /**
   * Sends a PUT request
   */
  public async put<T>(
    url: string,
    data?: any,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "PUT", body: data });
  }

  /**
   * Sends a DELETE request
   */
  public async delete<T>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

/**
 * Creates an HTTP client for direct Mattermost API communication
 */
export function createDirectHttpClient(
  serverUrl: string,
  token?: string,
): HttpClient {
  return new HttpService(
    `${serverUrl}/api/v4`,
    { "Content-Type": "application/json" },
    token ? () => token : undefined,
  );
}

/**
 * Creates an HTTP client for proxy-based Mattermost API communication
 */
export function createProxyHttpClient(
  proxyUrl: string,
  clientId: string,
  userId?: string,
): HttpClient {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Mattermost-Client-ID": clientId,
  };

  if (userId) {
    defaultHeaders["X-Mattermost-User-ID"] = userId;
  }

  return new HttpService(proxyUrl, defaultHeaders);
}

export default HttpService;
