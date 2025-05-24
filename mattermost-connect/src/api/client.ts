/**
 * Simple API client for Mattermost
 * Handles direct server communication and authentication
 */

// Basic response type for API calls
export interface ApiResponse<T> {
  data: T;
  headers: Record<string, string>;
  status: number;
}

// API client configuration
export interface ApiClientConfig {
  serverUrl: string;
  token?: string | null;
  clientId?: string;
  onError?: (error: any) => void;
}

// API client error with status code
export class ApiError extends Error {
  status: number;
  data?: any;
  
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Simplified API client for Mattermost
 */
class ApiClient {
  private baseUrl: string = '';
  private token: string | null = null;
  private clientId: string | null = null;
  private onErrorHandler?: (error: any) => void;
  
  /**
   * Vérifie si l'erreur est due à un token expiré
   */
  isTokenExpiredError(error: ApiError): boolean {
    if (error.status !== 401) return false;
    
    // Vérifier les messages d'erreur courants pour les tokens expirés
    const message = (error.data?.message || error.message || '').toLowerCase();
    
    return (
      message.includes('token is expired') || 
      message.includes('token has expired') || 
      message.includes('invalid token') || 
      message.includes('token invalid') ||
      message.includes('session expirée') ||
      message.includes('session expiré')
    );
  }

  /**
   * Configure the API client
   */
  configure(config: ApiClientConfig): void {
    this.baseUrl = config.serverUrl.endsWith('/') 
      ? config.serverUrl.slice(0, -1) 
      : config.serverUrl;
    
    if (config.token) {
      this.token = config.token;
    }
    
    if (config.clientId) {
      this.clientId = config.clientId;
    }
    
    if (config.onError) {
      this.onErrorHandler = config.onError;
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Perform GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, params);
  }

  /**
   * Perform POST request
   */
  async post<T>(endpoint: string, data?: any, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, params);
  }

  /**
   * Perform PUT request
   */
  async put<T>(endpoint: string, data?: any, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, params);
  }

  /**
   * Perform DELETE request
   */
  async delete<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, params);
  }

  /**
   * Core request method
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    // Build full URL
    let url = `${this.baseUrl}/api/v4/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
    
    // Add query parameters if provided
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    // Configure headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    // Add client ID if available
    if (this.clientId) {
      headers['X-Client-ID'] = this.clientId;
    }
    
    try {
      // Make the request
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      
      // Parse headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // Handle token in headers (Mattermost sometimes returns token in header)
      if (responseHeaders['token']) {
        this.token = responseHeaders['token'];
      }
      
      // Handle response
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Unknown error occurred' };
        }
        
        const error = new ApiError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
        
        // N'appeler le gestionnaire d'erreur global que si ce n'est pas une erreur de token expiré
        // ou une erreur 404 sur un endpoint users (utilisateur non trouvé)
        const isUserNotFoundError = error.status === 404 && endpoint.includes('users/');
        if (this.onErrorHandler && !this.isTokenExpiredError(error) && !isUserNotFoundError) {
          this.onErrorHandler(error);
        }
        
        throw error;
      }
      
      // Parse response data
      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        responseData = text as unknown as T;
      }
      
      return {
        data: responseData,
        headers: responseHeaders,
        status: response.status,
      };
    } catch (error) {
      // Handle network errors
      if (!(error instanceof ApiError)) {
        const networkError = new ApiError(
          (error as Error).message || 'Network error',
          0, // 0 indicates network error
          error
        );
        
        // Call error handler if provided
        if (this.onErrorHandler) {
          this.onErrorHandler(networkError);
        }
        
        throw networkError;
      }
      
      throw error;
    }
  }
}

// Export singleton instance
export const api = new ApiClient();