// src/services/direct.service.ts
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
 * Creates a service to communicate directly with a Mattermost server
 * using a user API token
 *
 * @param config - Configuration with serverUrl and token
 * @returns MattermostService implementation
 */
export const createDirectService = (config: {
  serverUrl: string;
  token: string;
}): MattermostService => {
  const { serverUrl, token } = config;

  // Validate required parameters
  if (!serverUrl || !token) {
    throw new Error("serverUrl and token are required for direct mode");
  }

  // Normalize server URL (remove trailing slash if present)
  const baseUrl = serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl;

  /**
   * Helper method to make API calls with authentication
   */
  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const url = `${baseUrl}/api/v4/${endpoint}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Handle specific Mattermost API errors
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            `API Error: ${response.status} ${response.statusText}`,
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`Error calling API at ${endpoint}:`, error);
      throw error;
    }
  };

  // Return the service interface
  return {
    // User information
    getCurrentUser: async (): Promise<User> => {
      return apiCall<User>("users/me");
    },

    // Teams management
    getTeams: async (): Promise<Team[]> => {
      return apiCall<Team[]>("users/me/teams");
    },

    getTeam: async (teamId: string): Promise<Team> => {
      return apiCall<Team>(`teams/${teamId}`);
    },

    // Channels management
    getChannels: async (teamId: string): Promise<Channel[]> => {
      return apiCall<Channel[]>(`users/me/teams/${teamId}/channels`);
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

      let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      return apiCall<MessagesResponse>(endpoint);
    },

    postMessage: async (
      channelId: string,
      message: string,
    ): Promise<Message> => {
      return apiCall<Message>("posts", {
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

      // If specific IDs are requested, use a different endpoint
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
      // Convert http(s) to ws(s)
      return baseUrl.replace(/^http/, "ws") + "/api/v4/websocket";
    },

    getWebsocketToken: async (): Promise<string> => {
      // In direct mode, we use the same token
      return token;
    },

    // File uploads
    uploadFiles: async (formData: FormData): Promise<unknown> => {
      const response = await fetch(`${baseUrl}/api/v4/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

export default createDirectService;
