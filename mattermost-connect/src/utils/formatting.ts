// src/utils/formatting.ts

/**
 * Formatting utilities for text and dates
 */

// Regular expressions for common Markdown patterns
const BOLD_REGEX = /\*\*(.*?)\*\*/g;
const ITALIC_REGEX = /\*(.*?)\*/g;
const STRIKE_REGEX = /~~(.*?)~~/g;
const CODE_REGEX = /`(.*?)`/g;
const CODE_BLOCK_REGEX = /```(?:\w+)?\n?([\s\S]*?)\n?```/g;
const LINK_REGEX = /\[(.*?)\]\((.*?)\)/g;
const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;
const CHANNEL_MENTION_REGEX = /~([a-zA-Z0-9._-]+)/g;

/**
 * Format options for timestamp formatting
 */
export interface FormatTimestampOptions {
  /** Show date if it's not today */
  showDate?: boolean;

  /** Show time */
  showTime?: boolean;

  /** Format for date display */
  dateFormat?: Intl.DateTimeFormatOptions;

  /** Format for time display */
  timeFormat?: Intl.DateTimeFormatOptions;

  /** Locale for formatting */
  locale?: string;
}

/**
 * Converts Markdown text to HTML
 *
 * @param text - Text to format
 * @returns Formatted HTML text
 */
export const formatMessageText = (text: string): string => {
  if (!text) return "";

  let formattedText = text;

  // Escape HTML characters
  formattedText = escapeHtml(formattedText);

  // Process code blocks first (priority to avoid formatting inside)
  formattedText = formattedText.replace(CODE_BLOCK_REGEX, (match, content) => {
    return `<pre><code>${content}</code></pre>`;
  });

  // Process inline code
  formattedText = formattedText.replace(CODE_REGEX, (match, content) => {
    return `<code>${content}</code>`;
  });

  // Common formatting
  formattedText = formattedText
    .replace(BOLD_REGEX, "<strong>$1</strong>")
    .replace(ITALIC_REGEX, "<em>$1</em>")
    .replace(STRIKE_REGEX, "<del>$1</del>");

  // Links
  formattedText = formattedText.replace(
    LINK_REGEX,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Simple URLs
  formattedText = formatUrls(formattedText);

  // Mentions (@user, ~channel)
  formattedText = formattedText
    .replace(MENTION_REGEX, '<span class="mattermost-mention">@$1</span>')
    .replace(
      CHANNEL_MENTION_REGEX,
      '<span class="mattermost-channel-mention">~$1</span>',
    );

  // Line breaks
  formattedText = formattedText.replace(/\n/g, "<br />");

  return formattedText;
};

/**
 * Escapes special HTML characters
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
const escapeHtml = (text: string): string => {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (match) => htmlEntities[match]);
};

/**
 * Detects and converts URLs to clickable links
 *
 * @param text - Text containing URLs
 * @returns Text with URLs converted to links
 */
const formatUrls = (text: string): string => {
  // Regex for detecting URLs
  const URL_REGEX = /(?<!["'])((https?|ftp):\/\/[^\s<]+[^<.,:;"')\]\s])/g;

  return text.replace(URL_REGEX, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};

/**
 * Formats a timestamp to a readable string
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatTimestamp = (
  timestamp: number,
  options: FormatTimestampOptions = {},
): string => {
  if (!timestamp) return "";

  const {
    showDate = true,
    showTime = true,
    locale = "fr-FR",
    dateFormat = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
    timeFormat = {
      hour: "2-digit",
      minute: "2-digit",
    },
  } = options;

  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  // Short time format for today, full date otherwise
  if (isToday || !showDate) {
    return showTime
      ? new Intl.DateTimeFormat(locale, timeFormat).format(date)
      : "";
  } else {
    const formatOptions = {
      ...dateFormat,
      ...(showTime ? timeFormat : {}),
    };

    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  }
};

/**
 * Truncates long text with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength = 100): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Generates avatar initials from a name or username
 *
 * @param name - Full name or username
 * @returns Initials (1-2 characters)
 */
export const getInitials = (name?: string): string => {
  if (!name) return "?";

  // Split by spaces
  const parts = name.trim().split(/\s+/);

  if (parts.length > 1) {
    // Get first letters of first and last name
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  // Just username - take first character
  return parts[0][0].toUpperCase();
};

/**
 * Generates a consistent color from a string (username, etc.)
 *
 * @param str - String to generate color from
 * @returns Hex color code
 */
export const generateColorFromString = (str?: string): string => {
  if (!str) return "#2196f3"; // Default color

  const colors = [
    "#f44336",
    "#e91e63",
    "#9c27b0",
    "#673ab7",
    "#3f51b5",
    "#2196f3",
    "#03a9f4",
    "#00bcd4",
    "#009688",
    "#4caf50",
    "#8bc34a",
    "#cddc39",
    "#ffc107",
    "#ff9800",
    "#ff5722",
    "#795548",
  ];

  // Sum ASCII values of all characters
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }

  // Return color based on sum
  return colors[sum % colors.length];
};

export default {
  formatMessageText,
  formatTimestamp,
  truncateText,
  getInitials,
  generateColorFromString,
};
