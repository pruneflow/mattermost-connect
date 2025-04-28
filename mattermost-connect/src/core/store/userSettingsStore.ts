// src/core/store/userSettingsStore.ts
/**
 * User Settings store
 * Manages user preferences and settings
 */
import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";
import {
  UserSettingsState,
  NotificationSettings,
  AppearanceSettings,
  PrivacySettings,
  ThemeOption,
  NotificationLevel,
  PreferenceKey,
  EventType,
} from "../../types";
import { emitEvent } from "./eventStore";

/**
 * Enhanced user settings state and actions
 */
interface UserSettingsStoreState extends UserSettingsState {
  // Actions - Favorites
  toggleFavorite: (channelId: string) => void;
  addFavorite: (channelId: string) => void;
  removeFavorite: (channelId: string) => void;

  // Actions - Muted Channels
  toggleMuted: (channelId: string) => void;
  muteChannel: (channelId: string) => void;
  unmuteChannel: (channelId: string) => void;

  // Actions - Appearance
  setTheme: (theme: ThemeOption) => void;
  setAppearanceSetting: <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K],
  ) => void;

  // Actions - Notifications
  setNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => void;
  setChannelNotificationOverride: (
    channelId: string,
    setting: "desktop" | "mobile",
    level: NotificationLevel,
  ) => void;

  // Actions - Privacy
  setPrivacySetting: <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K],
  ) => void;

  // Selectors
  isFavorite: (channelId: string) => boolean;
  isMuted: (channelId: string) => boolean;
  getChannelNotificationOverride: (
    channelId: string,
    setting: "desktop" | "mobile",
  ) => NotificationLevel | undefined;

  // Reset
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
};

/**
 * Default privacy settings
 */
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  showStatus: true,
  showTypingIndicator: true,
  showReadStatus: true,
  autoDownloadAttachments: true,
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
  lastUpdated: number;
}

/**
 * Configuration for persistence
 */
const persistConfig: PersistOptions<UserSettingsStoreState, PersistedState> = {
  name: "mattermost-user-settings",
  partialize: (state) => ({
    favorites: Array.from(state.favorites),
    mutedChannels: Array.from(state.mutedChannels),
    notifications: state.notifications,
    appearance: state.appearance,
    privacy: state.privacy,
    lastUpdated: state.lastUpdated,
  }),
  merge: (persistedState, currentState) => {
    // Ensure persisted state is properly typed
    const typedState = persistedState as PersistedState;

    return {
      ...currentState,
      favorites: new Set(typedState.favorites || []),
      mutedChannels: new Set(typedState.mutedChannels || []),
      notifications: typedState.notifications || DEFAULT_NOTIFICATION_SETTINGS,
      appearance: typedState.appearance || DEFAULT_APPEARANCE_SETTINGS,
      privacy: typedState.privacy || DEFAULT_PRIVACY_SETTINGS,
      lastUpdated: typedState.lastUpdated || Date.now(),
    };
  },
};

/**
 * User settings store for managing preferences
 */
