import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Client4 } from '../../api/client';
import type { ServerError, PreferenceType } from '../../api/types';

// Preferences state
export interface PreferencesState {
  preferences: PreferenceType[];
  isLoading: boolean;
  isUpdating: boolean;
  lastSynced: number | null;
}

// Load preferences from localStorage
const loadStoredPreferences = (): Partial<PreferencesState> => {
  try {
    const stored = localStorage.getItem('mattermostPreferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        preferences: parsed.preferences || [],
        lastSynced: parsed.lastSynced,
      };
    }
  } catch (error) {
    console.warn('Failed to load stored preferences:', error);
  }
  return { preferences: [] };
};

// Store preferences in localStorage
const storePreferences = (state: PreferencesState) => {
  try {
    localStorage.setItem('mattermostPreferences', JSON.stringify({
      preferences: state.preferences,
      lastSynced: state.lastSynced,
    }));
  } catch (error) {
    console.warn('Failed to store preferences:', error);
  }
};

const initialState: PreferencesState = {
  preferences: [],
  isLoading: false,
  isUpdating: false,
  lastSynced: null,
  ...loadStoredPreferences(),
};

// Helper functions to get/set preferences
export const getPreference = (
  preferences: PreferenceType[],
  category: string,
  name: string,
  defaultValue: string = ''
): string => {
  const pref = preferences.find(p => p.category === category && p.name === name);
  return pref?.value || defaultValue;
};

export const setPreference = (
  preferences: PreferenceType[],
  userId: string,
  category: string,
  name: string,
  value: string
): PreferenceType[] => {
  const existingIndex = preferences.findIndex(
    p => p.category === category && p.name === name
  );
  
  const newPreference: PreferenceType = {
    user_id: userId,
    category,
    name,
    value,
  };
  
  if (existingIndex >= 0) {
    const updated = [...preferences];
    updated[existingIndex] = newPreference;
    return updated;
  } else {
    return [...preferences, newPreference];
  }
};

// Async thunks
export const loadPreferences = createAsyncThunk<
  PreferenceType[],
  string, // userId
  { rejectValue: ServerError }
>(
  'preferences/load',
  async (userId, { rejectWithValue }) => {
    try {
      return await Client4.getUserPreferences(userId);
    } catch (error) {
      console.warn('Failed to load preferences from server:', error);
      return rejectWithValue(error as ServerError);
    }
  }
);

export const savePreferences = createAsyncThunk<
  void,
  { userId: string; preferences: PreferenceType[] },
  { rejectValue: ServerError }
>(
  'preferences/save',
  async ({ userId, preferences }, { rejectWithValue }) => {
    try {
      await Client4.savePreferences(userId, preferences);
    } catch (error) {
      console.warn('Failed to save preferences to server:', error);
      return rejectWithValue(error as ServerError);
    }
  }
);

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    // Generic preference setter
    updatePreference: (
      state,
      action: PayloadAction<{
        userId: string;
        category: string;
        name: string;
        value: string;
      }>
    ) => {
      const { userId, category, name, value } = action.payload;
      state.preferences = setPreference(state.preferences, userId, category, name, value);
      storePreferences(state);
    },
    
    // Batch preference update
    updatePreferences: (
      state,
      action: PayloadAction<{
        userId: string;
        updates: Array<{ category: string; name: string; value: string }>;
      }>
    ) => {
      const { userId, updates } = action.payload;
      
      updates.forEach(({ category, name, value }) => {
        state.preferences = setPreference(state.preferences, userId, category, name, value);
      });
      
      storePreferences(state);
    },
    
    // Theme shortcuts (display_settings category)
    setTheme: (
      state,
      action: PayloadAction<{ userId: string; theme: 'light' | 'dark' | 'auto' }>
    ) => {
      const { userId, theme } = action.payload;
      state.preferences = setPreference(
        state.preferences,
        userId,
        'display_settings',
        'theme',
        theme
      );
      storePreferences(state);
    },
    
    setLanguage: (
      state,
      action: PayloadAction<{ userId: string; language: string }>
    ) => {
      const { userId, language } = action.payload;
      state.preferences = setPreference(
        state.preferences,
        userId,
        'display_settings',
        'language',
        language
      );
      storePreferences(state);
    },
    
    // Notification shortcuts (notifications category)
    setDesktopNotifications: (
      state,
      action: PayloadAction<{ userId: string; enabled: boolean }>
    ) => {
      const { userId, enabled } = action.payload;
      state.preferences = setPreference(
        state.preferences,
        userId,
        'notifications',
        'desktop',
        enabled.toString()
      );
      storePreferences(state);
    },
    
    setSoundNotifications: (
      state,
      action: PayloadAction<{ userId: string; enabled: boolean }>
    ) => {
      const { userId, enabled } = action.payload;
      state.preferences = setPreference(
        state.preferences,
        userId,
        'notifications',
        'sound',
        enabled.toString()
      );
      storePreferences(state);
    },
    
    setEmailNotifications: (
      state,
      action: PayloadAction<{ userId: string; frequency: 'never' | 'immediate' | 'hourly' }>
    ) => {
      const { userId, frequency } = action.payload;
      state.preferences = setPreference(
        state.preferences,
        userId,
        'notifications',
        'email',
        frequency
      );
      storePreferences(state);
    },
    
    setMentionKeys: (
      state,
      action: PayloadAction<{ userId: string; keys: string[] }>
    ) => {
      const { userId, keys } = action.payload;
      state.preferences = setPreference(
        state.preferences,
        userId,
        'notifications',
        'mention_keys',
        keys.join(',')
      );
      storePreferences(state);
    },
    
    // Bulk replace all preferences (from server)
    replaceAllPreferences: (
      state,
      action: PayloadAction<PreferenceType[]>
    ) => {
      state.preferences = action.payload;
      storePreferences(state);
    },
    
    // Clear all preferences
    clearAllPreferences: (state) => {
      state.preferences = [];
      state.lastSynced = null;
      localStorage.removeItem('mattermostPreferences');
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Load preferences
      .addCase(loadPreferences.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.preferences = action.payload;
        state.lastSynced = Date.now();
        storePreferences(state);
      })
      .addCase(loadPreferences.rejected, (state) => {
        state.isLoading = false;
      })
      
      // Save preferences
      .addCase(savePreferences.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(savePreferences.fulfilled, (state) => {
        state.isUpdating = false;
        state.lastSynced = Date.now();
        storePreferences(state);
      })
      .addCase(savePreferences.rejected, (state) => {
        state.isUpdating = false;
      });
  },
});

export const {
  updatePreference,
  updatePreferences,
  setTheme,
  setLanguage,
  setDesktopNotifications,
  setSoundNotifications,
  setEmailNotifications,
  setMentionKeys,
  replaceAllPreferences,
  clearAllPreferences,
} = preferencesSlice.actions;

export default preferencesSlice.reducer;