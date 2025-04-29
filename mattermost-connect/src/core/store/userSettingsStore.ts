// src/core/store/userSettingsStore.ts
/**
 * User Settings store
 * Centralized storage and management of user preferences and settings
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, PersistOptions } from "zustand/middleware";
import {
  UserSettingsState,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  AdvancedSettings,
  ThemeOption,
  NotificationLevel,
  PreferenceKey,
  PreferenceCategory,
  ClockDisplay,
  MessageDisplay,
} from "../../types";
import { emitEvent } from "../api/eventUtils";
import { EventType } from "../../types/common";
import { handleStorageError } from "./errorStore";

/**
 * Enhanced user settings store state and actions
 */
interface UserSettingsStoreState extends UserSettingsState {
  // Actions - Favorites
  toggleFavorite: (channelId: string) => void;
  addFavorite: (channelId: string) => void;
  removeFavorite: (channelId: string) => void;
  getFavorites: () => string[];
  isFavorite: (channelId: string) => boolean;

  // Actions - Muted Channels
  toggleMuted: (channelId: string) => void;
  muteChannel: (channelId: string, expirationTime?: number) => void;
  unmuteChannel: (channelId: string) => void;
  getMutedChannels: () => string[];
  isChannelMuted: (channelId: string) => boolean;

  // Actions - Appearance
  setTheme: (theme: ThemeOption) => void;
  setAppearanceSetting: <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K],
  ) => void;
  getAppearanceSettings: () => AppearanceSettings;

  // Actions - Notifications
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

  // Actions - Privacy
  setPrivacySetting: <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K],
  ) => void;
  getPrivacySettings: () => PrivacySettings;

  // Actions - Advanced
  setAdvancedSetting: <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K],
  ) => void;
  getAdvancedSettings: () => AdvancedSettings;

  // Actions - Language
  setLanguage: (langCode: string) => void;
  getLanguage: () => string;

  // Reset actions
  resetAppearanceSettings: () => void;
  resetNotificationSettings: () => void;
  resetPrivacySettings: () => void;
  resetAdvancedSettings: () => void;
  resetAllSettings: () => void;
  reset: () => void;
}

/**
 * Default notification settings
 */
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  desktop: "all",
  mobile: "all",
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
 * Type for persisted state
 */
interface PersistedState {
  favorites: string[];
  mutedChannels: string[];
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
  language: string;
  lastUpdated: number;
}

/**
 * Configuration for persistence
 */
const persistConfig: PersistOptions<UserSettingsStoreState, PersistedState> = {
  name: "mattermost-user-settings",
  partialize: (state) => {
    // Only persist these specific pieces of state
    return {
      favorites: Array.from(state.favorites),
      mutedChannels: Array.from(state.mutedChannels),
      notifications: state.notifications,
      appearance: state.appearance,
      privacy: state.privacy,
      advanced: state.advanced,
      language: state.appearance.language || "en",
      lastUpdated: state.lastUpdated,
    } as PersistedState;
  },
  merge: (persistedState, currentState) => {
    try {
      // Ensure persisted state is properly typed
      const typedState = persistedState as PersistedState;

      return {
        ...currentState,
        favorites: new Set(typedState.favorites || []),
        mutedChannels: new Set(typedState.mutedChannels || []),
        notifications:
          typedState.notifications || DEFAULT_NOTIFICATION_SETTINGS,
        appearance: typedState.appearance || DEFAULT_APPEARANCE_SETTINGS,
        privacy: typedState.privacy || DEFAULT_PRIVACY_SETTINGS,
        advanced: typedState.advanced || DEFAULT_ADVANCED_SETTINGS,
        lastUpdated: typedState.lastUpdated || Date.now(),
      };
    } catch (error) {
      // Handle persistence errors gracefully
      handleStorageError(error as Error, "Error merging persisted settings", {
        persistedState,
      });

      // Return current state as fallback
      return currentState;
    }
  },
  onRehydrateStorage: () => (state) => {
    if (!state) {
      console.warn("Failed to rehydrate user settings");
    }
  },
};

