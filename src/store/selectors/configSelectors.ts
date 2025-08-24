
/**
 * Selectors for server configuration state
 * Provides cached access to configuration data with automatic cache validation
 */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ClientConfig } from '@mattermost/types/config';

// Base config selector
const selectConfigState = (state: RootState) => state.config;

// Select config with cache validation
export const selectConfig = createSelector(
  [selectConfigState],
  (configState) => {
    // Check if cache is still valid
    const now = Date.now();
    const { lastFetched, cacheDuration, config } = configState;
    
    if (lastFetched && (now - lastFetched) > cacheDuration) {
      // Cache expired, return null to trigger refresh
      return null;
    }
    
    return config;
  }
);

// Select if config is loading
export const selectConfigIsLoading = createSelector(
  [selectConfigState],
  (configState) => configState.isLoading
);

// Select config error
export const selectConfigError = createSelector(
  [selectConfigState],
  (configState) => configState.error
);

// Select if cache is valid
export const selectConfigCacheValid = createSelector(
  [selectConfigState],
  (configState) => {
    const now = Date.now();
    const { lastFetched, cacheDuration } = configState;
    
    if (!lastFetched) return false;
    return (now - lastFetched) <= cacheDuration;
  }
);

// Select specific config value
export const selectConfigValue = <K extends keyof ClientConfig>(key: K) =>
  createSelector(
    [selectConfig],
    (config): string | undefined => config?.[key]
  );

// Email capabilities selectors (from original hook logic)
export const selectEmailCapabilities = createSelector(
  [selectConfig],
  (config) => {
    if (!config) {
      return {
        emailInvitationsEnabled: false,
        signUpWithEmailEnabled: false,
        smtpConfigured: false,
      };
    }

    // Parse boolean strings from server config
    const emailInvitationsEnabled = config.EnableEmailInvitations === 'true';
    const signUpWithEmailEnabled = config.EnableSignUpWithEmail === 'true';
    const emailNotificationsEnabled = config.SendEmailNotifications === 'true';
    
    // SMTP is considered configured if email notifications are enabled
    const smtpConfigured = emailNotificationsEnabled;

    return {
      emailInvitationsEnabled: emailInvitationsEnabled && smtpConfigured,
      signUpWithEmailEnabled: signUpWithEmailEnabled && smtpConfigured,
      smtpConfigured,
    };
  }
);

// Select if email invitations are enabled server-side
export const selectCanSendEmailInvitationsServerSide = createSelector(
  [selectEmailCapabilities],
  (capabilities) => capabilities.emailInvitationsEnabled
);

// Select if public links are enabled
export const selectPublicLinksEnabled = createSelector(
  [selectConfig],
  (config) => config?.EnablePublicLink === 'true'
);