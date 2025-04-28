// src/utils/formatters.ts
/**
 * Centralized formatting utilities
 * Using established libraries for reliable formatting
 */
import { format, formatDistance, formatRelative, isToday } from "date-fns";
import filesize from "filesize";

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  showTime?: boolean;
  showDate?: boolean;
  relative?: boolean;
  format?: "short" | "medium" | "long";
}

/**
 * Formats a timestamp to a human-readable date using date-fns
 */
export function formatDate(
  timestamp: number | Date,
  options: DateFormatOptions = {},
): string {
  const {
    showTime = true,
    showDate = true,
    relative = false,
    format: formatType = "medium",
  } = options;

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  // Use relative formatting if requested
  if (relative) {
    return formatDistance(date, new Date(), { addSuffix: true });
  }

  // For today's dates, may want special handling
  if (isToday(date) && !showDate && showTime) {
    return format(date, "h:mm a");
  }

  // Format based on requested format level
  let formatString = "";

  if (showDate) {
    switch (formatType) {
      case "short":
        formatString += "MM/dd/yy";
        break;
      case "medium":
        formatString += "MMM d, yyyy";
        break;
      case "long":
        formatString += "MMMM d, yyyy";
        break;
    }
  }

  if (showTime) {
    formatString += showDate ? " h:mm a" : "h:mm a";
  }

  return format(date, formatString);
}

/**
 * Formats a file size using the filesize library
 */
export function formatFileSize(bytes: number, options = {}): string {
  return filesize(bytes, options) as string;
}

/**
 * Formats a number with the Intl API
 */
export function formatNumber(
  num: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(undefined, options).format(num);
}

/**
 * Formats a user's name for display
 */
export function formatUserName(
  user:
    | {
        first_name?: string;
        last_name?: string;
        username?: string;
        nickname?: string;
      }
    | null
    | undefined,
): string {
  if (!user) return "Unknown User";

  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  } else if (user.nickname) {
    return user.nickname;
  } else if (user.first_name) {
    return user.first_name;
  } else if (user.username) {
    return user.username;
  }

  return "Unknown User";
}

/**
 * Gets user initials from name components
 */
export function getUserInitials(
  user:
    | {
        first_name?: string;
        last_name?: string;
        username?: string;
        nickname?: string;
      }
    | null
    | undefined,
): string {
  if (!user) return "?";

  if (user.first_name && user.last_name) {
    return (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase();
  } else if (user.first_name) {
    return user.first_name.charAt(0).toUpperCase();
  } else if (user.username) {
    return user.username.charAt(0).toUpperCase();
  }

  return "?";
}

/**
 * Formats an unread count for display
 */
export function formatUnreadCount(
  count: number,
  maxDisplayCount: number = 99,
): string {
  if (count <= 0) return "";
  if (count <= maxDisplayCount) return count.toString();
  return `${maxDisplayCount}+`;
}
