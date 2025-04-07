// src/services/proxy.service.ts
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
  User,
  Team,
  Channel,
  Message,
  UserStatus,
} from "../types";

/**
 * Creates a service that communicates with Mattermost via our proxy service
 * Handles authentication and tokens on the server-side
 *
 * @param config - Configuration with proxyUrl, clientId, and userId
 * @returns MattermostService implementation
 */
export const createProxyService = (config: {
  proxyUrl: string;
  clientId: string;
  userId?: string;
}): MattermostService => {
  const { proxyUrl, clientId, userId } = config;

  // Validate required parameters
  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl and clientId are required for proxy mode");
  }

  // Normalize proxy URL (remove trailing slash if present)
  const baseUrl = proxyUrl.endsWith("/") ? proxyUrl.slice(0, -1) : proxyUrl;

  /**
   * Helper method to make API calls through the proxy
   */
  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const url = `${baseUrl}/${endpoint}`;

    // In proxy mode, we send clientId and userId for authentication
    const headers: any = {
      "X-Mattermost-Client-ID": clientId,
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add userId if available
    if (userId) {
      headers["X-Mattermost-User-ID"] = userId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Handle error responses
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `Proxy API Error: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as Promise<T>;
    } catch (error) {
      console.error(`Error calling Proxy API at ${endpoint}:`, error);
      throw error;
    }
  };

  // Return the service interface (similar to direct service for consistent API)
  return {
    // User information
    getCurrentUser: async (): Promise<User> => {
      return apiCall<User>("users/me");
    },

    // Teams management
    getTeams: async (): Promise<Team[]> => {
      return apiCall<Team[]>("teams");
    },

    getTeam: async (teamId: string): Promise<Team> => {
      return apiCall<Team>(`teams/${teamId}`);
    },

    // Channels management
    getChannels: async (teamId: string): Promise<Channel[]> => {
      return apiCall<Channel[]>(`teams/${teamId}/channels`);
    },

    getChannel: async (channelId: string): Promise<Channel> => {
      return apiCall<Channel>(`channels/${channelId}`);
    },

    // Messages management
    getChannelMessages: async (
      channelId: string,
      options: GetMessagesOptions = {},
    ): Promise<MessagesResponse> => {
      const { page = 0, perPage = 60, since = 0, before, after } = options;

      let endpoint = `channels/${channelId}/messages?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      return apiCall<MessagesResponse>(endpoint);
    },

    postMessage: async (
      channelId: string,
      message: string,
    ): Promise<Message> => {
      return apiCall<Message>("messages", {
        method: "POST",
        body: JSON.stringify({
          channel_id: channelId,
          message,
        }),
      });
    },

    // Users management
    getUsers: async (options: GetUsersOptions = {}): Promise<User[]> => {
      const params = new URLSearchParams();

      if (options.inChannel) params.append("in_channel", options.inChannel);
      if (options.inTeam) params.append("in_team", options.inTeam);
      if (options.perPage)
        params.append("per_page", options.perPage.toString());
      if (options.page) params.append("page", options.page.toString());

      // Special case for getting specific users by ID
      if (options.ids && options.ids.length > 0) {
        return apiCall<User[]>("users/ids", {
          method: "POST",
          body: JSON.stringify(options.ids),
        });
      }

      return apiCall<User[]>(`users?${params.toString()}`);
    },

    getUserStatus: async (userId: string): Promise<UserStatus> => {
      return apiCall<UserStatus>(`users/${userId}/status`);
    },

    // Utilities for WebSocket
    getWebsocketUrl: (): string => {
      // For proxy mode, WebSocket URL is managed by the proxy
      return `${baseUrl.replace(/^http/, "ws")}/websocket`;
    },

    getWebsocketToken: async (): Promise<string> => {
      // In proxy mode, we need a temporary token for WebSocket
      const response = await apiCall<{ token: string }>("websocket/token");
      return response.token;
    },

    // File uploads
    uploadFiles: async (formData: FormData): Promise<unknown> => {
      // Create a headers object without Content-Type so browser can set it with the boundary
      const headers: Record<string, string> = {
        "X-Mattermost-Client-ID": clientId,
      };

      if (userId) {
        headers["X-Mattermost-User-ID"] = userId;
      }

      const response = await fetch(`${baseUrl}/files`, {
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

      return response.json();
    },
  };
};

export default createProxyService;
