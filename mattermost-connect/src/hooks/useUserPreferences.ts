import { useEffect, useCallback } from 'react';
import { 
  loadPreferences, 
  savePreferences,
  setTheme,
  setLanguage,
  setDesktopNotifications,
  setSoundNotifications,
  setEmailNotifications,
  setMentionKeys,
  updatePreference,
  updatePreferences,
  getPreference,
  closeGroupChannelConversation,
  openGroupChannelConversation,
} from '../store/slices/preferencesSlice';
import type { PreferenceType } from '../api/types';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { selectCurrentUserId, selectPreferences } from '../store/selectors';
import type { RootState } from '../store';

const useUserPreferences = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);
  const preferences = useAppSelector(selectPreferences);
  const isLoading = useAppSelector((state: RootState) => state.preferences.isLoading);
  const isUpdating = useAppSelector((state: RootState) => state.preferences.isUpdating);
  const lastSynced = useAppSelector((state: RootState) => state.preferences.lastSynced);

  // Get current theme preference
  const currentTheme = getPreference(preferences, 'display_settings', 'theme', 'auto') as 'light' | 'dark' | 'auto';
  const currentLanguage = getPreference(preferences, 'display_settings', 'language', 'en');
  
  // Get notification preferences
  const desktopNotifications = getPreference(preferences, 'notifications', 'desktop', 'true') === 'true';
  const soundNotifications = getPreference(preferences, 'notifications', 'sound', 'true') === 'true';
  const emailFrequency = getPreference(preferences, 'notifications', 'email', 'immediate') as 'never' | 'immediate' | 'hourly';
  const mentionKeysString = getPreference(preferences, 'notifications', 'mention_keys', '');
  const mentionKeys = mentionKeysString ? mentionKeysString.split(',').filter((k: string) => k.trim()) : [];

  // Load preferences on mount
  useEffect(() => {
    if (currentUserId && preferences.length === 0) {
      dispatch(loadPreferences(currentUserId));
    }
  }, [dispatch, currentUserId, preferences.length]);


  // Save preferences with debouncing
  const savePreferencesToServer = useCallback(
    async (preferencesToSave: PreferenceType[]) => {
      if (!currentUserId) return;
      
      try {
        await dispatch(savePreferences({ 
          userId: currentUserId, 
          preferences: preferencesToSave 
        })).unwrap();
      } catch (error) {
        // Failed to save preferences
      }
    },
    [dispatch, currentUserId]
  );

  // Theme actions
  const updateTheme = useCallback(
    async (theme: 'light' | 'dark' | 'auto') => {
      if (!currentUserId) return;
      
      dispatch(setTheme({ userId: currentUserId, theme }));
      
      // Save immediately for theme changes (UX critical)
      const updatedPreferences = [
        ...preferences.filter(p => !(p.category === 'display_settings' && p.name === 'theme')),
        { user_id: currentUserId, category: 'display_settings', name: 'theme', value: theme }
      ];
      
      await savePreferencesToServer(updatedPreferences);
    },
    [currentUserId, dispatch, preferences, savePreferencesToServer]
  );

  const updateLanguage = useCallback(
    async (language: string) => {
      if (!currentUserId) return;
      
      dispatch(setLanguage({ userId: currentUserId, language }));
      
      const updatedPreferences = [
        ...preferences.filter(p => !(p.category === 'display_settings' && p.name === 'language')),
        { user_id: currentUserId, category: 'display_settings', name: 'language', value: language }
      ];
      
      await savePreferencesToServer(updatedPreferences);
    },
    [currentUserId, dispatch, preferences, savePreferencesToServer]
  );

  // Notification actions
  const updateDesktopNotifications = useCallback(
    async (enabled: boolean) => {
      if (!currentUserId) return;
      
      dispatch(setDesktopNotifications({ userId: currentUserId, enabled }));
      
      const updatedPreferences = [
        ...preferences.filter(p => !(p.category === 'notifications' && p.name === 'desktop')),
        { user_id: currentUserId, category: 'notifications', name: 'desktop', value: enabled.toString() }
      ];
      
      await savePreferencesToServer(updatedPreferences);
    },
    [currentUserId, dispatch, preferences, savePreferencesToServer]
  );

  const updateSoundNotifications = useCallback(
    async (enabled: boolean) => {
      if (!currentUserId) return;
      
      dispatch(setSoundNotifications({ userId: currentUserId, enabled }));
      
      const updatedPreferences = [
        ...preferences.filter(p => !(p.category === 'notifications' && p.name === 'sound')),
        { user_id: currentUserId, category: 'notifications', name: 'sound', value: enabled.toString() }
      ];
      
      await savePreferencesToServer(updatedPreferences);
    },
    [currentUserId, dispatch, preferences, savePreferencesToServer]
  );

  const updateEmailNotifications = useCallback(
    async (frequency: 'never' | 'immediate' | 'hourly') => {
      if (!currentUserId) return;
      
      dispatch(setEmailNotifications({ userId: currentUserId, frequency }));
      
      const updatedPreferences = [
        ...preferences.filter(p => !(p.category === 'notifications' && p.name === 'email')),
        { user_id: currentUserId, category: 'notifications', name: 'email', value: frequency }
      ];
      
      await savePreferencesToServer(updatedPreferences);
    },
    [currentUserId, dispatch, preferences, savePreferencesToServer]
  );

  const updateMentionKeys = useCallback(
    async (keys: string[]) => {
      if (!currentUserId) return;
      
      dispatch(setMentionKeys({ userId: currentUserId, keys }));
      
      const updatedPreferences = [
        ...preferences.filter(p => !(p.category === 'notifications' && p.name === 'mention_keys')),
        { user_id: currentUserId, category: 'notifications', name: 'mention_keys', value: keys.join(',') }
      ];
      
      await savePreferencesToServer(updatedPreferences);
    },
    [currentUserId, dispatch, preferences, savePreferencesToServer]
  );

  // Generic preference update
  const updatePreferenceValue = useCallback(
    async (category: string, name: string, value: string) => {
      if (!currentUserId) return;
      
      dispatch(updatePreference({ userId: currentUserId, category, name, value }));
      
      // Send only the single preference that was changed
      const singlePreference = [
        { user_id: currentUserId, category, name, value }
      ];
      
      await savePreferencesToServer(singlePreference);
    },
    [currentUserId, dispatch, savePreferencesToServer]
  );

  // Get preference value
  const getPreferenceValue = useCallback(
    (category: string, name: string, defaultValue: string = '') => {
      return getPreference(preferences, category, name, defaultValue);
    },
    [preferences]
  );

  // Group channel conversation actions
  const closeGroupConversation = useCallback(
    async (channelId: string) => {
      if (!currentUserId) return;
      
      try {
        await dispatch(closeGroupChannelConversation({ 
          channelId, 
          userId: currentUserId 
        })).unwrap();
      } catch (error) {
        // Failed to close group channel conversation
      }
    },
    [dispatch, currentUserId]
  );

  const openGroupConversation = useCallback(
    async (channelId: string) => {
      if (!currentUserId) return;
      
      try {
        await dispatch(openGroupChannelConversation({ 
          channelId, 
          userId: currentUserId 
        })).unwrap();
      } catch (error) {
        // Failed to open group channel conversation
      }
    },
    [dispatch, currentUserId]
  );

  // Check if group channel should be displayed
  const isGroupChannelVisible = useCallback(
    (channelId: string) => {
      return getPreference(preferences, 'group_channel_show', channelId, 'true') === 'true';
    },
    [preferences]
  );

  return {
    // State
    isLoading,
    isUpdating,
    lastSynced,
    
    // Current values
    theme: currentTheme,
    language: currentLanguage,
    desktopNotifications,
    soundNotifications,
    emailFrequency,
    mentionKeys,
    
    // Actions
    updateTheme,
    updateLanguage,
    updateDesktopNotifications,
    updateSoundNotifications,
    updateEmailNotifications,
    updateMentionKeys,
    updatePreferenceValue,
    getPreferenceValue,
    
    // Group channel conversation actions
    closeGroupConversation,
    openGroupConversation,
    isGroupChannelVisible,
    
    // Raw preferences for advanced usage
    preferences,
  };
};

export default useUserPreferences;