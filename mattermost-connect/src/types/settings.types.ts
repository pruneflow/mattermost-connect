/**
 * User settings related type definitions
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
 * Channel notification override
 */
export interface ChannelNotificationOverride {
  desktop?: NotificationLevel;
  mobile?: NotificationLevel;
  email?: NotificationLevel;
  mark_unread?: "all" | "mention";
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  desktop: NotificationLevel;
  mobile: NotificationLevel;
  email: NotificationLevel;
  sound: boolean;
  channelOverrides: Record<string, ChannelNotificationOverride>;
}

/**
 * Appearance settings
 */
export interface AppearanceSettings {
  theme: ThemeOption;
  compactView: boolean;
  clockDisplay: ClockDisplay;
  linkPreview: boolean;
  collapseLinks: boolean;
  messageDisplay: MessageDisplay;
  customFontSize?: string;
  language?: string;
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  showStatus: boolean;
  showTypingIndicator: boolean;
  showReadStatus: boolean;
  autoDownloadAttachments: boolean;
  sharePresence?: boolean;
}

/**
 * Advanced settings
 */
export interface AdvancedSettings {
  enableDebugMode?: boolean;
  enableExperimentalFeatures?: boolean;
  performanceMode?: "default" | "high" | "low";
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
}

/**
 * User preference type
 */
export interface UserPreference {
  user_id: string;
  category: string;
  name: string;
  value: string;
}

/**
 * Preference category types
 */
export enum PreferenceCategory {
  DISPLAY_SETTINGS = "display_settings",
  THEME = "theme",
  NOTIFICATIONS = "notifications",
  CHANNEL_OPEN_TIME = "channel_open_time",
  CHANNEL_APPROXIMATE_VIEW_TIME = "channel_approximate_view_time",
  FAVORITE_CHANNEL = "favorite_channel",
  SIDEBAR_SETTINGS = "sidebar_settings",
}

/**
 * User settings state
 */
export interface UserSettingsState {
  favorites: Set<string>;
  mutedChannels: Set<string>;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
  lastUpdated: number;
}
