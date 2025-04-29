// src/core/store/userSettingsStore.ts
/**
 * User Settings Store
 * Central management of user preferences and settings
 * Optimized with immer and persist middleware for seamless updates and persistence
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import {
  UserSettingsState,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  AdvancedSettings,
  PreferenceKey,
  ThemeOption,
  NotificationLevel,
  ClockDisplay,
  MessageDisplay,
  EventType,
  ErrorSource,
} from "../../types";
import { handleError } from "./errorStore";
import { emitEvent } from "../api/eventUtils";

/**
 * Default notification settings
 */
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  desktop: "mentions",
  mobile: "mentions",
  email: "mentions",
  sound: true,
  channelOverrides: {},
};

/**
 * Default appearance settings
 */
const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: "default",
  compactView: false,
  clockDisplay: "12h",
  linkPreview: true,
  collapseLinks: false,
  messageDisplay: "standard",
  customFontSize: "medium",
  language: "en",
};

/**
 * Default privacy settings
 */
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  showStatus: true,
  showTypingIndicator: true,
  showReadStatus: true,
  autoDownloadAttachments: true,
  sharePresence: true,
};

/**
 * Default advanced settings
 */
const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  enableDebugMode: false,
  enableExperimentalFeatures: false,
  performanceMode: "default",
  cacheSize: 50,
};

/**
 * Enhanced user settings store state with actions
 */
interface UserSettingsStoreState extends UserSettingsState {
  // Favorites Actions
  toggleFavorite: (channelId: string) => void;
  addFavorite: (channelId: string) => void;
  removeFavorite: (channelId: string) => void;
  getFavorites: () => string[];
  isFavorite: (channelId: string) => boolean;

  // Muted Channels Actions
  toggleMuted: (channelId: string) => void;
  muteChannel: (channelId: string, expirationTime?: number) => void;
  unmuteChannel: (channelId: string) => void;
  getMutedChannels: () => string[];
  isChannelMuted: (channelId: string) => boolean;

  // Appearance Actions
  setTheme: (theme: ThemeOption) => void;
  setAppearanceSetting: <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K],
  ) => void;
  getAppearanceSettings: () => AppearanceSettings;

  // Notification Actions
  setNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => void;
  setChannelNotificationOverride: (
    channelId: string,
    setting: "desktop" | "mobile" | "email",
    level: NotificationLevel,
  ) => void;
  getNotificationSettings: () => NotificationSettings;
  getChannelNotificationOverride: (
    channelId: string,
    setting: "desktop" | "mobile" | "email",
  ) => NotificationLevel | undefined;

  // Privacy Actions
  setPrivacySetting: <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K],
  ) => void;
  getPrivacySettings: () => PrivacySettings;

  // Advanced Actions
  setAdvancedSetting: <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K],
  ) => void;
  getAdvancedSettings: () => AdvancedSettings;

  // Language Setting
  setLanguage: (langCode: string) => void;
  getLanguage: () => string;

  // Reset Actions
  resetAppearanceSettings: () => void;
  resetNotificationSettings: () => void;
  resetPrivacySettings: () => void;
  resetAdvancedSettings: () => void;
  resetAllSettings: (preservePreferences?: boolean) => void;
  reset: () => void;
}

/**
 * Type for persisted state to ensure proper storage and retrieval
 */
interface PersistedState {
  favorites: string[];
  mutedChannels: string[];
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
  lastUpdated: number;
}

/**
 * Creates and exports the userSettingsStore using Zustand
 * Optimized with immer for immutability and persist for localStorage persistence
 */
