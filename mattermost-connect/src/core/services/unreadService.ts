// src/core/services/unreadService.ts
/**
 * Unread Service
 * Centralizes business logic for unread counts, notifications, and related functionality
 */
import { Channel, Message, ChannelUnreadCount, UnreadState } from "../../types";

/**
 * Options for calculating unread counts
 */
export interface CalculateUnreadOptions {
  /** Include muted channels in the count */
  includeMuted?: boolean;
  /** Only include channels with mentions */
  onlyWithMentions?: boolean;
}

/**
 * Service for unread-related operations
 * Centralizes unread count algorithms and business logic
 */
class UnreadService {
  /**
   * Calculates unread counts for a channel based on messages and last viewed time
   * @param messages List of messages to analyze
   * @param currentUserId Current user ID
   * @param lastViewedAt Timestamp when the channel was last viewed
   * @returns Unread count information
   */
  public calculateUnreadCounts(
    messages: Message[],
    currentUserId: string,
    lastViewedAt: number,
  ): ChannelUnreadCount {
    let msg_count = 0;
    let mention_count = 0;
    let lastMessageId: string | undefined;

    // Process messages in reverse order (newest first)
    // This ensures we correctly count only messages since lastViewedAt
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      // Skip messages from current user
      if (this.isMessageFromCurrentUser(message, currentUserId)) {
        continue;
      }

      // Skip messages created before last viewed time
      if (message.create_at <= lastViewedAt) {
        continue;
      }

      // Count as unread
      msg_count++;

      // Check for mentions
      if (this.messageContainsMention(message, currentUserId)) {
        mention_count++;
      }

      // Track last message ID (oldest unread message)
      if (!lastMessageId) {
        lastMessageId = message.id;
      }
    }

