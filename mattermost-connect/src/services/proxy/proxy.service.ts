// src/services/proxy/proxy.service.ts

import { BaseService } from "../base";
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
} from "../base";
import { User, Message, Channel, Team } from "../../types";
import { HttpClient, createProxyHttpClient } from "../http";
import { AuthManager, createProxyAuthManager } from "../auth";

/**
 * Configuration for the proxy service
 */
export interface ProxyServiceConfig {
  /** URL of the proxy server */
  proxyUrl: string;
  /** Client ID for identification */
  clientId: string;
  /** User ID (optional) */
  userId?: string;
  /** Whether to use local storage for token persistence */
  useLocalStorage?: boolean;
}

/**
 * Service implementing communication via an intermediate server
 * Follows the same interface as the direct service but communicates via a proxy
 */
export class ProxyService extends BaseService implements MattermostService {
  private readonly httpClient: HttpClient;
  private authManager: AuthManager;
  private readonly clientId: string;
  private userId?: string;
  public readonly mode: "direct" | "proxy" | "custom" = "proxy";

  /**
   * Creates a new instance of the proxy service
   * @param proxyUrl URL of the proxy server
   * @param clientId Client ID for identification
   * @param userId User ID (optional)
   * @param useLocalStorage Whether to use local storage for token persistence
   */
  constructor(
    proxyUrl: string,
    clientId: string,
    userId?: string,
    useLocalStorage: boolean = false,
  ) {
    super(proxyUrl);

    this.clientId = clientId;
    this.userId = userId;

    // Create HTTP client
    this.httpClient = createProxyHttpClient(proxyUrl, clientId, userId);

    // Create authentication manager
    this.authManager = createProxyAuthManager(
      this.httpClient,
      clientId,
      useLocalStorage,
      userId,
    );
  }

  /**
   * Implementation of abstract method to fetch current user
   */
  protected async fetchCurrentUser(): Promise<User> {
    try {
      const response = await this.httpClient.get<User>("users/me");
      return response.data;
    } catch (error) {
      console.error("Error fetching current user:", error);
      throw error;
    }
  }

  // ----- Authentication methods -----

