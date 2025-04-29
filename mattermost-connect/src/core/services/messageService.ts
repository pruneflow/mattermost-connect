// src/core/services/messageService.ts
/**
 * Message service
 * Provides business logic for message operations and formatting
 */
import {
  Message,
  MessageReaction,
  ReactionCount,
  User,
  MessageAttachment,
  ErrorSource,
  EventType,
} from "../../types";
import { formatDate } from "../../utils/formatters";
import { escapeHtml } from "../../utils/mattermostUtils";
import { handleError } from "../store";
import { emitEvent } from "../api/eventUtils";

/**
 * Service for message-related operations
 * Centralizes business logic for message processing and formatting
 */
class MessageService {
  /**
   * Sorts messages by creation date, oldest first
   * @param messages Array of messages to sort
   * @returns Sorted messages
   */
  public sortMessages(messages: Message[]): Message[] {
    try {
      return [...messages].sort((a, b) => a.create_at - b.create_at);
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "sortMessages",
        messageCount: messages?.length,
      });
      return [...messages]; // Return unsorted copy as fallback
    }
  }

  /**
   * Sorts messages by creation date, newest first
   * @param messages Array of messages to sort
   * @returns Sorted messages
   */
  public sortMessagesReverse(messages: Message[]): Message[] {
    try {
      return [...messages].sort((a, b) => b.create_at - a.create_at);
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "sortMessagesReverse",
        messageCount: messages?.length,
      });
      return [...messages]; // Return unsorted copy as fallback
    }
  }

  /**
   * Groups messages by date for UI display
   * @param messages Array of messages
   * @returns Map of date strings to messages
   */
  public groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
    try {
      const groupedMessages = new Map<string, Message[]>();

      messages.forEach((message) => {
        const date = new Date(message.create_at);
        const dateString = formatDate(date, {
          showTime: false,
          format: "short",
        });

        if (!groupedMessages.has(dateString)) {
          groupedMessages.set(dateString, []);
        }

        groupedMessages.get(dateString)?.push(message);
      });

      return groupedMessages;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "groupMessagesByDate",
        messageCount: messages?.length,
      });
      return new Map<string, Message[]>();
    }
  }

  /**
   * Formats message text, processing markdown, mentions, and emojis
   * @param message Message to format
   * @param users Map of users for mention lookup
   * @returns Formatted message text
   */
  public formatMessageText(
    message: string,
    users?: Record<string, User>,
  ): string {
    if (!message) return "";

    try {
      // Process message in stages
      let formattedText = this.escapeMentions(message);
      formattedText = this.processEmojis(formattedText);

      if (users) {
        formattedText = this.processMentions(formattedText, users);
      }

      return formattedText;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatMessageText",
        messageLength: message?.length,
      });
      // Return safely escaped text as fallback
      return escapeHtml(message);
    }
  }

  /**
   * Processes user mentions in text
   * @param text Message text
   * @param users Map of users for mention lookup
   * @returns Text with processed mentions
   */
  private processMentions(text: string, users: Record<string, User>): string {
    // Replace @username mentions with formatted mentions
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;

    return text.replace(mentionRegex, (match, username) => {
      // Find user by username
      const user = Object.values(users).find((u) => u.username === username);

      if (user) {
        return `<span class="mention" data-user-id="${user.id}">@${username}</span>`;
      }

      return match; // Leave unchanged if user not found
    });
  }

  /**
   * Escapes potential HTML in user mentions
   * @param text Text with mentions
   * @returns Escaped text
   */
  private escapeMentions(text: string): string {
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;

    return text.replace(mentionRegex, (match, username) => {
      return `@${escapeHtml(username)}`;
    });
  }

  /**
   * Processes emoji codes in text
   * @param text Text with emoji codes
   * @returns Text with processed emojis
   */
  private processEmojis(text: string): string {
    // Replace :emoji: codes with emoji or images
    const emojiRegex = /:([a-zA-Z0-9_+\-]+):/g;

    return text.replace(emojiRegex, (match, emojiName) => {
      // In a real implementation, you would look up the emoji
      // and return the corresponding Unicode character or custom emoji image
      return match; // Placeholder: return unchanged
    });
  }

  /**
   * Extracts all emojis from message text
   * @param text Message text
   * @returns Array of emoji names
   */
  public extractEmojis(text: string): string[] {
    try {
      const emojiRegex = /:([a-zA-Z0-9_+\-]+):/g;
      const emojis: string[] = [];
      let match;

      while ((match = emojiRegex.exec(text)) !== null) {
        emojis.push(match[1]);
      }

      return emojis;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "extractEmojis",
        textLength: text?.length,
      });
      return [];
    }
  }

  /**
   * Extracts all user mentions from message text
   * @param text Message text
   * @returns Array of usernames mentioned
   */
  public extractUserMentions(text: string): string[] {
    try {
      const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
      const mentions: string[] = [];
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
      }

      return mentions;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "extractUserMentions",
        textLength: text?.length,
      });
      return [];
    }
  }

  /**
   * Determines if a message is a system message
   * @param message Message to check
   * @returns Whether it's a system message
   */
  public isSystemMessage(message: Message): boolean {
    // System messages are usually from a user with a specific ID
    // or have specific props like from_webhook
    if (message.props?.from_webhook) {
      return true;
    }

    // In a real implementation, there would be more sophisticated checks
    // e.g., checking for specific user IDs or message types

    return false;
  }

  /**
   * Checks if a message is an edit of another message
   * @param message Message to check
   * @returns Whether it's an edited message
   */
  public isEditedMessage(message: Message): boolean {
    return message.update_at > message.create_at;
  }

  /**
   * Determines if a message is part of a thread
   * @param message Message to check
   * @returns Whether it's part of a thread
   */
  public isThreadMessage(message: Message): boolean {
    return !!message.root_id;
  }

  /**
   * Checks if a message has replies (is a parent message in a thread)
   * @param message Message to check
   * @returns Whether the message has replies
   */
  public hasReplies(message: Message): boolean {
    return (message.reply_count || 0) > 0;
  }

  /**
   * Determines if a user can edit a message
   * @param message Message to check
   * @param userId User ID
   * @returns Whether the user can edit the message
   */
  public canEdit(message: Message, userId: string): boolean {
    // User can edit their own messages
    return message.user_id === userId;

    // In a real implementation, you would also check:
    // - Time elapsed since posting
    // - User permissions
    // - System message status
  }

  /**
   * Determines if a user can delete a message
   * @param message Message to check
   * @param userId User ID
   * @param isAdmin Whether the user is an admin
   * @returns Whether the user can delete the message
   */
  public canDelete(message: Message, userId: string, isAdmin = false): boolean {
    // Admins can delete any message
    if (isAdmin) {
      return true;
    }

    // Users can delete their own messages
    return message.user_id === userId;

    // In a real implementation, you would also check:
    // - Time elapsed since posting
    // - Channel permissions
    // - System message status
  }

  /**
   * Gets a list of file IDs from a message
   * @param message Message to extract files from
   * @returns Array of file IDs
   */
  public getFileIds(message: Message): string[] {
    return message.file_ids || [];
  }

  /**
   * Gets all reactions for a message grouped by emoji
   * @param message Message with reactions
   * @returns Grouped reactions
   */
  public getReactionsByEmoji(
    message: Message,
  ): Record<string, MessageReaction[]> {
    try {
      if (!message.metadata?.reactions) {
        return {};
      }

      const groupedReactions: Record<string, MessageReaction[]> = {};

      message.metadata.reactions.forEach((reaction) => {
        if (!groupedReactions[reaction.emoji_name]) {
          groupedReactions[reaction.emoji_name] = [];
        }

        groupedReactions[reaction.emoji_name].push(reaction);
      });

      return groupedReactions;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getReactionsByEmoji",
        messageId: message.id,
      });
      return {};
    }
  }

  /**
   * Gets reaction counts by emoji
   * @param message Message with reactions
   * @returns Reaction counts
   */
  public getReactionCounts(message: Message): ReactionCount[] {
    try {
      const groupedReactions = this.getReactionsByEmoji(message);

      return Object.entries(groupedReactions).map(([emoji, reactions]) => ({
        emoji_name: emoji,
        count: reactions.length,
        userIds: reactions.map((r) => r.user_id),
      }));
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getReactionCounts",
        messageId: message.id,
      });
      return [];
    }
  }

  /**
   * Checks if a user has reacted with a specific emoji
   * @param message Message to check
   * @param userId User ID
   * @param emoji Emoji name
   * @returns Whether the user has reacted
   */
  public hasUserReacted(
    message: Message,
    userId: string,
    emoji: string,
  ): boolean {
    if (!message.metadata?.reactions) {
      return false;
    }

    return message.metadata.reactions.some(
      (r) => r.emoji_name === emoji && r.user_id === userId,
    );
  }

  /**
   * Determines if a message contains a specific file type
   * @param message Message to check
   * @param fileType MIME type to check for
   * @returns Whether the message contains the file type
   */
  public hasFileType(message: Message, fileType: string): boolean {
    if (!message.metadata?.files) {
      return false;
    }

    return message.metadata.files.some((file) =>
      file.mime_type?.includes(fileType),
    );
  }

  /**
   * Gets all image attachments from a message
   * @param message Message to extract images from
   * @returns Array of image attachments
   */
  public getImageAttachments(message: Message): MessageAttachment[] {
    try {
      if (!message.metadata?.files) {
        return [];
      }

      return message.metadata.files.filter(
        (file) =>
          file.mime_type?.startsWith("image/") ||
          ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(
            file.name.split(".").pop()?.toLowerCase() || "",
          ),
      );
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getImageAttachments",
        messageId: message.id,
      });
      return [];
    }
  }

  /**
   * Organizes messages into threads
   * @param messages Flat array of messages
   * @returns Map of root message IDs to thread messages
   */
  public organizeThreads(messages: Message[]): Map<string, Message[]> {
    try {
      const rootMessages: Message[] = [];
      const threadReplies = new Map<string, Message[]>();

      // First pass: separate root messages and replies
      messages.forEach((message) => {
        if (message.root_id) {
          // This is a thread reply
          if (!threadReplies.has(message.root_id)) {
            threadReplies.set(message.root_id, []);
          }

          threadReplies.get(message.root_id)?.push(message);
        } else {
          // This is a root message
          rootMessages.push(message);
        }
      });

      // Sort thread replies by date
      threadReplies.forEach((replies, rootId) => {
        threadReplies.set(rootId, this.sortMessages(replies));
      });

      return threadReplies;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "organizeThreads",
        messageCount: messages.length,
      });
      return new Map<string, Message[]>();
    }
  }

  /**
   * Gets parent message for a thread reply
   * @param reply Reply message
   * @param allMessages All available messages
   * @returns Parent message or undefined
   */
  public getThreadParent(
    reply: Message,
    allMessages: Message[],
  ): Message | undefined {
    if (!reply.root_id) {
      return undefined;
    }

    return allMessages.find((message) => message.id === reply.root_id);
  }

  /**
   * Creates a reaction object
   * @param messageId Message ID
   * @param userId User ID
   * @param emoji Emoji name
   * @returns Reaction object
   */
  public createReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): MessageReaction {
    return {
      emoji_name: emoji,
      user_id: userId,
      post_id: messageId,
      create_at: Date.now(),
    };
  }

  /**
   * Gets file download URL
   * @param fileId File ID
   * @returns Download URL
   */
  public getFileDownloadUrl(fileId: string): string {
    return `/api/v4/files/${fileId}`;
  }

  /**
   * Gets file preview URL
   * @param fileId File ID
   * @returns Preview URL
   */
  public getFilePreviewUrl(fileId: string): string {
    return `/api/v4/files/${fileId}/preview`;
  }

  /**
   * Gets a file's extension from its name
   * @param fileName File name
   * @returns File extension
   */
  public getFileExtension(fileName: string): string {
    return fileName
      .slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2)
      .toLowerCase();
  }

  /**
   * Checks if a file is an image based on its MIME type
   * @param mimeType MIME type
   * @returns Whether the file is an image
   */
  public isImageFile(mimeType: string): boolean {
    return mimeType.startsWith("image/");
  }

  /**
   * Checks if a file is a video based on its MIME type
   * @param mimeType MIME type
   * @returns Whether the file is a video
   */
  public isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith("video/");
  }

  /**
   * Checks if a file is an audio based on its MIME type
   * @param mimeType MIME type
   * @returns Whether the file is an audio
   */
  public isAudioFile(mimeType: string): boolean {
    return mimeType.startsWith("audio/");
  }

  /**
   * Checks if a file is a PDF based on its MIME type
   * @param mimeType MIME type
   * @returns Whether the file is a PDF
   */
  public isPdfFile(mimeType: string): boolean {
    return mimeType === "application/pdf";
  }

  /**
   * Gets a message by ID from an array
   * @param messageId Message ID
   * @param messages Array of messages
   * @returns Message or null if not found
   */
  public findMessageById(
    messageId: string,
    messages: Message[],
  ): Message | null {
    return messages.find((message) => message.id === messageId) || null;
  }

  /**
   * Creates a draft message
   * @param channelId Channel ID
   * @param userId User ID
   * @param text Message text
   * @returns Draft message object
   */
  public createDraftMessage(
    channelId: string,
    userId: string,
    text: string,
  ): Partial<Message> {
    return {
      channel_id: channelId,
      user_id: userId,
      message: text,
      create_at: Date.now(),
      update_at: Date.now(),
    };
  }

  /**
   * Validates that a message meets requirements
   * @param message Message to validate
   * @returns Whether the message is valid
   */
  public validateMessage(message: string): boolean {
    if (!message || typeof message !== "string") {
      return false;
    }

    // Check if message exceeds maximum length
    const MAX_LENGTH = 16383; // Mattermost maximum message length
    if (message.length > MAX_LENGTH) {
      return false;
    }

    return true;
  }

  /**
   * Notifies about message events
   * @param message Message that was acted upon
   * @param action Action performed on the message
   */
  public notifyMessageEvent(
    message: Message,
    action: "sent" | "received" | "updated" | "deleted",
  ): void {
    const eventMap = {
      sent: EventType.MESSAGE_SENT,
      received: EventType.MESSAGE_RECEIVED,
      updated: EventType.MESSAGE_UPDATED,
      deleted: EventType.MESSAGE_DELETED,
    };

    emitEvent(eventMap[action], {
      message,
      channelId: message.channel_id,
      userId: message.user_id,
      timestamp: Date.now(),
    });
  }
}

/**
 * Singleton instance of the message service
 */
export const messageService = new MessageService();
