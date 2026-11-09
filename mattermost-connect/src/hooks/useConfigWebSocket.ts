/**
 * WebSocket hook for handling server configuration updates
 * Listens for config_changed events and updates Redux state accordingly
 */
import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { fetchServerConfig } from '../store/slices/configSlice';

export const useConfigWebSocket = () => {
  const dispatch = useAppDispatch();

  const handleConfigEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'config_changed':
        // Server configuration has changed, refetch it
        dispatch(fetchServerConfig());
        break;
        
      default:
        // Ignore other events
        break;
    }
  }, [dispatch]);

  return { handleConfigEvent };
};