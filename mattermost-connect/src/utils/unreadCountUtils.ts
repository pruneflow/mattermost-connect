// src/utils/unreadCountUtils.ts
/**
 * Utility functions for handling unread counts
 */
import { User } from "../core/services/authService";
import { Channel, ChannelUnreadCount } from "../core/store/channelStore";
import { Message } from "../core/store/messageStore";

/**
 * Checks if a message mentions a specific user
 * @param message The message to check
 * @param userId User ID to check for mentions
 * @returns Whether the user is mentioned
 */
export function messageContainsMention(
  message: Message,
  userId: string,
): boolean {
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
  if (message.message && userId) {
    // Get the user from somewhere - this is a placeholder
    // In practice, you would pass the user object or access it from a store
    const user = { username: `user-${userId}` }; // Placeholder

    // Check for @username mentions
    const mentionRegex = new RegExp(`@${user.username}\\b`, "i");
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
export function isMessageFromCurrentUser(
  message: Message,
  currentUserId: string,
): boolean {
  return message.user_id === currentUserId;
}

/**
 * Formats an unread count for display
 * @param count The unread count
 * @param maxDisplayCount Maximum count to display before showing a + suffix
 * @returns Formatted unread count
 */
export function formatUnreadCount(
  count: number,
  maxDisplayCount: number = 99,
): string {
  if (count <= 0) return "";
  if (count <= maxDisplayCount) return count.toString();
  return `${maxDisplayCount}+`;
}

/**
 * Calculates unread counts for a channel based on messages
 * @param messages List of messages to process
 * @param currentUserId Current user's ID
 * @param lastViewedAt Timestamp when the channel was last viewed
 * @returns Unread count information
 */
export function calculateUnreadCounts(
  messages: Message[],
  currentUserId: string,
  lastViewedAt: number,
): ChannelUnreadCount {
  let msg_count = 0;
  let mention_count = 0;
  let lastMessageId: string | undefined;

  // Process messages in reverse order (newest first)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];

    // Skip messages from current user
    if (isMessageFromCurrentUser(message, currentUserId)) {
      continue;
    }

    // Skip messages created before last viewed time
    if (message.create_at <= lastViewedAt) {
      continue;
    }

    // Count as unread
    msg_count++;

    // Check for mentions
    if (messageContainsMention(message, currentUserId)) {
      mention_count++;
    }

    // Track last message ID
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
 * Determines if a channel should show unread indicator
 * @param unreadCount Unread count information
 * @param isMuted Whether the channel is muted
 * @returns Whether to show unread indicator
 */
export function shouldShowUnreadIndicator(
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
 * Gets a badge color based on unread state
 * @param hasMentions Whether there are mentions
 * @param hasUnreads Whether there are unreads
 * @param isMuted Whether the channel is muted
 * @returns Color for the badge
 */
export function getUnreadBadgeColor(
  hasMentions: boolean,
  hasUnreads: boolean,
  isMuted: boolean = false,
): "primary" | "error" | "default" {
  if (hasMentions) {
    return "error";
  }

  if (hasUnreads && !isMuted) {
    return "primary";
  }

  return "default";
}

/**
 * Calculates the total unread counts for a collection of channels
 * @param channelUnreadCounts Map of channel IDs to unread counts
 * @param mutedChannelIds Set of muted channel IDs
 * @returns Total unread and mention counts
 */
export function calculateTotalUnreads(
  channelUnreadCounts: Record<string, ChannelUnreadCount>,
  mutedChannelIds: Set<string> = new Set(),
): { msg_count: number; mention_count: number } {
  let totalMessages = 0;
  let totalMentions = 0;

  Object.entries(channelUnreadCounts).forEach(([channelId, counts]) => {
    const isMuted = mutedChannelIds.has(channelId) || !!counts.isMuted;

    // Always count mentions
    totalMentions += counts.mention_count;

    // Only count messages for non-muted channels
    if (!isMuted) {
      totalMessages += counts.msg_count;
    }
  });

  return {
    msg_count: totalMessages,
    mention_count: totalMentions,
  };
}

/**
 * Creates a key for tracking processed messages
 * @param messageId Message ID
 * @param channelId Optional channel ID for scoped keys
 * @returns Unique key for the message
 */
export function createProcessedMessageKey(
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
export function isMessageProcessed(
  messageId: string,
  processedIds: Set<string>,
  channelId?: string,
): boolean {
  const key = createProcessedMessageKey(messageId, channelId);
  return processedIds.has(key) || processedIds.has(messageId);
}

/**
 * Formats unread count data for UI badge display
 * @param msgCount Number of unread messages
 * @param mentionCount Number of unread mentions
 * @param isMuted Whether channel is muted
 * @returns Object with formatted count and color
 */
export function formatUnreadBadgeData(
  msgCount: number,
  mentionCount: number,
  isMuted: boolean = false,
): { text: string; color: "primary" | "error" | "default" } {
  // Determine the display text
  let text = "";

  if (mentionCount > 0) {
    // If there are mentions, show mention count
    text = formatUnreadCount(mentionCount);
  } else if (msgCount > 0 && !isMuted) {
    // If there are unreads and not muted, show unread count
    text = formatUnreadCount(msgCount);
  }

  // Determine badge color
  const color = getUnreadBadgeColor(mentionCount > 0, msgCount > 0, isMuted);

  return { text, color };
}

/**
 * Creates a throttled function to update unread counts
 * @param updateFn Function to update unread counts
 * @param delay Delay in milliseconds
 * @returns Throttled function
 */
export function throttleUnreadUpdates<T extends (...args: any[]) => any>(
  updateFn: T,
  delay: number = 200,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: number | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    // If we haven't called recently, call immediately
    if (now - lastCall >= delay) {
      lastCall = now;
      updateFn(...args);
      return;
    }

    // Otherwise, schedule a call
    pendingArgs = args;

    if (timeoutId === null) {
      timeoutId = window.setTimeout(
        () => {
          if (pendingArgs) {
            updateFn(...pendingArgs);
            lastCall = Date.now();
            pendingArgs = null;
          }
          timeoutId = null;
        },
        delay - (now - lastCall),
      );
    }
  };
}
