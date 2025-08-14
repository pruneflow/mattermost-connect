import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { updatePreferences } from '../store/slices/preferencesSlice';
import { selectCurrentUserId } from '../store/selectors';
import type { PreferenceType } from '../api/types';

/**
 * Hook for handling preferences-related WebSocket events
 * Processes real-time preference updates following Mattermost pattern
 */
export const usePreferencesWebSocket = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Handle incoming WebSocket events for preferences
  const handlePreferencesEvent = useCallback((event: string, data: Record<string, any>) => {
    switch (event) {
      case 'preferences_changed':
        if (data.preferences && currentUserId) {
          try {
            // Parse preferences string from WebSocket data
            const preferencesData = typeof data.preferences === 'string' 
              ? JSON.parse(data.preferences) 
              : data.preferences;
            
            if (Array.isArray(preferencesData)) {
              // Filter only preferences for current user (security check)
              const userPreferences = preferencesData.filter(
                (pref: PreferenceType) => pref.user_id === currentUserId
              );
              
              if (userPreferences.length > 0) {
                
                // Update each preference individually to maintain existing ones
                const updates = userPreferences.map((pref: PreferenceType) => ({
                  category: pref.category,
                  name: pref.name,
                  value: pref.value
                }));
                
                dispatch(updatePreferences({
                  userId: currentUserId,
                  updates
                }));
              }
            }
          } catch (error) {
            // Failed to parse preferences from WebSocket
          }
        }
        break;
        
      default:
        // Ignore other events
        break;
    }
  }, [dispatch, currentUserId]);

  return {
    handlePreferencesEvent,
  };
};

export default usePreferencesWebSocket;