// Official Mattermost client
import { Client4 } from '@mattermost/client';

// Create singleton client instance
const client = new Client4();

// Simple helpers for configuration
export const setDefaultClient = (config: { serverUrl: string }): void => {
  client.setUrl(config.serverUrl);
  
  // Configure client for cross-origin requests - disable cookies to avoid CORS issues
  // with Access-Control-Allow-Origin: * servers
  client.setIncludeCookies(false);
  client.setEnableLogging(true);
};

export const getDefaultClient = () => {
  return client;
};

// Export client instance 
export { client };
export const mattermostClient = client;

export default client;