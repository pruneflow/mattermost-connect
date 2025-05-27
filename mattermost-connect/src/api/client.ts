// Simple API client inspired by Mattermost Client4
// Complements RTK Query for direct API calls when needed

import { APIError } from './types';

export interface MattermostClientConfig {
  serverUrl: string;
  token?: string;
}

export class MattermostClient {
  public serverUrl: string;
  private token: string | null = null;

  constructor(config: MattermostClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.token || null;
  }

  setToken(token: string) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.serverUrl}/api/v4${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Extract token from response header if present (for login)
      const token = response.headers.get('Token');
      if (token) {
        this.setToken(token);
      }

      if (!response.ok) {
        let errorData: APIError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            id: 'api.error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            detailed_error: '',
            request_id: '',
            status_code: response.status,
          };
        }
        throw errorData;
      }

      // Return empty object for 204 No Content
      if (response.status === 204) {
        return {};
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        // Network or other errors
        const apiError: APIError = {
          id: 'network.error',
          message: error.message,
          detailed_error: '',
          request_id: '',
          status_code: 0,
        };
        throw apiError;
      }
      // Re-throw API errors
      throw error;
    }
  }

  // Auth methods
  async login(loginId: string, password: string) {
    return this.makeRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        login_id: loginId,
        password,
      }),
    });
  }

  async logout() {
    try {
      await this.makeRequest('/users/logout', {
        method: 'POST',
      });
    } finally {
      // Always clear token on logout
      this.token = null;
    }
  }

  async getMe() {
    return this.makeRequest('/users/me');
  }

  // Teams methods
  async getMyTeams() {
    return this.makeRequest('/users/me/teams');
  }

  async getTeamsUnread(userId: string) {
    return this.makeRequest(`/users/${userId}/teams/unread`);
  }

  // Channels methods
  async getMyChannels() {
    return this.makeRequest('/users/me/channels');
  }

  async getChannelsForTeam(teamId: string) {
    return this.makeRequest(`/users/me/teams/${teamId}/channels`);
  }

  async getChannelUnread(userId: string, channelId: string) {
    return this.makeRequest(`/users/${userId}/channels/${channelId}/unread`);
  }

  // Posts methods
  async getPostsUnread(userId: string, channelId: string, limitBefore = 30, limitAfter = 30) {
    return this.makeRequest(
      `/users/${userId}/channels/${channelId}/posts/unread?limit_before=${limitBefore}&limit_after=${limitAfter}`
    );
  }

  async getPosts(channelId: string, page = 0, perPage = 30, before?: string, after?: string) {
    let url = `/channels/${channelId}/posts?page=${page}&per_page=${perPage}`;
    if (before) url += `&before=${before}`;
    if (after) url += `&after=${after}`;
    return this.makeRequest(url);
  }

  async createPost(channelId: string, message: string, rootId?: string) {
    return this.makeRequest('/posts', {
      method: 'POST',
      body: JSON.stringify({
        channel_id: channelId,
        message,
        root_id: rootId,
      }),
    });
  }

  async getPostThread(postId: string) {
    return this.makeRequest(`/posts/${postId}/thread`);
  }

  async viewChannel(userId: string, channelId: string) {
    return this.makeRequest(`/channels/members/${userId}/view`, {
      method: 'POST',
      body: JSON.stringify({
        channel_id: channelId,
      }),
    });
  }

  // WebSocket URL helper
  getWebSocketUrl(): string {
    const wsProtocol = this.serverUrl.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = this.serverUrl.replace(/^https?/, wsProtocol);
    return `${baseUrl}/api/v4/websocket`;
  }
}

// Default client instance
let defaultClient: MattermostClient | null = null;

export function setDefaultClient(client: MattermostClient) {
  defaultClient = client;
}

export function getDefaultClient(): MattermostClient {
  if (!defaultClient) {
    throw new Error('Default Mattermost client not initialized');
  }
  return defaultClient;
}

export default MattermostClient;