/**
 * User settings store for managing preferences
 * Uses persist middleware for localStorage persistence
 * Uses immer middleware for simplified state updates
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
       * @param channelId Channel ID
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
        const isFavorite = !get().favorites.has(channelId);
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.FAVORITES,
          channelId,
          value: isFavorite,
        });
      },

      /**
       * Adds a channel to favorites
       * @param channelId Channel ID
       */
      addFavorite: (channelId: string) => {
        if (get().favorites.has(channelId)) {
          return; // Already a favorite
        }

        set((state) => {
          state.favorites.add(channelId);
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.FAVORITES,
          channelId,
          value: true,
        });
      },

      /**
       * Removes a channel from favorites
       * @param channelId Channel ID
       */
      removeFavorite: (channelId: string) => {
        if (!get().favorites.has(channelId)) {
          return; // Not a favorite
        }

        set((state) => {
          state.favorites.delete(channelId);
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.FAVORITES,
          channelId,
          value: false,
        });
      },

      /**
       * Gets all favorite channel IDs
       * @returns Array of favorite channel IDs
       */
      getFavorites: () => {
        return Array.from(get().favorites);
      },

      /**
       * Checks if a channel is a favorite
       * @param channelId Channel ID
       * @returns Whether channel is a favorite
       */
      isFavorite: (channelId: string) => {
        return get().favorites.has(channelId);
      },

      // ===== Muted Channels Actions =====

      /**
       * Toggles muted status of a channel
       * @param channelId Channel ID
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
        const isMuted = !get().mutedChannels.has(channelId);
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.MUTED_CHANNELS,
          channelId,
          value: isMuted,
        });
      },

      /**
       * Mutes a channel
       * @param channelId Channel ID
       * @param expirationTime Optional timestamp when mute should expire
       */
      muteChannel: (channelId: string, expirationTime?: number) => {
        if (get().mutedChannels.has(channelId)) {
          return; // Already muted
        }

        set((state) => {
          state.mutedChannels.add(channelId);
          state.lastUpdated = Date.now();

          // TODO: Implement expiration handling when needed
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.MUTED_CHANNELS,
          channelId,
          value: true,
          expirationTime,
        });
      },

      /**
       * Unmutes a channel
       * @param channelId Channel ID
       */
      unmuteChannel: (channelId: string) => {
        if (!get().mutedChannels.has(channelId)) {
          return; // Not muted
        }

        set((state) => {
          state.mutedChannels.delete(channelId);
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.MUTED_CHANNELS,
          channelId,
          value: false,
        });
      },

      /**
       * Gets all muted channel IDs
       * @returns Array of muted channel IDs
       */
      getMutedChannels: () => {
        return Array.from(get().mutedChannels);
      },

      /**
       * Checks if a channel is muted
       * @param channelId Channel ID
       * @returns Whether channel is muted
       */
      isChannelMuted: (channelId: string) => {
        return get().mutedChannels.has(channelId);
      },

      // ===== Appearance Actions =====

      /**
       * Sets the theme
       * @param theme Theme option
       */
      setTheme: (theme: ThemeOption) => {
        set((state) => {
          state.appearance.theme = theme;
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.THEME,
          value: theme,
        });
      },

      /**
       * Sets a specific appearance setting
       * @param key Setting key
       * @param value Setting value
       */
      setAppearanceSetting: <K extends keyof AppearanceSettings>(
        key: K,
        value: AppearanceSettings[K],
      ) => {
        set((state) => {
          state.appearance[key] = value;
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.APPEARANCE,
          key,
          value,
        });
      },

      /**
       * Gets all appearance settings
       * @returns Current appearance settings
       */
      getAppearanceSettings: () => {
        return { ...get().appearance };
      },

      // ===== Notification Actions =====

      /**
       * Sets a notification setting
       * @param key Setting key
       * @param value Setting value
       */
      setNotificationSetting: <K extends keyof NotificationSettings>(
        key: K,
        value: NotificationSettings[K],
      ) => {
        set((state) => {
          // Special handling for channelOverrides
          if (key === "channelOverrides") {
            state.notifications.channelOverrides =
              value as NotificationSettings["channelOverrides"];
          } else {
            state.notifications[key] = value;
          }

          state.lastUpdated = Date.now();
        });

        // Emit settings changed event (except for complex channelOverrides)
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
       * @param channelId Channel ID
       * @param setting Setting type (desktop, mobile, email)
       * @param level Notification level
       */
      setChannelNotificationOverride: (
        channelId: string,
        setting: "desktop" | "mobile" | "email",
        level: NotificationLevel,
      ) => {
        set((state) => {
          const currentOverrides = state.notifications.channelOverrides || {};
          const channelOverride = currentOverrides[channelId] || {};

          // Update the override
          state.notifications.channelOverrides = {
            ...currentOverrides,
            [channelId]: {
              ...channelOverride,
              [setting]: level,
            },
          };

          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.NOTIFICATIONS,
          channelId,
          key: setting,
          value: level,
        });
      },

      /**
       * Gets all notification settings
       * @returns Current notification settings
       */
      getNotificationSettings: () => {
        return { ...get().notifications };
      },

      /**
       * Gets notification override for a channel
       * @param channelId Channel ID
       * @param setting Setting type (desktop, mobile, email)
       * @returns Override level or undefined
       */
      getChannelNotificationOverride: (
        channelId: string,
        setting: "desktop" | "mobile" | "email",
      ) => {
        const channelOverrides = get().notifications.channelOverrides || {};
        const channelOverride = channelOverrides[channelId];

        return channelOverride ? channelOverride[setting] : undefined;
      },

      // ===== Privacy Actions =====

      /**
       * Sets a privacy setting
       * @param key Setting key
       * @param value Setting value
       */
      setPrivacySetting: <K extends keyof PrivacySettings>(
        key: K,
        value: PrivacySettings[K],
      ) => {
        set((state) => {
          state.privacy[key] = value;
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.PRIVACY,
          key,
          value,
        });
      },

      /**
       * Gets all privacy settings
       * @returns Current privacy settings
       */
      getPrivacySettings: () => {
        return { ...get().privacy };
      },

      // ===== Advanced Settings Actions =====

      /**
       * Sets an advanced setting
       * @param key Setting key
       * @param value Setting value
       */
      setAdvancedSetting: <K extends keyof AdvancedSettings>(
        key: K,
        value: AdvancedSettings[K],
      ) => {
        set((state) => {
          state.advanced[key] = value;
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.ADVANCED,
          key,
          value,
        });
      },

      /**
       * Gets all advanced settings
       * @returns Current advanced settings
       */
      getAdvancedSettings: () => {
        return { ...get().advanced };
      },

      // ===== Language Setting ======

      /**
       * Sets the application language
       * @param langCode Language code (e.g., 'en', 'fr')
       */
      setLanguage: (langCode: string) => {
        set((state) => {
          state.appearance.language = langCode;
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.APPEARANCE,
          key: "language",
          value: langCode,
        });
      },

      /**
       * Gets the current language setting
       * @returns Language code
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
          state.appearance = { ...DEFAULT_APPEARANCE_SETTINGS };
          state.lastUpdated = Date.now();
        });

        // Emit settings changed event
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

        // Emit settings changed event
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

        // Emit settings changed event
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

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          setting: PreferenceKey.ADVANCED,
          reset: true,
        });
      },

      /**
       * Resets all settings to defaults but keeps favorites/muted
       */
      resetAllSettings: () => {
        set((state) => {
          state.notifications = { ...DEFAULT_NOTIFICATION_SETTINGS };
          state.appearance = { ...DEFAULT_APPEARANCE_SETTINGS };
          state.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
          state.advanced = { ...DEFAULT_ADVANCED_SETTINGS };
          state.lastUpdated = Date.now();
          // Note: Doesn't reset favorites or muted channels
        });

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, {
          reset: true,
          preservePreferences: true,
        });
      },

      /**
       * Resets the store to initial state
       */
      reset: () => {
        set(() => ({
          favorites: new Set<string>(),
          mutedChannels: new Set<string>(),
          notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
          appearance: { ...DEFAULT_APPEARANCE_SETTINGS },
          privacy: { ...DEFAULT_PRIVACY_SETTINGS },
          advanced: { ...DEFAULT_ADVANCED_SETTINGS },
          lastUpdated: Date.now(),
        }));

        // Emit settings changed event
        emitEvent(EventType.SETTINGS_CHANGED, { reset: true });
      },
    })),
    persistConfig,
  ),
);

// Helper functions for commonly used settings

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
 * Converts user preferences to server format
 * @returns Array of preference objects ready for API
 */
export function getPreferencesForApi(): Array<{
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
      user_id: "me", // Will be replaced with actual user ID by API
      category: PreferenceCategory.FAVORITE_CHANNEL,
      name: channelId,
      value: "true",
    });
  });

  // Add theme preference
  preferences.push({
    user_id: "me",
    category: PreferenceCategory.THEME,
    name: "name",
    value: state.appearance.theme,
  });

  // Add display settings
  Object.entries(state.appearance).forEach(([key, value]) => {
    // Skip language as it's handled separately
    if (key !== "language") {
      preferences.push({
        user_id: "me",
        category: PreferenceCategory.DISPLAY_SETTINGS,
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

  // Add notification settings
  Object.entries(state.notifications).forEach(([key, value]) => {
    // Handle channel overrides separately
    if (key !== "channelOverrides") {
      preferences.push({
        user_id: "me",
        category: PreferenceCategory.NOTIFICATIONS,
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
        user_id: "me",
        category: "channel_notifications",
        name: `${channelId}_${setting}`,
        value: level,
      });
    });
  });

  return preferences;
}
