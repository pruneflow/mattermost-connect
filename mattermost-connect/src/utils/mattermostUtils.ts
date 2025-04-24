// src/utils/mattermostUtils.ts
/**
 * Utility functions for MattermostConnect
 */

/**
 * Formats a timestamp to a human-readable date
 * @param timestamp Timestamp in milliseconds
 * @param options Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  timestamp: number,
  options: {
    showTime?: boolean;
    showDate?: boolean;
    relative?: boolean;
    format?: "short" | "medium" | "long";
  } = {},
): string {
  const {
    showTime = true,
    showDate = true,
    relative = false,
    format = "medium",
  } = options;

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // For relative time formatting
  if (relative) {
    if (diffMs < 60 * 1000) {
      return "Just now";
    } else if (diffMs < 60 * 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    } else if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    }
  }

  // Default to Intl.DateTimeFormat for non-relative formatting
  const dateOptions: Intl.DateTimeFormatOptions = {};

  if (showDate) {
    if (format === "short") {
      dateOptions.month = "numeric";
      dateOptions.day = "numeric";
      if (date.getFullYear() !== now.getFullYear()) {
        dateOptions.year = "2-digit";
      }
    } else if (format === "medium") {
      dateOptions.month = "short";
      dateOptions.day = "numeric";
      if (date.getFullYear() !== now.getFullYear()) {
        dateOptions.year = "numeric";
      }
    } else if (format === "long") {
      dateOptions.month = "long";
      dateOptions.day = "numeric";
      dateOptions.year = "numeric";
    }
  }

  if (showTime) {
    dateOptions.hour = "numeric";
    dateOptions.minute = "2-digit";
    dateOptions.hour12 = true;
  }

  return new Intl.DateTimeFormat(undefined, dateOptions).format(date);
}

/**
 * Formats a file size to a human-readable string
 * @param bytes Size in bytes
 * @param decimals Number of decimal places
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Parses emojis from text
 * @param text Text to parse
 * @returns Array of emoji names
 */
export function parseEmojis(text: string): string[] {
  const emojiRegex = /:([a-zA-Z0-9_\-+]+):/g;
  const emojis: string[] = [];
  let match;

  while ((match = emojiRegex.exec(text)) !== null) {
    emojis.push(match[1]);
  }

  return emojis;
}

/**
 * Generates a channel name for direct messages
 * @param userId Current user ID
 * @param otherId Other user ID
 * @returns Channel name
 */
export function generateDirectChannelName(
  userId: string,
  otherId: string,
): string {
  // Direct channel names are two user IDs sorted alphabetically and joined with a double underscore
  return [userId, otherId].sort().join("__");
}

/**
 * Gets a user's initials from their name
 * @param firstName First name
 * @param lastName Last name
 * @returns User initials
 */
export function getUserInitials(
  firstName?: string,
  lastName?: string,
  username?: string,
): string {
  if (firstName && lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  } else if (firstName) {
    return firstName.charAt(0).toUpperCase();
  } else if (lastName) {
    return lastName.charAt(0).toUpperCase();
  } else if (username) {
    return username.charAt(0).toUpperCase();
  }

  return "?";
}

/**
 * Checks if a string is a valid URL
 * @param str String to check
 * @returns Whether the string is a URL
 */
export function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the file extension from a file name
 * @param fileName File name
 * @returns File extension
 */
export function getFileExtension(fileName: string): string {
  return fileName
    .slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2)
    .toLowerCase();
}

/**
 * Checks if a file is an image based on its type or extension
 * @param fileType File MIME type
 * @param fileName File name
 * @returns Whether the file is an image
 */
export function isImageFile(fileType?: string, fileName?: string): boolean {
  if (fileType && fileType.startsWith("image/")) {
    return true;
  }

  if (fileName) {
    const ext = getFileExtension(fileName);
    return ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext);
  }

  return false;
}

/**
 * Truncates text to a specified length
 * @param text Text to truncate
 * @param length Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }

  return text.substring(0, length) + "...";
}

/**
 * Debounces a function
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function
 * @param func Function to throttle
 * @param limit Limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan: number = 0;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      lastRan = Date.now();
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    } else {
      if (lastFunc) {
        clearTimeout(lastFunc);
      }

      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan),
      );
    }
  };
}

/**
 * Escapes HTML characters in a string
 * @param html HTML string
 * @returns Escaped string
 */
export function escapeHtml(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Creates a color from a string (useful for user avatars)
 * @param str String to generate color from
 * @returns Hex color code
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }

  return color;
}
