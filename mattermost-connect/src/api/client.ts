// Official Mattermost client
import { Client4 } from '@mattermost/client';

// Create singleton client instance
const client = new Client4();

// Simple helpers for configuration
export const setDefaultClient = (config: { serverUrl: string }): void => {
  client.setUrl(config.serverUrl);
  
  // Enable cookies for authentication (required by Mattermost)
  client.setIncludeCookies(true);
  client.setEnableLogging(true);
  
  // Remove problematic headers that trigger CORS preflight
  if (client.defaultHeaders) {
    delete client.defaultHeaders['X-Requested-With'];
  }
};

export const getDefaultClient = () => {
  return client;
};

// Export client instance 
export { client };
export const mattermostClient = client;

export default client;