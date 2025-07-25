import { UserTimezone } from '../api/types'

/**
 * Date and time formatting utilities for Mattermost Connect
 * Based on existing formatter utilities
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
 * Format message timestamp following Mattermost patterns
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 */
export function formatMessageTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 minute ago
  if (diff < 60000) {
    return 'now';
  }
  
  // Same day - show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Same year - show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // Different year - show full date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format message time for display (short format)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Short time string
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format full date with time for tooltips
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Full date and time string
 */
export function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}


export function getUserCurrentTimezone(userTimezone?: UserTimezone): string {
  if (!userTimezone) {
    return 'UTC';
  }
  const {
    useAutomaticTimezone,
    automaticTimezone,
    manualTimezone,
  } = userTimezone;

  let useAutomatic = useAutomaticTimezone;
  if (typeof useAutomaticTimezone === 'string') {
    useAutomatic = useAutomaticTimezone === 'true';
  }

  if (useAutomatic) {
    return automaticTimezone || 'UTC';
  }
  return manualTimezone || 'UTC';
}