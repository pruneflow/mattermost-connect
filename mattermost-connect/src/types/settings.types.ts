/**
 * User settings related type definitions
 * Comprehensive types for user preferences and app configuration
 */

/**
 * Notification level options
 */
export type NotificationLevel = "all" | "mentions" | "none";

/**
 * Theme options
 */
export type ThemeOption = "default" | "dark" | "light" | "system" | string;

/**
 * Clock display format
 */
export type ClockDisplay = "12h" | "24h";

/**
 * Message display format
 */
export type MessageDisplay = "clean" | "compact" | "standard";

/**
 * Performance mode options
 */
export type PerformanceMode = "default" | "high" | "low";

/**
 * Font size options
 */
export type FontSize = "small" | "medium" | "large" | "x-large" | string;

/**
 * Channel notification override
 */
export interface ChannelNotificationOverride {
  /** Desktop notification level */
  desktop?: NotificationLevel;
  /** Mobile notification level */
  mobile?: NotificationLevel;
  /** Email notification level */
  email?: NotificationLevel;
  /** Mark unread behavior */
  mark_unread?: "all" | "mention";
  /** Expiration time if temporary */
  expiration?: number;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Desktop notification level */
  desktop: NotificationLevel;
  /** Mobile notification level */
  mobile: NotificationLevel;
  /** Email notification level */
  email: NotificationLevel;
  /** Whether to play sound on desktop */
  sound: boolean;
  /** Channel-specific overrides */
  channelOverrides: Record<string, ChannelNotificationOverride>;
}

/**
 * Appearance settings
 */
export interface AppearanceSettings {
  /** UI theme */
  theme: ThemeOption;
  /** Whether to use compact view */
  compactView: boolean;
  /** Clock display format */
  clockDisplay: ClockDisplay;
  /** Whether to show link previews */
  linkPreview: boolean;
  /** Whether to collapse links */
  collapseLinks: boolean;
  /** Message display format */
  messageDisplay: MessageDisplay;
  /** Custom font size */
  customFontSize?: FontSize;
  /** UI language */
  language?: string;
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  /** Whether to show online status */
  showStatus: boolean;
  /** Whether to show typing indicator */
  showTypingIndicator: boolean;
  /** Whether to show read status */
  showReadStatus: boolean;
  /** Whether to auto-download attachments */
  autoDownloadAttachments: boolean;
  /** Whether to share presence */
  sharePresence?: boolean;
}

/**
 * Advanced settings
 */
export interface AdvancedSettings {
  /** Whether debug mode is enabled */
  enableDebugMode?: boolean;
  /** Whether experimental features are enabled */
  enableExperimentalFeatures?: boolean;
  /** Performance mode */
  performanceMode?: PerformanceMode;
  /** Maximum cache size in MB */
  cacheSize?: number;
}

/**
 * User preference key types
 */
export enum PreferenceKey {
  FAVORITES = "favorites",
  MUTED_CHANNELS = "muted_channels",
  THEME = "theme",
  NOTIFICATIONS = "notifications",
  APPEARANCE = "appearance",
  PRIVACY = "privacy",
  ADVANCED = "advanced",
  LANGUAGE = "language",
}

/**
 * Preference category types
 * Maps to Mattermost server categories
 */
export enum PreferenceCategory {
  DISPLAY_SETTINGS = "display_settings",
  THEME = "theme",
  NOTIFICATIONS = "notifications",
  FAVORITE_CHANNEL = "favorite_channel",
  SIDEBAR_SETTINGS = "sidebar_settings",
  CHANNEL_NOTIFICATIONS = "channel_notifications",
}

/**
 * User preference type
 * Format used by Mattermost API
 */
export interface UserPreference {
  /** User ID */
  user_id: string;
  /** Preference category */
  category: string;
  /** Preference name */
  name: string;
  /** Preference value */
  value: string;
}

/**
 * User settings state
 */
export interface UserSettingsState {
  /** Favorite channel IDs */
  favorites: Set<string>;
  /** Muted channel IDs */
  mutedChannels: Set<string>;
  /** Notification settings */
  notifications: NotificationSettings;
  /** Appearance settings */
  appearance: AppearanceSettings;
  /** Privacy settings */
  privacy: PrivacySettings;
  /** Advanced settings */
  advanced: AdvancedSettings;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Settings change event data
 */
export interface SettingsChangeEventData {
  /** Setting that changed */
  setting?: PreferenceKey;
  /** Channel ID if channel-specific */
  channelId?: string;
  /** Property key if object setting */
  key?: string;
  /** New value */
  value?: any;
  /** Whether settings were reset */
  reset?: boolean;
  /** Whether to preserve some preferences during reset */
  preservePreferences?: boolean;
  /** Expiration time for temporary settings */
  expirationTime?: number;
}
