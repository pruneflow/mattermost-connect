// Export Client4 from mattermost-redux with helpers
import { Client4 } from 'mattermost-redux/client';
import type { UserProfile } from './types';

// Re-export Client4 as our main client with explicit type
export const mattermostClient: typeof Client4 = Client4;

// Global client instance management (compatibility)
export const setDefaultClient = (config: { serverUrl: string }): void => {
  Client4.setUrl(config.serverUrl);
};

export const getDefaultClient = (): typeof Client4 => {
  return Client4;
};

// For backward compatibility, export Client4 methods directly
export { Client4 };

// Legacy MattermostClient class for compatibility (deprecated)
export class MattermostClient {
  public serverUrl: string;
  
  constructor(config: { serverUrl: string }) {
    this.serverUrl = config.serverUrl;
    Client4.setUrl(config.serverUrl);
  }
  
  setToken(token: string) {
    Client4.setToken(token);
  }
  
  getToken() {
    return Client4.getToken();
  }
  
  async login(loginId: string, password: string): Promise<UserProfile> {
    return Client4.login(loginId, password);
  }
  
  async logout(): Promise<any> {
    return Client4.logout();
  }
  
  async getMe(): Promise<UserProfile> {
    return Client4.getMe();
  }
}

export default MattermostClient;