export const useUserSettingsStore = create<UserSettingsStoreState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      favorites: new Set<string>(),
      mutedChannels: new Set<string>(),
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
      appearance: DEFAULT_APPEARANCE_SETTINGS,
      privacy: DEFAULT_PRIVACY_SETTINGS,
      advanced: DEFAULT_ADVANCED_SETTINGS,
      lastUpdated: Date.now(),

      // ===== Favorites Actions =====

      /**
       * Toggles favorite status of a channel
       */
      toggleFavorite: (channelId: string) => {
        set((state) => {
          const isFavorite = state.favorites.has(channelId);

          if (isFavorite) {
            state.favorites.delete(channelId);
          } else {
            state.favorites.add(channelId);
          }

          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        const isFavorite = get().favorites.has(channelId);
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.FAVORITES,
          channelId,
          value: isFavorite,
        });
      },

      /**
       * Adds a channel to favorites
       */
      addFavorite: (channelId: string) => {
        // Skip if already a favorite
        if (get().favorites.has(channelId)) return;

        set((state) => {
          state.favorites.add(channelId);
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.FAVORITES,
          channelId,
          value: true,
        });
      },

      /**
       * Removes a channel from favorites
       */
      removeFavorite: (channelId: string) => {
        // Skip if not a favorite
        if (!get().favorites.has(channelId)) return;

        set((state) => {
          state.favorites.delete(channelId);
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.FAVORITES,
          channelId,
          value: false,
        });
      },

      /**
       * Gets all favorite channel IDs
       */
      getFavorites: () => {
        return Array.from(get().favorites);
      },

      /**
       * Checks if a channel is a favorite
       */
      isFavorite: (channelId: string) => {
        return get().favorites.has(channelId);
      },

      // ===== Muted Channels Actions =====

      /**
       * Toggles muted status of a channel
       */
      toggleMuted: (channelId: string) => {
        set((state) => {
          const isMuted = state.mutedChannels.has(channelId);

          if (isMuted) {
            state.mutedChannels.delete(channelId);
          } else {
            state.mutedChannels.add(channelId);
          }

          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        const isMuted = get().mutedChannels.has(channelId);
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.MUTED_CHANNELS,
          channelId,
          value: isMuted,
        });
      },

      /**
       * Mutes a channel
       */
      muteChannel: (channelId: string, expirationTime?: number) => {
        // Skip if already muted
        if (get().mutedChannels.has(channelId)) return;

        set((state) => {
          state.mutedChannels.add(channelId);
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.MUTED_CHANNELS,
          channelId,
          value: true,
          expirationTime,
        });

        // If expiration time is set, schedule unmute
        if (expirationTime) {
          const timeoutMs = expirationTime - Date.now();
          if (timeoutMs > 0) {
            setTimeout(() => {
              const store = get();
              if (store.mutedChannels.has(channelId)) {
                store.unmuteChannel(channelId);
              }
            }, timeoutMs);
          }
        }
      },

      /**
       * Unmutes a channel
       */
      unmuteChannel: (channelId: string) => {
        // Skip if not muted
        if (!get().mutedChannels.has(channelId)) return;

        set((state) => {
          state.mutedChannels.delete(channelId);
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.MUTED_CHANNELS,
          channelId,
          value: false,
        });
      },

      /**
       * Gets all muted channel IDs
       */
      getMutedChannels: () => {
        return Array.from(get().mutedChannels);
      },

      /**
       * Checks if a channel is muted
       */
      isChannelMuted: (channelId: string) => {
        return get().mutedChannels.has(channelId);
      },

      // ===== Appearance Actions =====

      /**
       * Sets the application theme
       */
      setTheme: (theme: ThemeOption) => {
        set((state) => {
          state.appearance.theme = theme;
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.THEME,
          value: theme,
        });
      },

      /**
       * Sets a specific appearance setting
       */
      setAppearanceSetting: <K extends keyof AppearanceSettings>(
        key: K,
        value: AppearanceSettings[K],
      ) => {
        set((state) => {
          state.appearance[key] = value;
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.APPEARANCE,
          key,
          value,
        });
      },

      /**
       * Gets all appearance settings
       */
      getAppearanceSettings: () => {
        return { ...get().appearance };
      },

      // ===== Notification Actions =====

      /**
       * Sets a notification setting
       */
      setNotificationSetting: <K extends keyof NotificationSettings>(
        key: K,
        value: NotificationSettings[K],
      ) => {
        set((state) => {
          if (key === "channelOverrides") {
            // Deep clone for nested objects
            state.notifications.channelOverrides =
              value as NotificationSettings["channelOverrides"];
          } else {
            state.notifications[key] = value;
          }
          state.lastUpdated = Date.now();
        });

        // Don't emit events for complex objects
        if (key !== "channelOverrides") {
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.NOTIFICATIONS,
            key,
            value,
          });
        }
      },

      /**
       * Sets notification override for a specific channel
       */
      setChannelNotificationOverride: (
        channelId: string,
        setting: "desktop" | "mobile" | "email",
        level: NotificationLevel,
      ) => {
        set((state) => {
          const currentOverrides = state.notifications.channelOverrides || {};
          const channelOverride = currentOverrides[channelId] || {};

          // Update with new override
          state.notifications.channelOverrides = {
            ...currentOverrides,
            [channelId]: {
              ...channelOverride,
              [setting]: level,
            },
          };

          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.NOTIFICATIONS,
          channelId,
          key: setting,
          value: level,
        });
      },

      /**
       * Gets all notification settings
       */
      getNotificationSettings: () => {
        return { ...get().notifications };
      },

      /**
       * Gets notification override for a channel
       */
      getChannelNotificationOverride: (
        channelId: string,
        setting: "desktop" | "mobile" | "email",
      ) => {
        const { notifications } = get();
        const channelOverrides = notifications.channelOverrides || {};
        const channelOverride = channelOverrides[channelId];

        return channelOverride ? channelOverride[setting] : undefined;
      },

      // ===== Privacy Actions =====

      /**
       * Sets a privacy setting
       */
      setPrivacySetting: <K extends keyof PrivacySettings>(
        key: K,
        value: PrivacySettings[K],
      ) => {
        set((state) => {
          state.privacy[key] = value;
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.PRIVACY,
          key,
          value,
        });
      },

      /**
       * Gets all privacy settings
       */
      getPrivacySettings: () => {
        return { ...get().privacy };
      },

      // ===== Advanced Settings Actions =====

      /**
       * Sets an advanced setting
       */
      setAdvancedSetting: <K extends keyof AdvancedSettings>(
        key: K,
        value: AdvancedSettings[K],
      ) => {
        set((state) => {
          state.advanced[key] = value;
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.ADVANCED,
          key,
          value,
        });
      },

      /**
       * Gets all advanced settings
       */
      getAdvancedSettings: () => {
        return { ...get().advanced };
      },

      // ===== Language Setting =====

      /**
       * Sets the application language
       */
      setLanguage: (langCode: string) => {
        set((state) => {
          state.appearance.language = langCode;
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.LANGUAGE,
          value: langCode,
        });
      },

      /**
       * Gets the current language setting
       */
      getLanguage: () => {
        return get().appearance.language || "en";
      },

      // ===== Reset Actions =====

      /**
       * Resets appearance settings to defaults
       */
      resetAppearanceSettings: () => {
        set((state) => {
          // Preserve language when resetting appearance
          const currentLang = state.appearance.language;
          state.appearance = {
            ...DEFAULT_APPEARANCE_SETTINGS,
            language: currentLang,
          };
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.APPEARANCE,
          reset: true,
        });
      },

      /**
       * Resets notification settings to defaults
       */
      resetNotificationSettings: () => {
        set((state) => {
          state.notifications = { ...DEFAULT_NOTIFICATION_SETTINGS };
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.NOTIFICATIONS,
          reset: true,
        });
      },

      /**
       * Resets privacy settings to defaults
       */
      resetPrivacySettings: () => {
        set((state) => {
          state.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.PRIVACY,
          reset: true,
        });
      },

      /**
       * Resets advanced settings to defaults
       */
      resetAdvancedSettings: () => {
        set((state) => {
          state.advanced = { ...DEFAULT_ADVANCED_SETTINGS };
          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.ADVANCED,
          reset: true,
        });
      },

      /**
       * Resets all settings to defaults
       * @param preservePreferences If true, keeps favorites and muted channels
       */
      resetAllSettings: (preservePreferences = false) => {
        set((state) => {
          const favorites = preservePreferences
            ? state.favorites
            : new Set<string>();
          const mutedChannels = preservePreferences
            ? state.mutedChannels
            : new Set<string>();

          state.notifications = { ...DEFAULT_NOTIFICATION_SETTINGS };
          state.appearance = { ...DEFAULT_APPEARANCE_SETTINGS };
          state.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
          state.advanced = { ...DEFAULT_ADVANCED_SETTINGS };

          // Only reset these if preservePreferences is false
          if (!preservePreferences) {
            state.favorites = new Set<string>();
            state.mutedChannels = new Set<string>();
          } else {
            state.favorites = favorites;
            state.mutedChannels = mutedChannels;
          }

          state.lastUpdated = Date.now();
        });

        emitEvent(EventType.SETTINGS_CHANGED, {
          reset: true,
          preservePreferences,
        });
      },

      /**
       * Resets the store to initial state
       * Used primarily for logout
       */
      reset: () => {
        set({
          favorites: new Set<string>(),
          mutedChannels: new Set<string>(),
          notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
          appearance: { ...DEFAULT_APPEARANCE_SETTINGS },
          privacy: { ...DEFAULT_PRIVACY_SETTINGS },
          advanced: { ...DEFAULT_ADVANCED_SETTINGS },
          lastUpdated: Date.now(),
        });

        emitEvent(EventType.SETTINGS_CHANGED, { reset: true });
      },
    })),
    {
      name: "mattermost-user-settings",
      partialize: (state): PersistedState => ({
        favorites: Array.from(state.favorites),
        mutedChannels: Array.from(state.mutedChannels),
        notifications: state.notifications,
        appearance: state.appearance,
        privacy: state.privacy,
        advanced: state.advanced,
        lastUpdated: state.lastUpdated,
      }),
      merge: (persisted, current) => {
        try {
          // Type assertion to ensure proper typing
          const persistedState = persisted as unknown as PersistedState;

          return {
            ...current,
            favorites: new Set(persistedState.favorites || []),
            mutedChannels: new Set(persistedState.mutedChannels || []),
            notifications:
              persistedState.notifications || DEFAULT_NOTIFICATION_SETTINGS,
            appearance:
              persistedState.appearance || DEFAULT_APPEARANCE_SETTINGS,
            privacy: persistedState.privacy || DEFAULT_PRIVACY_SETTINGS,
            advanced: persistedState.advanced || DEFAULT_ADVANCED_SETTINGS,
            lastUpdated: persistedState.lastUpdated || Date.now(),
          };
        } catch (error) {
          // Handle persistence errors gracefully
          handleError(error as Error, ErrorSource.STORAGE, undefined, {
            persistedState: persisted,
          });

          // Return current state as fallback
          return current;
        }
      },
      onRehydrateStorage: () => (state) => {
        if (!state) {
          console.warn("Failed to rehydrate user settings");
        }
      },
    },
  ),
);

