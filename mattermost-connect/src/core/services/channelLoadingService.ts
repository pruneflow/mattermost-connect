// src/core/services/channelLoadingService.ts
/**
 * Channel loading service
 * Centralizes loading logic for channels and associated user data
 * Eliminates circular dependencies between stores
 */
import {
  Channel,
  User,
  UserStatus,
  DirectChannelInfo,
  ErrorSource,
} from "../../types";
import { channelService } from "./channelService";
import { userService } from "./userService";
import { handleError } from "../store";

interface LoadingState {
  isLoading: boolean;
  timestamp: number;
  retryCount: number;
}

interface CachedDirectInfo {
  info: DirectChannelInfo;
  timestamp: number;
}

/**
 * Service for coordinating channel and user loading operations
 */
class ChannelLoadingService {
  // Maps to track loading states and cache
  private channelLoadingState: Map<string, LoadingState> = new Map();
  private userLoadingState: Map<string, LoadingState> = new Map();
  private directInfoCache: Map<string, CachedDirectInfo> = new Map();

  // Settings
  private cacheLifetime = 5 * 60 * 1000; // 5 minutes
  private maxRetries = 3;
  private lockTimeout = 10000; // 10 seconds

  /**
   * Checks if a channel is currently being loaded
   * @param channelId Channel ID
   * @returns Whether the channel is being loaded
   */
  public isChannelLoading(channelId: string): boolean {
    const state = this.channelLoadingState.get(channelId);
    if (!state) return false;

    // Check if the lock has timed out
    if (Date.now() - state.timestamp > this.lockTimeout) {
      this.channelLoadingState.delete(channelId);
      return false;
    }

    return state.isLoading;
  }

  /**
   * Checks if a user is currently being loaded
   * @param userId User ID
   * @returns Whether the user is being loaded
   */
  public isUserLoading(userId: string): boolean {
    const state = this.userLoadingState.get(userId);
    if (!state) return false;

    // Check if the lock has timed out
    if (Date.now() - state.timestamp > this.lockTimeout) {
      this.userLoadingState.delete(userId);
      return false;
    }

    return state.isLoading;
  }

  /**
   * Sets a channel's loading state
   * @param channelId Channel ID
   * @param isLoading Whether the channel is loading
   */
  public setChannelLoading(channelId: string, isLoading: boolean): void {
    if (isLoading) {
      const existingState = this.channelLoadingState.get(channelId);
      this.channelLoadingState.set(channelId, {
        isLoading: true,
        timestamp: Date.now(),
        retryCount: existingState ? existingState.retryCount : 0,
      });
    } else {
      this.channelLoadingState.delete(channelId);
    }
  }

  /**
   * Sets a user's loading state
   * @param userId User ID
   * @param isLoading Whether the user is loading
   */
  public setUserLoading(userId: string, isLoading: boolean): void {
    if (isLoading) {
      const existingState = this.userLoadingState.get(userId);
      this.userLoadingState.set(userId, {
        isLoading: true,
        timestamp: Date.now(),
        retryCount: existingState ? existingState.retryCount : 0,
      });
    } else {
      this.userLoadingState.delete(userId);
    }
  }

  /**
   * Increments retry count for a channel
   * @param channelId Channel ID
   * @returns Whether max retries has been reached
   */
  public incrementChannelRetry(channelId: string): boolean {
    const state = this.channelLoadingState.get(channelId);
    if (!state) {
      this.channelLoadingState.set(channelId, {
        isLoading: true,
        timestamp: Date.now(),
        retryCount: 1,
      });
      return false;
    }

    const newRetryCount = state.retryCount + 1;
    this.channelLoadingState.set(channelId, {
      ...state,
      retryCount: newRetryCount,
      timestamp: Date.now(),
    });

    return newRetryCount >= this.maxRetries;
  }

