// Export Client4 from mattermost-redux as our main client
import { Client4 } from 'mattermost-redux/client';

// Re-export Client4 as our main client
export const mattermostClient: typeof Client4 = Client4;

// Simple helpers for configuration
export const setDefaultClient = (config: { serverUrl: string }): void => {
  Client4.setUrl(config.serverUrl);
};

export const getDefaultClient = (): typeof Client4 => {
  return Client4;
};

// Export Client4 directly
export { Client4 };

export default Client4;