// ===== Helper functions for commonly used settings =====

/**
 * Gets the current theme setting
 * @returns Current theme
 */
export function getCurrentTheme(): ThemeOption {
  return useUserSettingsStore.getState().appearance.theme;
}

/**
 * Checks if a channel is favorited
 * @param channelId Channel ID
 * @returns Whether the channel is a favorite
 */
export function isChannelFavorite(channelId: string): boolean {
  return useUserSettingsStore.getState().isFavorite(channelId);
}

/**
 * Checks if a channel is muted
 * @param channelId Channel ID
 * @returns Whether the channel is muted
 */
export function isChannelMuted(channelId: string): boolean {
  return useUserSettingsStore.getState().isChannelMuted(channelId);
}

/**
 * Gets current clock display setting (12h/24h)
 * @returns Clock display format
 */
export function getClockDisplay(): ClockDisplay {
  return useUserSettingsStore.getState().appearance.clockDisplay;
}

/**
 * Gets current message display setting
 * @returns Message display format
 */
export function getMessageDisplay(): MessageDisplay {
  return useUserSettingsStore.getState().appearance.messageDisplay;
}

/**
 * Converts user preferences to server format for API requests
 * @param userId User ID (defaults to "me")
 * @returns Array of preference objects ready for API submission
 */