    return {
      msg_count,
      mention_count,
      lastMessageId,
      lastViewedAt,
    };
  }

  /**
   * Checks if a message mentions a specific user
   * @param message The message to check
   * @param userId User ID to check for mentions
   * @returns Whether the user is mentioned
   */
  public messageContainsMention(message: Message, userId: string): boolean {
    // Check props.mentions array if it exists
    if (
      message.props &&
      message.props.mentions &&
      Array.isArray(message.props.mentions) &&
      message.props.mentions.includes(userId)
    ) {
      return true;
    }

    // Check message content for @username mentions
    // This is a simplification - in practice, you would match against actual username
    if (message.message && userId) {
      const mentionRegex = new RegExp(`@user-${userId}\\b`, "i");
      if (mentionRegex.test(message.message)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a message is from the current user
   * @param message The message to check
   * @param currentUserId Current user's ID
   * @returns Whether the message is from the current user
   */
  public isMessageFromCurrentUser(
    message: Message,
    currentUserId: string,
  ): boolean {
    return message.user_id === currentUserId;
  }

  /**
   * Calculates total unreads for a team based on channel unread counts
   * @param channelsByTeam Channels organized by team ID
   * @param unreadState Current unread state
   * @param teamId Team ID to calculate counts for
   * @param options Calculation options
   * @returns Total unread and mention counts for the team
   */
  public calculateTeamUnreadCounts(
    channelsByTeam: Record<string, Channel[]>,
    unreadState: UnreadState,
    teamId: string,
    options: CalculateUnreadOptions = {},
  ): { msg_count: number; mention_count: number } {
    const { includeMuted = false, onlyWithMentions = false } = options;
    const channels = channelsByTeam[teamId] || [];
    let totalMessages = 0;
    let totalMentions = 0;

    channels.forEach((channel) => {
      const unreadCount = unreadState.unreadCounts[channel.id] || {
        msg_count: 0,
        mention_count: 0,
      };
      const isMuted = unreadState.mutedChannels.has(channel.id);

      // Always count mentions
      totalMentions += unreadCount.mention_count;

      // Apply message count based on options
      if (
        // Include if not muted or we're including muted channels
        (!isMuted || includeMuted) &&
        // Include if not filtering to mentions-only or the channel has mentions
        (!onlyWithMentions || unreadCount.mention_count > 0)
      ) {
        totalMessages += unreadCount.msg_count;
      }
    });

    return {
      msg_count: totalMessages,
      mention_count: totalMentions,
    };
  }

  /**
   * Calculates total unreads across all teams
   * @param channelsByTeam Channels organized by team ID
   * @param unreadState Current unread state
   * @param options Calculation options
   * @returns Total unread counts across all teams
   */
  public calculateTotalUnreadCounts(
    channelsByTeam: Record<string, Channel[]>,
    unreadState: UnreadState,
    options: CalculateUnreadOptions = {},
  ): { msg_count: number; mention_count: number } {
    const teamIds = Object.keys(channelsByTeam);
    let totalMessages = 0;
    let totalMentions = 0;

    teamIds.forEach((teamId) => {
      const teamCounts = this.calculateTeamUnreadCounts(
        channelsByTeam,
        unreadState,
        teamId,
        options,
      );

      totalMessages += teamCounts.msg_count;
      totalMentions += teamCounts.mention_count;
    });

    return {
      msg_count: totalMessages,
      mention_count: totalMentions,
    };
  }

  /**
   * Determines if a channel should show unread indicator
   * @param unreadCount Unread count information
   * @param isMuted Whether the channel is muted
   * @returns Whether to show unread indicator
   */
  public shouldShowUnreadIndicator(
    unreadCount: ChannelUnreadCount,
    isMuted: boolean = false,
  ): boolean {
    // Always show if there are mentions, even in muted channels
    if (unreadCount.mention_count > 0) {
      return true;
    }

    // For muted channels, only show for mentions
    if (isMuted) {
      return false;
    }

    // Otherwise, show if there are unread messages
    return unreadCount.msg_count > 0;
  }

  /**
   * Formats an unread count for display
   * @param count The unread count
   * @param maxDisplayCount Maximum count to display before showing a + suffix
   * @returns Formatted unread count
   */
  public formatUnreadCount(
    count: number,
    maxDisplayCount: number = 99,
  ): string {
    if (count <= 0) return "";
    if (count <= maxDisplayCount) return count.toString();
    return `${maxDisplayCount}+`;
  }

  /**
   * Gets a badge color based on unread state
   * @param hasMentions Whether there are mentions
   * @param hasUnreads Whether there are unreads
   * @param isMuted Whether the channel is muted
   * @returns Color for the badge
   */
  public getUnreadBadgeColor(
    hasMentions: boolean,
    hasUnreads: boolean,
    isMuted: boolean = false,
  ): "primary" | "error" | "default" {
    if (hasMentions) {
      return "error"; // Mentions use error color
    }

    if (hasUnreads && !isMuted) {
      return "primary"; // Regular unreads use primary color
    }

    return "default"; // Default for no unreads or muted channels
  }

  /**
   * Formats unread count data for UI badge display
   * @param msgCount Number of unread messages
   * @param mentionCount Number of unread mentions
   * @param isMuted Whether channel is muted
   * @returns Object with formatted count and color
   */
  public formatUnreadBadgeData(
    msgCount: number,
    mentionCount: number,
    isMuted: boolean = false,
  ): { text: string; color: "primary" | "error" | "default" } {
    // Determine the display text
    let text = "";

    if (mentionCount > 0) {
      // If there are mentions, show mention count
      text = this.formatUnreadCount(mentionCount);
    } else if (msgCount > 0 && !isMuted) {
      // If there are unreads and not muted, show unread count
      text = this.formatUnreadCount(msgCount);
    }

    // Determine badge color
    const color = this.getUnreadBadgeColor(
      mentionCount > 0,
      msgCount > 0,
      isMuted,
    );

    return { text, color };
  }

  /**
   * Creates a key for tracking processed messages
   * @param messageId Message ID
   * @param channelId Optional channel ID for scoped keys
   * @returns Unique key for the message
   */
  public createProcessedMessageKey(
    messageId: string,
    channelId?: string,
  ): string {
    if (channelId) {
      return `${channelId}:${messageId}`;
    }
    return messageId;
  }

  /**
   * Determines if a message already exists in a processed set
   * @param messageId Message ID
   * @param processedIds Set of processed message IDs
   * @param channelId Optional channel ID for scoped keys
   * @returns Whether the message has been processed
   */
  public isMessageProcessed(
    messageId: string,
    processedIds: Set<string>,
    channelId?: string,
  ): boolean {
    const key = this.createProcessedMessageKey(messageId, channelId);
    return processedIds.has(key) || processedIds.has(messageId);
  }
}

/**
 * Singleton instance of the unread service
 */
export const unreadService = new UnreadService();
