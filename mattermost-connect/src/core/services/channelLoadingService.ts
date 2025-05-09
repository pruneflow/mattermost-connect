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
  hasError: boolean; // New field to track error state
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
  private channelErrorState: Map<string, Error> = new Map();
  private userBatchLoading: Map<string, boolean> = new Map();

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
   * Checks if a batch of users is currently being loaded
   * @param userIds User IDs array
   * @returns Whether the batch is being loaded
   */
  public isUserBatchLoading(userIds: string[]): boolean {
    if (!userIds.length) return false;

    // Create a batch key from sorted user IDs
    const batchKey = [...userIds].sort().join(",");
    return this.userBatchLoading.get(batchKey) === true;
  }

  /**
   * Sets a batch of users as loading
   * @param userIds User IDs array
   * @param isLoading Loading state
   */
  public setUserBatchLoading(userIds: string[], isLoading: boolean): void {
    if (!userIds.length) return;

    // Create a batch key from sorted user IDs
    const batchKey = [...userIds].sort().join(",");

    if (isLoading) {
      this.userBatchLoading.set(batchKey, true);
    } else {
      this.userBatchLoading.delete(batchKey);
    }
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
        hasError: existingState ? existingState.hasError : false,
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
        hasError: existingState ? existingState.hasError : false,
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
        hasError: false,
      });
      return false;
    }

    const newRetryCount = state.retryCount + 1;
    const maxRetriesReached = newRetryCount >= this.maxRetries;

    this.channelLoadingState.set(channelId, {
      ...state,
      retryCount: newRetryCount,
      timestamp: Date.now(),
      hasError: maxRetriesReached,
    });

    // If max retries have been reached, mark as error
    if (maxRetriesReached) {
      this.channelErrorState.set(
        channelId,
        new Error(
          `Maximum retry attempts (${this.maxRetries}) reached for channel ${channelId}`,
        ),
      );
    }

    return maxRetriesReached;
  }

  /**
   * Checks if a channel/user has already reached maximum retry attempts
   * @param entityId Channel ID or User ID
   * @returns Whether more retry attempts are allowed
   */
  public shouldRetryLoading(entityId: string): boolean {
    // Check if it's a channel or user ID (could be either)
    const channelState = this.channelLoadingState.get(entityId);
    const userState = this.userLoadingState.get(entityId);

    // Get the appropriate state
    const state = channelState || userState;

    // If no state exists yet, retries are allowed
    if (!state) return true;

    // Check if we've reached the maximum number of retries
    return state.retryCount < this.maxRetries;
  }

  /**
   * Checks if a channel is in an error state
   * @param channelId Channel ID
   * @returns Whether the channel is in an error state
   */
  public isChannelError(channelId: string): boolean {
    // Check if channel is in error map
    if (this.channelErrorState.has(channelId)) {
      return true;
    }

    // Check if channel has an error state in the loading state
    const state = this.channelLoadingState.get(channelId);
    return state?.hasError || false;
  }

  /**
   * Sets a channel as being in an error state
   * @param channelId Channel ID
   * @param error Optional error object
   */
  public setChannelError(channelId: string, error?: Error): void {
    // Update loading state to reflect error
    const state = this.channelLoadingState.get(channelId);
    if (state) {
      state.hasError = true;
      this.channelLoadingState.set(channelId, state);
    } else {
      this.channelLoadingState.set(channelId, {
        isLoading: false,
        timestamp: Date.now(),
        retryCount: this.maxRetries, // Max out retries
        hasError: true,
      });
    }

    // Store error if provided
    if (error) {
      this.channelErrorState.set(channelId, error);
    }
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
      // Check if we already have complete info
      const cacheKey = `${channel.id}:${currentUserId}`;
      const cachedInfo = this.directInfoCache.get(cacheKey);

      // If we have cached info and it's complete, use it
      if (cachedInfo && cachedInfo.info.status === "complete") {
        return cachedInfo.info;
      }

      // For direct channels, check if we have the other user
      if (channelService.isDirectChannel(channel)) {
        const otherUserId = channelService.getOtherUserIdFromDirectChannel(
          channel.name,
          currentUserId,
        );

        // If we have the user data, create complete info immediately
        if (otherUserId && users[otherUserId]) {
          const completeInfo = {
            isDirect: true,
            isGroup: false,
            displayName: channelService.getDirectChannelDisplayName(
              users[otherUserId],
            ),
            userIds: [currentUserId, otherUserId],
            otherUserId,
            userStatus: statuses[otherUserId] || "offline",
            status: "complete",
          };

          // Update cache
          this.directInfoCache.set(cacheKey, {
            info: completeInfo,
            timestamp: Date.now(),
          });

          return completeInfo;
        }
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
    // Clear error state
    this.channelErrorState.delete(channelId);
  }

  /**
   * Invalidates cache for a user
   * @param userId User ID
   */
  public invalidateUserCache(userId: string): void {
    // Remove direct info cache that might contain this user
    for (const [cacheKey, cachedInfo] of this.directInfoCache) {
      const info = cachedInfo.info;
      if (info.userIds.includes(userId)) {
        this.directInfoCache.delete(cacheKey);
      }
    }

    // Clear loading state
    this.userLoadingState.delete(userId);

    // Clear batch loadings that include this user
    for (const [batchKey, _] of this.userBatchLoading) {
      const userIds = batchKey.split(",");
      if (userIds.includes(userId)) {
        this.userBatchLoading.delete(batchKey);
      }
    }
  }

  /**
   * Clears all caches
   */
  public clearAllCaches(): void {
    this.channelLoadingState.clear();
    this.userLoadingState.clear();
    this.directInfoCache.clear();
    this.channelErrorState.clear();
    this.userBatchLoading.clear();
  }
}

/**
 * Singleton instance of the channel loading service
 */
export const channelLoadingService = new ChannelLoadingService();
