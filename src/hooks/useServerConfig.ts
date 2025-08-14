import { useState, useEffect, useCallback } from 'react';
import { client } from '../api/client';
import { handleSilentError } from '../services/errorService';
import type { ClientConfig } from '@mattermost/types/config';

export interface EmailCapabilities {
  emailInvitationsEnabled: boolean;
  signUpWithEmailEnabled: boolean;
  smtpConfigured: boolean;
}

/**
 * Hook for retrieving Mattermost server configuration
 * Uses the same method as the official Mattermost webapp
 */
export const useServerConfig = () => {
  
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch client configuration from Mattermost server
   * Uses getClientConfigOld like the official Mattermost webapp
   */
  const fetchConfig = useCallback(async (): Promise<ClientConfig | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the same method as official Mattermost webapp
      const clientConfig = await client.getClientConfigOld();
      setConfig(clientConfig);
      return clientConfig;
    } catch (err) {
      const errorMessage = 'Failed to fetch server configuration';
      setError(errorMessage);
      handleSilentError(err, 'fetchServerConfig');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleSilentError]);

  /**
   * Check email-related capabilities based on server configuration
   * STEP 1: Check server-side configuration (SMTP, email features enabled)
   */
  const checkServerEmailCapabilities = useCallback((serverConfig?: ClientConfig): EmailCapabilities => {
    const cfg = serverConfig || config;
    
    if (!cfg) {
      return {
        emailInvitationsEnabled: false,
        signUpWithEmailEnabled: false,
        smtpConfigured: false,
      };
    }

    // Parse boolean strings from server config (Mattermost returns "true"/"false" strings)
    const emailInvitationsEnabled = cfg.EnableEmailInvitations === 'true';
    const signUpWithEmailEnabled = cfg.EnableSignUpWithEmail === 'true';
    const emailNotificationsEnabled = cfg.SendEmailNotifications === 'true';
    
    // SMTP is considered configured if email notifications are enabled
    // This is the primary indicator that SMTP is properly configured
    const smtpConfigured = emailNotificationsEnabled;

    return {
      emailInvitationsEnabled: emailInvitationsEnabled && smtpConfigured, // Both must be true
      signUpWithEmailEnabled: signUpWithEmailEnabled && smtpConfigured,   // Both must be true
      smtpConfigured,
    };
  }, [config]);

  /**
   * Get current server email capabilities (Step 1 of the 2-step verification)
   * This only checks server-side configuration
   */
  const getServerEmailCapabilities = useCallback((): EmailCapabilities => {
    return checkServerEmailCapabilities();
  }, [checkServerEmailCapabilities]);

  /**
   * Check if email invitations are available at server level
   * This is STEP 1 - server configuration check
   * STEP 2 (user preferences) should be handled by the calling component
   */
  const canSendEmailInvitationsServerSide = useCallback((): boolean => {
    const capabilities = getServerEmailCapabilities();
    return capabilities.emailInvitationsEnabled;
  }, [getServerEmailCapabilities]);

  /**
   * Get server configuration value by key
   */
  const getConfigValue = useCallback((key: keyof ClientConfig): string | undefined => {
    return config?.[key];
  }, [config]);

  /**
   * Refresh configuration from server
   */
  const refreshConfig = useCallback(async (): Promise<void> => {
    await fetchConfig();
  }, [fetchConfig]);

  // Load config on mount
  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  return {
    // State
    config,
    isLoading,
    error,

    // Server email capabilities (Step 1)
    getServerEmailCapabilities,
    canSendEmailInvitationsServerSide,

    // Actions
    refreshConfig,
    
    // Utils
    checkServerEmailCapabilities,
    getConfigValue,
  };
};

export default useServerConfig;