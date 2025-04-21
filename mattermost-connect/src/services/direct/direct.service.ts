// src/services/direct/direct.service.ts

import { BaseService } from "../base";
import {
  MattermostService,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
} from "../base";
import { User, Message, Channel, Team } from "../../types";
import { HttpClient, createDirectHttpClient } from "../http";
import { AuthManager, createDirectAuthManager } from "../auth";

/**
 * Configuration for the direct service
 */
export interface DirectServiceConfig {
  /** URL of the Mattermost server */
  serverUrl: string;
  /** User API token (optional) */
  token?: string;
  /** Whether to use local storage for token persistence */
  useLocalStorage?: boolean;
}

/**
 * Service implementing direct communication with a Mattermost server
 * without intermediaries
 */
export class DirectService extends BaseService implements MattermostService {
  private httpClient: HttpClient;
  private authManager: AuthManager;
  public readonly mode: "direct" | "proxy" | "custom" = "direct";

  /**
   * Creates a new instance of the direct service
   * @param serverUrl URL of the Mattermost server
   * @param token User API token (optional)
   * @param useLocalStorage Whether to use local storage for token persistence
   */
  constructor(
    serverUrl: string,
    token?: string,
    useLocalStorage: boolean = false,
  ) {
    super(serverUrl);

    // Create HTTP client with token provider that gets token from auth manager
    this.httpClient = createDirectHttpClient(
      serverUrl,
      // Instead of passing token directly, we'll get it from auth manager
      undefined,
    );

    // Create authentication manager
    this.authManager = createDirectAuthManager(
      this.httpClient,
      serverUrl,
      useLocalStorage,
    );

    // Set token if provided
    if (token) {
      this.authManager.setToken(token);
    }
  }

  /**
   * Get the current token
   */
  public get token(): string | null {
    return this.authManager.getToken();
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

      // Try to fetch and cache current user
      try {
        const user = await this.fetchCurrentUser();
        this.setCurrentUser(user);
      } catch (error) {
        console.warn("Could not fetch user after authentication:", error);
      }

      return {
        token: result.token,
        serverUrl: this.baseUrl,
      };
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  async validateToken(tokenToValidate: string): Promise<boolean> {
    return this.authManager.validateToken(tokenToValidate);
  }

  // ----- Team and channel methods -----

  async getTeams(): Promise<Team[]> {
    try {
      const response = await this.httpClient.get<Team[]>("users/me/teams");
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
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    try {
      const response = await this.httpClient.get<{
        msg_count: number;
        mention_count: number;
      }>(`users/${this._currentUser!.id}/teams/${teamId}/unread`);
      return response.data;
    } catch (error) {
      console.error(`Error getting unread count for team ${teamId}:`, error);
      return { msg_count: 0, mention_count: 0 };
    }
  }

  async getChannels(teamId: string): Promise<Channel[]> {
    if (!teamId || teamId === "") return [];

    try {
      const response = await this.httpClient.get<Channel[]>(
        `users/me/teams/${teamId}/channels`,
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching channels for team ${teamId}:`, error);
      throw error;
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
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    try {
      const response = await this.httpClient.get<{
        msg_count: number;
        mention_count: number;
      }>(`users/${this._currentUser!.id}/channels/${channelId}/unread`);
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
        "channels/members/me/view",
        { channel_id: channelId },
      );
      return response.data;
    } catch (error) {
      console.error(`Error marking channel ${channelId} as viewed:`, error);
      throw error;
    }
  }

  // ----- Messages methods -----

  async getChannelMessages(
    channelId: string,
    options: GetMessagesOptions = {},
  ): Promise<MessagesResponse> {
    const { page = 0, perPage = 60, since = 0, before, after } = options;

    let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

    if (since) endpoint += `&since=${since}`;
    if (before) endpoint += `&before=${before}`;
    if (after) endpoint += `&after=${after}`;

    try {
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
      const response = await this.httpClient.post<Message>("posts", {
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
      const response = await this.httpClient.get<Message>(`posts/${messageId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching post ${messageId}:`, error);
      throw error;
    }
  }

  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    try {
      // First get the message to obtain channel_id
      const message = await this.getPost(messageId);

      // Then update the message
      const response = await this.httpClient.put<Message>(
        `posts/${messageId}/patch`,
        {
          message: newMessage,
          file_ids: message.file_ids,
          has_reactions: message.has_reactions,
          props: message.props,
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
      await this.httpClient.delete(`posts/${messageId}`);
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
      const response = await this.httpClient.post<Message>("posts", {
        channel_id: channelId,
        message: responseMessage.trim(),
        root_id: messageId,
        file_ids: fileIds || [],
      });
      return response.data;
    } catch (error) {
      console.error(`Error replying to message ${messageId}:`, error);
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

      // If specific IDs are requested, use a different endpoint
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
    // In a real implementation, we would fetch frequent emojis from the server
    // For now, return a predefined list
    return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
  }

  async addReaction(messageId: string, emoji: string): Promise<any> {
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    try {
      const response = await this.httpClient.post<any>("reactions", {
        post_id: messageId,
        emoji_name: emoji,
        user_id: this._currentUser!.id,
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding reaction to message ${messageId}:`, error);
      throw error;
    }
  }

  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any> {
    if (!this._currentUser) {
      await this.getCurrentUser();
    }

    const userId = this._currentUser!.id;

    try {
      const response = await this.httpClient.delete<any>(
        `users/${userId}/posts/${messageId}/reactions/${emoji}`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error removing reaction from message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  async hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean> {
    try {
      const response = await this.httpClient.get<any[]>(
        `posts/${messageId}/reactions`,
      );

      if (!this._currentUser) {
        await this.getCurrentUser();
      }

      return response.data.some(
        (reaction) =>
          reaction.emoji_name === emoji &&
          reaction.user_id === this._currentUser!.id,
      );
    } catch (error) {
      console.error("Error checking reaction:", error);
      return false;
    }
  }

  // ----- GIF methods -----

  async searchGifs(query: string, category?: string): Promise<any[]> {
    // Simulate search in a real implementation
    // Would call an external API like Giphy
    return [];
  }

  async getGifs(category: string, limit: number = 20): Promise<any[]> {
    // Simulate fetching in a real implementation
    // Would call an external API like Giphy
    return [];
  }

  // ----- WebSocket methods -----

  getWebsocketUrl(): string {
    return this.baseUrl.replace(/^http/, "ws") + "/api/v4/websocket";
  }

  async getWebsocketToken(): Promise<string> {
    return this.token || "";
  }

  // ----- File methods -----

  async uploadFiles(formData: FormData): Promise<any> {
    try {
      // Custom handling for file uploads since they use FormData
      const response = await fetch(`${this.baseUrl}/api/v4/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
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
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  }

  /**
   * Refreshes the current user information
   */
  async refreshCurrentUser(): Promise<User> {
    this._currentUser = null; // Clear cache
    return this.getCurrentUser(); // Fetch user again
  }
}

/**
 * Creates a direct service for communication with a Mattermost server
 * @param config Configuration for the direct service
 * @returns Mattermost service
 */
export function createDirectService(
  config: DirectServiceConfig,
): MattermostService {
  const { serverUrl, token, useLocalStorage = false } = config;

  // Validate parameters
  if (!serverUrl) {
    throw new Error("serverUrl is required for direct mode");
  }

  return new DirectService(serverUrl, token, useLocalStorage);
}
