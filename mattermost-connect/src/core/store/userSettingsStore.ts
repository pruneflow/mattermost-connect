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
  ErrorSeverity,
  UserSettingsStore,
} from "../../types";
import { handleError } from "./errorStore";
import { emitEvent } from "../api/eventUtils";
import { createCommonSlice } from "./slices/commonSlice";

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
 * Creates and exports the userSettingsStore using Zustand
 * Optimized with immer for immutability and persist for localStorage persistence
 */
export const useUserSettingsStore = create<
  UserSettingsState & UserSettingsStore
>()(
  persist(
    immer((set, get) => {
      // Create common slice for standardized state management
      const commonSlice = createCommonSlice<UserSettingsState>(set);

      return {
        // Include common slice for standardized loading/error state
        ...commonSlice,

        // Initial state
        favorites: new Set<string>(),
        mutedChannels: new Set<string>(),
        notifications: DEFAULT_NOTIFICATION_SETTINGS,
        appearance: DEFAULT_APPEARANCE_SETTINGS,
        privacy: DEFAULT_PRIVACY_SETTINGS,
        advanced: DEFAULT_ADVANCED_SETTINGS,

        // ===== Favorites Actions =====

        /**
         * Toggles favorite status of a channel
         */
        toggleFavorite: (channelId: string) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "toggleFavorite",
              channelId,
            });
          }
        },

        /**
         * Adds a channel to favorites
         */
        addFavorite: (channelId: string) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "addFavorite",
              channelId,
            });
          }
        },

        /**
         * Removes a channel from favorites
         */
        removeFavorite: (channelId: string) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "removeFavorite",
              channelId,
            });
          }
        },

        /**
         * Gets all favorite channel IDs
         */
        getFavorites: () => {
          try {
            return Array.from(get().favorites);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getFavorites",
            });
            return [];
          }
        },

        /**
         * Checks if a channel is a favorite
         */
        isFavorite: (channelId: string) => {
          try {
            return get().favorites.has(channelId);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "isFavorite",
              channelId,
            });
            return false;
          }
        },

        // ===== Muted Channels Actions =====

        /**
         * Toggles muted status of a channel
         */
        toggleMuted: (channelId: string) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "toggleMuted",
              channelId,
            });
          }
        },

        /**
         * Mutes a channel
         */
        muteChannel: (channelId: string, expirationTime?: number) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "muteChannel",
              channelId,
              expirationTime,
            });
          }
        },

        /**
         * Unmutes a channel
         */
        unmuteChannel: (channelId: string) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "unmuteChannel",
              channelId,
            });
          }
        },

        /**
         * Gets all muted channel IDs
         */
        getMutedChannels: () => {
          try {
            return Array.from(get().mutedChannels);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getMutedChannels",
            });
            return [];
          }
        },

        /**
         * Checks if a channel is muted
         */
        isChannelMuted: (channelId: string) => {
          try {
            return get().mutedChannels.has(channelId);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "isChannelMuted",
              channelId,
            });
            return false;
          }
        },

        // ===== Appearance Actions =====

        /**
         * Sets the application theme
         */
        setTheme: (theme: ThemeOption) => {
          try {
            set((state) => {
              state.appearance.theme = theme;
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.THEME,
              value: theme,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setTheme",
              theme,
            });
          }
        },

        /**
         * Sets a specific appearance setting
         */
        setAppearanceSetting: <K extends keyof AppearanceSettings>(
          key: K,
          value: AppearanceSettings[K],
        ) => {
          try {
            set((state) => {
              state.appearance[key] = value;
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.APPEARANCE,
              key,
              value,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setAppearanceSetting",
              key: String(key),
              value,
            });
          }
        },

        /**
         * Gets all appearance settings
         */
        getAppearanceSettings: () => {
          try {
            return { ...get().appearance };
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getAppearanceSettings",
            });
            return { ...DEFAULT_APPEARANCE_SETTINGS };
          }
        },

        // ===== Notification Actions =====

        /**
         * Sets a notification setting
         */
        setNotificationSetting: <K extends keyof NotificationSettings>(
          key: K,
          value: NotificationSettings[K],
        ) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setNotificationSetting",
              key: String(key),
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
          try {
            set((state) => {
              const currentOverrides =
                state.notifications.channelOverrides || {};
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setChannelNotificationOverride",
              channelId,
              setting,
              level,
            });
          }
        },

        /**
         * Gets all notification settings
         */
        getNotificationSettings: () => {
          try {
            return { ...get().notifications };
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getNotificationSettings",
            });
            return { ...DEFAULT_NOTIFICATION_SETTINGS };
          }
        },

        /**
         * Gets notification override for a channel
         */
        getChannelNotificationOverride: (
          channelId: string,
          setting: "desktop" | "mobile" | "email",
        ) => {
          try {
            const { notifications } = get();
            const channelOverrides = notifications.channelOverrides || {};
            const channelOverride = channelOverrides[channelId];

            return channelOverride ? channelOverride[setting] : undefined;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getChannelNotificationOverride",
              channelId,
              setting,
            });
            return undefined;
          }
        },

        // ===== Privacy Actions =====

        /**
         * Sets a privacy setting
         */
        setPrivacySetting: <K extends keyof PrivacySettings>(
          key: K,
          value: PrivacySettings[K],
        ) => {
          try {
            set((state) => {
              state.privacy[key] = value;
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.PRIVACY,
              key,
              value,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setPrivacySetting",
              key: String(key),
              value,
            });
          }
        },

        /**
         * Gets all privacy settings
         */
        getPrivacySettings: () => {
          try {
            return { ...get().privacy };
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getPrivacySettings",
            });
            return { ...DEFAULT_PRIVACY_SETTINGS };
          }
        },

        // ===== Advanced Settings Actions =====

        /**
         * Sets an advanced setting
         */
        setAdvancedSetting: <K extends keyof AdvancedSettings>(
          key: K,
          value: AdvancedSettings[K],
        ) => {
          try {
            set((state) => {
              state.advanced[key] = value;
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.ADVANCED,
              key,
              value,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setAdvancedSetting",
              key: String(key),
              value,
            });
          }
        },

        /**
         * Gets all advanced settings
         */
        getAdvancedSettings: () => {
          try {
            return { ...get().advanced };
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getAdvancedSettings",
            });
            return { ...DEFAULT_ADVANCED_SETTINGS };
          }
        },

        // ===== Language Setting =====

        /**
         * Sets the application language
         */
        setLanguage: (langCode: string) => {
          try {
            set((state) => {
              state.appearance.language = langCode;
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.LANGUAGE,
              value: langCode,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "setLanguage",
              langCode,
            });
          }
        },

        /**
         * Gets the current language setting
         */
        getLanguage: () => {
          try {
            return get().appearance.language || "en";
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "getLanguage",
            });
            return "en";
          }
        },

        // ===== Reset Actions =====

        /**
         * Resets appearance settings to defaults
         */
        resetAppearanceSettings: () => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "resetAppearanceSettings",
            });
          }
        },

        /**
         * Resets notification settings to defaults
         */
        resetNotificationSettings: () => {
          try {
            set((state) => {
              state.notifications = { ...DEFAULT_NOTIFICATION_SETTINGS };
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.NOTIFICATIONS,
              reset: true,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "resetNotificationSettings",
            });
          }
        },

        /**
         * Resets privacy settings to defaults
         */
        resetPrivacySettings: () => {
          try {
            set((state) => {
              state.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.PRIVACY,
              reset: true,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "resetPrivacySettings",
            });
          }
        },

        /**
         * Resets advanced settings to defaults
         */
        resetAdvancedSettings: () => {
          try {
            set((state) => {
              state.advanced = { ...DEFAULT_ADVANCED_SETTINGS };
              state.lastUpdated = Date.now();
            });

            emitEvent(EventType.SETTINGS_CHANGED, {
              setting: PreferenceKey.ADVANCED,
              reset: true,
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "resetAdvancedSettings",
            });
          }
        },

        /**
         * Resets all settings to defaults
         * @param preservePreferences If true, keeps favorites and muted channels
         */
        resetAllSettings: (preservePreferences = false) => {
          try {
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
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "resetAllSettings",
              preservePreferences,
            });
          }
        },

        /**
         * Resets the store to initial state
         * Used primarily for logout
         */
        reset: () => {
          try {
            set((state) => {
              // Reset domain-specific state
              state.favorites = new Set<string>();
              state.mutedChannels = new Set<string>();
              state.notifications = { ...DEFAULT_NOTIFICATION_SETTINGS };
              state.appearance = { ...DEFAULT_APPEARANCE_SETTINGS };
              state.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
              state.advanced = { ...DEFAULT_ADVANCED_SETTINGS };

              // Reset common state
              state.isLoading = false;
              state.loadingIds = [];
              state.error = null;
              state.errors = [];
              state.errorsBySource = {
                [ErrorSource.API]: [],
                [ErrorSource.AUTH]: [],
                [ErrorSource.WEBSOCKET]: [],
                [ErrorSource.UI]: [],
                [ErrorSource.STORAGE]: [],
                [ErrorSource.UNKNOWN]: [],
              };
              state.errorsBySeverity = {
                [ErrorSeverity.INFO]: [],
                [ErrorSeverity.WARNING]: [],
                [ErrorSeverity.ERROR]: [],
                [ErrorSeverity.CRITICAL]: [],
              };
              state.lastUpdated = Date.now();
              state.lastFetchTimes = {};
              state.lastError = null;
              state.hasUnhandledError = false;
            });

            emitEvent(EventType.SETTINGS_CHANGED, { reset: true });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.STORAGE, undefined, {
              action: "reset",
            });
          }
        },
      };
    }),
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

// Type for persisted state to aid with type checking during rehydration
interface PersistedState {
  favorites: string[];
  mutedChannels: string[];
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
  lastUpdated: number;
}

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