  /**
   * Gets direct channel info from cache or creates new info
   * @param channel Channel object
   * @param currentUserId Current user ID
   * @param users Map of users by ID
   * @param statuses Map of user statuses
   * @returns DirectChannelInfo object
   */
  public getOrCreateDirectChannelInfo(
    channel: Channel,
    currentUserId: string,
    users: Record<string, User>,
    statuses: Record<string, UserStatus> = {},
  ): DirectChannelInfo {
    try {
      // Check cache first
      const cacheKey = `${channel.id}:${currentUserId}`;
      const cachedInfo = this.directInfoCache.get(cacheKey);

      // Use cache if valid
      if (
        cachedInfo &&
        Date.now() - cachedInfo.timestamp < this.cacheLifetime
      ) {
        return cachedInfo.info;
      }

      // Create new info
      const info = channelService.createDirectChannelInfo(
        channel,
        currentUserId,
        users,
        statuses,
      );

      // Only cache complete or error states
      if (info.status === "complete" || info.status === "error") {
        this.directInfoCache.set(cacheKey, {
          info,
          timestamp: Date.now(),
        });
      }

      return info;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getOrCreateDirectChannelInfo",
        channelId: channel.id,
      });

      // Return safe default with error state
      return {
        isDirect: false,
        isGroup: false,
        displayName: channel.display_name || "Channel",
        userIds: [],
        status: "error",
      };
    }
  }

  /**
   * Identifies which user IDs need to be loaded for direct channels
   * @param channels List of channels
   * @param users Current loaded users map
   * @param currentUserId Current user ID
   * @returns List of user IDs that need to be loaded with priority
   */
  public identifyRequiredUserIds(
    channels: Channel[],
    users: Record<string, User>,
    currentUserId: string,
  ): { highPriority: string[]; lowPriority: string[] } {
    try {
      const highPriority: string[] = [];
      const lowPriority: string[] = [];
      const processedIds = new Set<string>();

      // Process active/visible channels first
      channels.forEach((channel) => {
        if (channelService.isDirectChannel(channel)) {
          const otherUserId = channelService.getOtherUserIdFromDirectChannel(
            channel.name,
            currentUserId,
          );

          if (
            otherUserId &&
            !users[otherUserId] &&
            !processedIds.has(otherUserId)
          ) {
            if (!this.isUserLoading(otherUserId)) {
              highPriority.push(otherUserId);
              processedIds.add(otherUserId);
            }
          }
        } else if (channelService.isGroupChannel(channel)) {
          const userIds = channelService.getUserIdsFromGroupChannel(channel);
          userIds.forEach((userId) => {
            if (
              userId !== currentUserId &&
              !users[userId] &&
              !processedIds.has(userId)
            ) {
              if (!this.isUserLoading(userId)) {
                highPriority.push(userId);
                processedIds.add(userId);
              }
            }
          });
        }
      });

      return { highPriority, lowPriority };
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "identifyRequiredUserIds",
        channelCount: channels.length,
      });
      return { highPriority: [], lowPriority: [] };
    }
  }

  /**
   * Invalidates cache for a channel
   * @param channelId Channel ID
   */
  public invalidateChannelCache(channelId: string): void {
    // Remove from cache with any user ID
    for (const [key, _] of this.directInfoCache) {
      if (key.startsWith(`${channelId}:`)) {
        this.directInfoCache.delete(key);
      }
    }

    // Clear loading state
    this.channelLoadingState.delete(channelId);
  }

  /**
   * Invalidates cache for a user
   * @param userId User ID
   */
  public invalidateUserCache(userId: string): void {
    // Remove direct info cache that might contain this user
    for (const [_, cachedInfo] of this.directInfoCache) {
      const info = cachedInfo.info;
      if (info.userIds.includes(userId)) {
        this.directInfoCache.delete(_);
      }
    }

    // Clear loading state
    this.userLoadingState.delete(userId);
  }

  /**
   * Clears all caches
   */
  public clearAllCaches(): void {
    this.channelLoadingState.clear();
    this.userLoadingState.clear();
    this.directInfoCache.clear();
  }
}

/**
 * Singleton instance of the channel loading service
 */
export const channelLoadingService = new ChannelLoadingService();
