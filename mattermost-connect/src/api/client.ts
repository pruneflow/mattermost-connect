// Official Mattermost client
import { Client4 } from '@mattermost/client';

// Create singleton client instance
const client = new Client4();

// Export client instance 
export { client };
export const mattermostClient = client;