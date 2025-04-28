// types/settings.types.ts
/**
 * Types for user settings
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
 * Notification settings
 */
export interface NotificationSettings {
  desktop: NotificationLevel;
  mobile: NotificationLevel;
  email: NotificationLevel;
  sound: boolean;
  channelOverrides: Record<
    string,
    {
      desktop?: NotificationLevel;
      mobile?: NotificationLevel;
    }
  >;
}

/**
 * Appearance settings
 */
export interface AppearanceSettings {
  theme: ThemeOption;
  compactView: boolean;
  clockDisplay: "12h" | "24h";
  linkPreview: boolean;
  collapseLinks: boolean;
  messageDisplay: "clean" | "compact" | "standard";
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  showStatus: boolean;
  showTypingIndicator: boolean;
  showReadStatus: boolean;
  autoDownloadAttachments: boolean;
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
  lastUpdated: number;
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