  async authenticate(
    username: string,
    password: string,
  ): Promise<{ token: string; serverUrl?: string }> {
    try {
      const result = await this.authManager.authenticate(username, password);

      // Update user ID if provided in the result
      if (result.userId) {
        this.userId = result.userId;
      }

      // Try to fetch and cache current user
      try {
        const user = await this.fetchCurrentUser();
        this.setCurrentUser(user);
      } catch (userError) {
        console.warn("Could not fetch user after authentication:", userError);
      }

      return { token: result.token };
    } catch (error) {
      console.error("Proxy authentication error:", error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    return this.authManager.validateToken(token);
  }

  // ----- Team and channel methods -----

  async getTeams(): Promise<Team[]> {
    try {
      const response = await this.httpClient.get<Team[]>("teams");
      return response.data;
    } catch (error) {
      console.error("Error fetching teams:", error);
      throw error;
    }
  }

  async getTeam(teamId: string): Promise<Team> {
    try {
      const response = await this.httpClient.get<Team>(`teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  }

  async getTeamUnreadCount(
    teamId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    try {
      const response = await this.httpClient.get<{
        msg_count: number;
        mention_count: number;
      }>(`teams/${teamId}/unread`);
      return response.data;
    } catch (error) {
      console.error(`Error getting unread count for team ${teamId}:`, error);
      return { msg_count: 0, mention_count: 0 };
    }
  }

  async getChannels(teamId: string): Promise<Channel[]> {
    try {
      const response = await this.httpClient.get<Channel[]>(
        `teams/${teamId}/channels`,
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching channels for team ${teamId}:`, error);
      return [];
    }
  }

  async getChannel(channelId: string): Promise<Channel> {
    try {
      const response = await this.httpClient.get<Channel>(
        `channels/${channelId}`,
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching channel ${channelId}:`, error);
      throw error;
    }
  }

  async getChannelUnreadCount(
    channelId: string,
  ): Promise<{ msg_count: number; mention_count: number }> {
    try {
      const response = await this.httpClient.get<{
        msg_count: number;
        mention_count: number;
      }>(`channels/${channelId}/unread`);
      return response.data;
    } catch (error) {
      console.error(
        `Error getting unread count for channel ${channelId}:`,
        error,
      );
      return { msg_count: 0, mention_count: 0 };
    }
  }

  async viewChannel(channelId: string): Promise<{ status: "OK" }> {
    if (!channelId) {
      throw new Error("channelId is required to mark a channel as read");
    }

    try {
      const response = await this.httpClient.post<{ status: "OK" }>(
        `channels/${channelId}/view`,
        {},
      );
      return response.data;
    } catch (error) {
      console.error(`Error marking channel ${channelId} as read:`, error);
      throw error;
    }
  }

  // ----- Message methods -----

  async getChannelMessages(
    channelId: string,
    options: GetMessagesOptions = {},
  ): Promise<MessagesResponse> {
    try {
      const { page = 0, perPage = 60, since, before, after } = options;
      let endpoint = `channels/${channelId}/messages?page=${page}&per_page=${perPage}`;

      if (since) endpoint += `&since=${since}`;
      if (before) endpoint += `&before=${before}`;
      if (after) endpoint += `&after=${after}`;

      const response = await this.httpClient.get<MessagesResponse>(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Error fetching messages for channel ${channelId}:`, error);
      throw error;
    }
  }

  async postMessage(
    channelId: string,
    message: string,
    fileIds?: string[],
  ): Promise<Message> {
    try {
      const response = await this.httpClient.post<Message>("messages", {
        channel_id: channelId,
        message,
        file_ids: fileIds || [],
      });
      return response.data;
    } catch (error) {
      console.error(`Error posting message to channel ${channelId}:`, error);
      throw error;
    }
  }

  async getPost(messageId: string): Promise<Message> {
    try {
      const response = await this.httpClient.get<Message>(
        `messages/${messageId}`,
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error);
      throw error;
    }
  }

  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    try {
      const response = await this.httpClient.put<Message>(
        `messages/${messageId}`,
        {
          message: newMessage,
        },
      );
      return response.data;
    } catch (error) {
      console.error(`Error editing message ${messageId}:`, error);
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    try {
      await this.httpClient.delete(`messages/${messageId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting message ${messageId}:`, error);
      throw error;
    }
  }

  async replyToMessage(
    channelId: string,
    messageId: string,
    responseMessage: string,
    fileIds?: string[],
  ): Promise<Message> {
    if (!channelId || !messageId || !responseMessage.trim()) {
      throw new Error("Invalid parameters for message reply");
    }

    try {
      const requestBody = {
        channel_id: channelId,
        root_id: messageId,
        message: responseMessage.trim(),
        file_ids: fileIds || [],
      };

      const response = await this.httpClient.post<Message>(
        "messages/reply",
        requestBody,
      );
      return response.data;
    } catch (error) {
      console.error(
        `ProxyService: Error replying to message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  // ----- User methods -----

  async getUsers(options: GetUsersOptions = {}): Promise<User[]> {
    try {
      const params = new URLSearchParams();

      if (options.inChannel) params.append("in_channel", options.inChannel);
      if (options.inTeam) params.append("in_team", options.inTeam);
      if (options.perPage)
        params.append("per_page", options.perPage.toString());
      if (options.page) params.append("page", options.page.toString());

      if (options.ids && options.ids.length > 0) {
        const response = await this.httpClient.post<User[]>(
          "users/ids",
          options.ids,
        );
        return response.data;
      }

      const response = await this.httpClient.get<User[]>(
        `users?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getUserStatus(userId: string): Promise<any> {
    try {
      const response = await this.httpClient.get<any>(`users/${userId}/status`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching status for user ${userId}:`, error);
      throw error;
    }
  }

  // ----- Emoji and reaction methods -----

  async getFrequentEmojis(): Promise<string[]> {
    try {
      const response = await this.httpClient.get<string[]>("emojis/frequent");
      return response.data;
    } catch (error) {
      console.error("Error fetching frequent emojis:", error);
      // Default values in case of error
      return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
    }
  }

  async addReaction(messageId: string, emojiName: string): Promise<any> {
    try {
      const response = await this.httpClient.post<any>("reactions", {
        post_id: messageId,
        emoji_name: emojiName,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding reaction:", error);
      throw error;
    }
  }

  async removeReaction(
    channelId: string,
    messageId: string,
    emojiName: string,
  ): Promise<any> {
    try {
      const response = await this.httpClient.delete<any>(
        `reactions/${messageId}/${emojiName}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error removing reaction:", error);
      throw error;
    }
  }

  async hasReacted(
    channelId: string,
    messageId: string,
    emojiName: string,
  ): Promise<boolean> {
    try {
      const response = await this.httpClient.get<{ has_reacted: boolean }>(
        `reactions/${messageId}/${emojiName}/check`,
      );
      return response.data.has_reacted;
    } catch (error) {
      console.error("Error checking reaction:", error);
      return false;
    }
  }

  // ----- GIF methods -----

  async searchGifs(query: string, category?: string): Promise<any[]> {
    try {
      let endpoint = `gifs/search?q=${encodeURIComponent(query)}`;
      if (category) {
        endpoint += `&category=${encodeURIComponent(category)}`;
      }

      const response = await this.httpClient.get<any[]>(endpoint);
      return response.data;
    } catch (error) {
      console.error("Error searching GIFs:", error);
      return [];
    }
  }

  async getGifs(category: string, limit: number = 20): Promise<any[]> {
    try {
      let endpoint =
        category.toLowerCase() === "trending"
          ? "gifs/trending"
          : `gifs/category/${encodeURIComponent(category.toLowerCase())}`;

      if (limit) {
        endpoint += `?limit=${limit}`;
      }

      const response = await this.httpClient.get<any[]>(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Error fetching GIFs:`, error);
      return [];
    }
  }

  // ----- WebSocket methods -----

  getWebsocketUrl(): string {
    return `${this.baseUrl.replace(/^http/, "ws")}/websocket`;
  }

  async getWebsocketToken(): Promise<string> {
    try {
      const response = await this.httpClient.get<{ token: string }>(
        "websocket/token",
      );
      return response.data.token;
    } catch (error) {
      console.error("Error getting WebSocket token:", error);
      throw error;
    }
  }

  // ----- File methods -----

  async uploadFiles(formData: FormData): Promise<any> {
    try {
      // Special handling for file uploads
      const headers: Record<string, string> = {
        "X-Mattermost-Client-ID": this.clientId,
      };

      if (this.userId) {
        headers["X-Mattermost-User-ID"] = this.userId;
      }

      const response = await fetch(`${this.baseUrl}/files`, {
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
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  }
}

/**
 * Creates a proxy service for communication with Mattermost via an intermediate server
 * @param config Configuration for the proxy service
 * @returns Mattermost service
 */
export function createProxyService(
  config: ProxyServiceConfig,
): MattermostService {
  const { proxyUrl, clientId, userId, useLocalStorage = false } = config;

  // Validate parameters
  if (!proxyUrl || !clientId) {
    throw new Error("proxyUrl and clientId are required for proxy mode");
  }

  return new ProxyService(proxyUrl, clientId, userId, useLocalStorage);
}