export const useUserSettingsStore = create<UserSettingsStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      favorites: new Set<string>(),
      mutedChannels: new Set<string>(),
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
      appearance: DEFAULT_APPEARANCE_SETTINGS,
      privacy: DEFAULT_PRIVACY_SETTINGS,
      lastUpdated: Date.now(),

      // ===== Favorites Actions =====

      /**
       * Toggles favorite status of a channel
       * @param channelId Channel ID
       */
      toggleFavorite: (channelId: string) => {
        set((state) => {
          const newFavorites = new Set(state.favorites);

          if (newFavorites.has(channelId)) {
            newFavorites.delete(channelId);
          } else {
            newFavorites.add(channelId);
          }

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.FAVORITES,
            channelId,
            value: !state.favorites.has(channelId),
          });

          return {
            favorites: newFavorites,
            lastUpdated: Date.now(),
          };
        });
      },

      /**
       * Adds a channel to favorites
       * @param channelId Channel ID
       */
      addFavorite: (channelId: string) => {
        set((state) => {
          if (state.favorites.has(channelId)) {
            return state;
          }

          const newFavorites = new Set(state.favorites);
          newFavorites.add(channelId);

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.FAVORITES,
            channelId,
            value: true,
          });

          return {
            favorites: newFavorites,
            lastUpdated: Date.now(),
          };
        });
      },

      /**
       * Removes a channel from favorites
       * @param channelId Channel ID
       */
      removeFavorite: (channelId: string) => {
        set((state) => {
          if (!state.favorites.has(channelId)) {
            return state;
          }

          const newFavorites = new Set(state.favorites);
          newFavorites.delete(channelId);

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.FAVORITES,
            channelId,
            value: false,
          });

          return {
            favorites: newFavorites,
            lastUpdated: Date.now(),
          };
        });
      },

      // ===== Muted Channels Actions =====

      /**
       * Toggles muted status of a channel
       * @param channelId Channel ID
       */
      toggleMuted: (channelId: string) => {
        set((state) => {
          const newMuted = new Set(state.mutedChannels);

          if (newMuted.has(channelId)) {
            newMuted.delete(channelId);
          } else {
            newMuted.add(channelId);
          }

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.MUTED_CHANNELS,
            channelId,
            value: !state.mutedChannels.has(channelId),
          });

          return {
            mutedChannels: newMuted,
            lastUpdated: Date.now(),
          };
        });
      },

      /**
       * Mutes a channel
       * @param channelId Channel ID
       */
      muteChannel: (channelId: string) => {
        set((state) => {
          if (state.mutedChannels.has(channelId)) {
            return state;
          }

          const newMuted = new Set(state.mutedChannels);
          newMuted.add(channelId);

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.MUTED_CHANNELS,
            channelId,
            value: true,
          });

          return {
            mutedChannels: newMuted,
            lastUpdated: Date.now(),
          };
        });
      },

      /**
       * Unmutes a channel
       * @param channelId Channel ID
       */
      unmuteChannel: (channelId: string) => {
        set((state) => {
          if (!state.mutedChannels.has(channelId)) {
            return state;
          }

          const newMuted = new Set(state.mutedChannels);
          newMuted.delete(channelId);

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.MUTED_CHANNELS,
            channelId,
            value: false,
          });

          return {
            mutedChannels: newMuted,
            lastUpdated: Date.now(),
          };
        });
      },

      // ===== Appearance Actions =====

      /**
       * Sets the theme
       * @param theme Theme option
       */
      setTheme: (theme: ThemeOption) => {
        set((state) => {
          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.THEME,
            value: theme,
          });

          return {
            appearance: {
              ...state.appearance,
              theme,
            },
            lastUpdated: Date.now(),
          };
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
          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.APPEARANCE,
            key,
            value,
          });

          return {
            appearance: {
              ...state.appearance,
              [key]: value,
            },
            lastUpdated: Date.now(),
          };
        });
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
            return {
              notifications: {
                ...state.notifications,
                channelOverrides:
                  value as NotificationSettings["channelOverrides"],
              },
              lastUpdated: Date.now(),
            };
          }

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.NOTIFICATIONS,
            key,
            value,
          });

          return {
            notifications: {
              ...state.notifications,
              [key]: value,
            },
            lastUpdated: Date.now(),
          };
        });
      },

      /**
       * Sets notification override for a specific channel
       * @param channelId Channel ID
       * @param setting Setting type (desktop or mobile)
       * @param level Notification level
       */
      setChannelNotificationOverride: (
        channelId: string,
        setting: "desktop" | "mobile",
        level: NotificationLevel,
      ) => {
        set((state) => {
          const currentOverrides = state.notifications.channelOverrides || {};
          const channelOverride = currentOverrides[channelId] || {};

          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.NOTIFICATIONS,
            channelId,
            key: setting,
            value: level,
          });

          return {
            notifications: {
              ...state.notifications,
              channelOverrides: {
                ...currentOverrides,
                [channelId]: {
                  ...channelOverride,
                  [setting]: level,
                },
              },
            },
            lastUpdated: Date.now(),
          };
        });
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
          // Emit settings changed event
          emitEvent(EventType.SETTINGS_CHANGED, {
            setting: PreferenceKey.PRIVACY,
            key,
            value,
          });

          return {
            privacy: {
              ...state.privacy,
              [key]: value,
            },
            lastUpdated: Date.now(),
          };
        });
      },

      // ===== Selectors =====

      /**
       * Checks if a channel is a favorite
       * @param channelId Channel ID
       * @returns Whether channel is a favorite
       */
      isFavorite: (channelId: string) => {
        return get().favorites.has(channelId);
      },

      /**
       * Checks if a channel is muted
       * @param channelId Channel ID
       * @returns Whether channel is muted
       */
      isMuted: (channelId: string) => {
        return get().mutedChannels.has(channelId);
      },

      /**
       * Gets notification override for a channel
       * @param channelId Channel ID
       * @param setting Setting type (desktop or mobile)
       * @returns Override level or undefined
       */
      getChannelNotificationOverride: (
        channelId: string,
        setting: "desktop" | "mobile",
      ) => {
        const channelOverrides = get().notifications.channelOverrides || {};
        const channelOverride = channelOverrides[channelId];

        return channelOverride ? channelOverride[setting] : undefined;
      },

      /**
       * Resets the store to default values
       */
      reset: () => {
        set({
          favorites: new Set<string>(),
          mutedChannels: new Set<string>(),
          notifications: DEFAULT_NOTIFICATION_SETTINGS,
          appearance: DEFAULT_APPEARANCE_SETTINGS,
          privacy: DEFAULT_PRIVACY_SETTINGS,
          lastUpdated: Date.now(),
        });
      },
    }),
    persistConfig,
  ),
);
