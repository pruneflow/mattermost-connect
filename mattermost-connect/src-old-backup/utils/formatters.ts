/**
 * Utility functions for formatting data
 */

/**
 * Format a timestamp to a human-readable date string
 */
export function formatDate(timestamp: number, locale = 'en-US'): string {
  const date = new Date(timestamp);
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a timestamp to a human-readable time string
 */
export function formatTime(timestamp: number, locale = 'en-US'): string {
  const date = new Date(timestamp);
  
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

/**
 * Format a timestamp to a human-readable date and time string
 */
export function formatDateTime(timestamp: number, locale = 'en-US'): string {
  const date = new Date(timestamp);
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

/**
 * Format a timestamp to a relative time string (e.g., "5 minutes ago")
 */
export function formatRelativeTime(timestamp: number, locale = 'en-US'): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Convert to seconds
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  
  // Convert to minutes
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  // Convert to hours
  const hours = Math.floor(minutes / 60);
  
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // Convert to days
  const days = Math.floor(hours / 24);
  
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  // For older dates, use formatDate
  return formatDate(timestamp, locale);
}

/**
 * Format a file size in bytes to a human-readable string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate a string if it exceeds the specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a user's name for display
 * Prioritizes full name (first + last) if available,
 * then falls back to nickname, first name, or username
 */
export function formatUserName(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  nickname?: string;
} | null | undefined): string {
  if (!user) return 'Unknown User';
  
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  
  if (fullName) return fullName;
  if (user.nickname) return user.nickname;
  if (user.first_name) return user.first_name;
  if (user.username) return user.username;
  
  return 'Unknown User';
}

/**
 * Get initials from a user object
 */
export function getUserInitials(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
} | null | undefined): string {
  if (!user) return '?';
  
  if (user.first_name && user.last_name) {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  }
  
  if (user.first_name) {
    return user.first_name.charAt(0).toUpperCase();
  }
  
  if (user.username) {
    return user.username.charAt(0).toUpperCase();
  }
  
  return '?';
}