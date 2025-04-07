// src/types/service.types.ts
import { Channel, Message, Team, User, UserStatus } from "./index";

/**
 * Types for service implementations
 */

export interface GetMessagesOptions {
  page?: number;
  perPage?: number;
  since?: number;
  before?: string;
  after?: string;
}

export interface GetUsersOptions {
  ids?: string[];
  inChannel?: string;
  inTeam?: string;
  page?: number;
  perPage?: number;
}

export interface MessagesResponse {
  posts: Record<string, Message>;
  order: string[];
  next_post_id?: string;
  prev_post_id?: string;
}

export interface MattermostService {
  // User methods
  getCurrentUser: () => Promise<User>;

  // Teams methods
  getTeams: () => Promise<Team[]>;
  getTeam: (teamId: string) => Promise<Team>;

  // Channels methods
  getChannels: (teamId: string) => Promise<Channel[]>;
  getChannel: (channelId: string) => Promise<Channel>;

  // Messages methods
  getChannelMessages: (
    channelId: string,
    options?: GetMessagesOptions,
  ) => Promise<MessagesResponse>;
  postMessage: (channelId: string, message: string) => Promise<Message>;

  // Users methods
  getUsers: (options?: GetUsersOptions) => Promise<User[]>;
  getUserStatus: (userId: string) => Promise<UserStatus>;

  // Websocket utils
  getWebsocketUrl: () => string;
  getWebsocketToken: () => Promise<string>;

  // Optional methods
  uploadFiles?: (formData: FormData) => Promise<unknown>;
}