export function getPreferencesForApi(userId: string = "me"): Array<{
  user_id: string;
  category: string;
  name: string;
  value: string;
}> {
  const state = useUserSettingsStore.getState();
  const preferences: Array<{
    user_id: string;
    category: string;
    name: string;
    value: string;
  }> = [];

  // Add favorites
  const favorites = state.getFavorites();
  favorites.forEach((channelId) => {
    preferences.push({
      user_id: userId,
      category: "favorite_channel",
      name: channelId,
      value: "true",
    });
  });

  // Add theme preference
  preferences.push({
    user_id: userId,
    category: "theme",
    name: "name",
    value: state.appearance.theme,
  });

  // Add display settings
  Object.entries(state.appearance).forEach(([key, value]) => {
    if (key !== "language") {
      preferences.push({
        user_id: userId,
        category: "display_settings",
        name: key,
        value:
          typeof value === "boolean"
            ? value
              ? "true"
              : "false"
            : String(value),
      });
    }
  });

  // Add language setting
  preferences.push({
    user_id: userId,
    category: "display_settings",
    name: "language",
    value: state.appearance.language || "en",
  });

  // Add notification settings
  Object.entries(state.notifications).forEach(([key, value]) => {
    if (key !== "channelOverrides") {
      preferences.push({
        user_id: userId,
        category: "notifications",
        name: key,
        value:
          typeof value === "boolean"
            ? value
              ? "true"
              : "false"
            : String(value),
      });
    }
  });

  // Add channel notification overrides
  const overrides = state.notifications.channelOverrides || {};
  Object.entries(overrides).forEach(([channelId, settings]) => {
    Object.entries(settings).forEach(([setting, level]) => {
      preferences.push({
        user_id: userId,
        category: "channel_notifications",
        name: `${channelId}_${setting}`,
        value: level as string,
      });
    });
  });

  return preferences;
}
