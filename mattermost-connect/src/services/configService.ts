/**
 * Configuration service for managing Mattermost server configuration
 * Handles loading, caching, and retrieving server configuration globally
 */
import { store } from '../store';
import { fetchServerConfig } from '../store/slices/configSlice';
import { 
  selectConfig, 
  selectConfigCacheValid,
  selectEmailCapabilities,
  selectCanSendEmailInvitationsServerSide,
  selectPublicLinksEnabled
} from '../store/selectors/configSelectors';
import type { ClientConfig } from '@mattermost/types/config';

/**
 * Initialize server configuration - should be called once at app startup
 * Only loads if config is not cached or cache has expired
 */
export const initConfig = async (): Promise<ClientConfig | null> => {
  const state = store.getState();
  const isCacheValid = selectConfigCacheValid(state);
  const existingConfig = selectConfig(state);

  // Only fetch if no valid cached config exists
  if (!existingConfig || !isCacheValid) {
    const result = await store.dispatch(fetchServerConfig());
    if (fetchServerConfig.fulfilled.match(result)) {
      return result.payload;
    }
    return null;
  }

  return existingConfig;
};

/**
 * Get current server configuration from Redux store
 */
export const getConfig = (): ClientConfig | null => {
  const state = store.getState();
  return selectConfig(state);
};

/**
 * Get specific configuration value
 */
export const getConfigValue = <K extends keyof ClientConfig>(key: K): string | undefined => {
  const config = getConfig();
  return config?.[key];
};

/**
 * Force refresh configuration from server
 */
export const refreshConfig = async (): Promise<ClientConfig | null> => {
  const result = await store.dispatch(fetchServerConfig());
  if (fetchServerConfig.fulfilled.match(result)) {
    return result.payload;
  }
  return null;
};

/**
 * Get email capabilities from current configuration
 */
export const getEmailCapabilities = () => {
  const state = store.getState();
  return selectEmailCapabilities(state);
};

/**
 * Check if email invitations are enabled server-side
 */
export const canSendEmailInvitationsServerSide = (): boolean => {
  const state = store.getState();
  return selectCanSendEmailInvitationsServerSide(state);
};

/**
 * Check if public links are enabled
 */
export const isPublicLinksEnabled = (): boolean => {
  const state = store.getState();
  return selectPublicLinksEnabled(state);
};

// Export service object for easier importing
export const configService = {
  initConfig,
  getConfig,
  getConfigValue,
  refreshConfig,
  getEmailCapabilities,
  canSendEmailInvitationsServerSide,
  isPublicLinksEnabled,
};