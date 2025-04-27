// src/core/store/userSettingsStore.ts
import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

interface NotificationSettings {
  desktop: "all" | "mentions" | "none";
  mobile: "all" | "mentions" | "none";
  email: "all" | "mentions" | "none";
  sound: boolean;
  channelOverrides: Record<
    string,
    {
      desktop?: "all" | "mentions" | "none";
      mobile?: "all" | "mentions" | "none";
    }
  >;
}

// État du store
interface UserSettingsState {
  favorites: Set<string>;
  mutedChannels: Set<string>;
  theme: string;
  notificationSettings: NotificationSettings;
}

// Actions du store
interface UserSettingsActions {
  toggleFavorite: (channelId: string) => void;
  toggleMuted: (channelId: string) => void;
  setTheme: (theme: string) => void;
  setNotificationSetting: (key: keyof NotificationSettings, value: any) => void;
  setChannelNotificationOverride: (
    channelId: string,
    setting: string,
    value: any,
  ) => void;
  isFavorite: (channelId: string) => boolean;
  isMuted: (channelId: string) => boolean;
  reset: () => void;
}

// Type complet du store
type UserSettingsStore = UserSettingsState & UserSettingsActions;

// Type pour les données persistées
interface PersistedState {
  favorites: string[];
  mutedChannels: string[];
  theme: string;
  notificationSettings: NotificationSettings;
}

// Configuration de la persistance
const persistConfig: PersistOptions<UserSettingsStore, PersistedState> = {
  name: "mattermost-user-settings",
  partialize: (state) => ({
    favorites: Array.from(state.favorites),
    mutedChannels: Array.from(state.mutedChannels),
    theme: state.theme,
    notificationSettings: state.notificationSettings,
  }),
  merge: (persistedState, currentState) => {
    // Assurons-nous que persistedState est bien typé
    const typedState = persistedState as PersistedState;

    return {
      ...currentState,
      favorites: new Set(typedState.favorites || []),
      mutedChannels: new Set(typedState.mutedChannels || []),
      theme: typedState.theme || currentState.theme,
      notificationSettings:
        typedState.notificationSettings || currentState.notificationSettings,
    };
  },
};

export const useUserSettingsStore = create<UserSettingsStore>()(
  persist(
    (set, get) => ({
      // État initial
      favorites: new Set<string>(),
      mutedChannels: new Set<string>(),
      theme: "default",
      notificationSettings: {
        desktop: "all",
        mobile: "all",
        email: "mentions",
        sound: true,
        channelOverrides: {},
      },

      // Actions
      toggleFavorite: (channelId: string) => {
        set((state) => {
          const newFavorites = new Set(state.favorites);
          if (newFavorites.has(channelId)) {
            newFavorites.delete(channelId);
          } else {
            newFavorites.add(channelId);
          }
          return { favorites: newFavorites };
        });
      },

      toggleMuted: (channelId: string) => {
        set((state) => {
          const newMuted = new Set(state.mutedChannels);
          if (newMuted.has(channelId)) {
            newMuted.delete(channelId);
          } else {
            newMuted.add(channelId);
          }
          return { mutedChannels: newMuted };
        });
      },

      setTheme: (theme: string) => {
        set({ theme });
      },

      setNotificationSetting: (key: keyof NotificationSettings, value: any) => {
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            [key]: value,
          },
        }));
      },

      setChannelNotificationOverride: (
        channelId: string,
        setting: string,
        value: any,
      ) => {
        set((state) => {
          const currentOverrides =
            state.notificationSettings.channelOverrides[channelId] || {};
          return {
            notificationSettings: {
              ...state.notificationSettings,
              channelOverrides: {
                ...state.notificationSettings.channelOverrides,
                [channelId]: {
                  ...currentOverrides,
                  [setting]: value,
                },
              },
            },
          };
        });
      },

      isFavorite: (channelId: string) => {
        return get().favorites.has(channelId);
      },

      isMuted: (channelId: string) => {
        return get().mutedChannels.has(channelId);
      },

      reset: () => {
        set({
          favorites: new Set<string>(),
          mutedChannels: new Set<string>(),
          theme: "default",
          notificationSettings: {
            desktop: "all",
            mobile: "all",
            email: "mentions",
            sound: true,
            channelOverrides: {},
          },
        });
      },
    }),
    persistConfig,
  ),
);
