// Loading system types - Simple and clean

export type LoadingKey = 
  // Auth operations
  | 'auth.login' 
  | 'auth.getCurrentUser'
  | 'auth.logout'
  
  // Teams operations
  | 'teams.loadTeams' 
  | 'teams.createTeam'
  | 'teams.uploadIcon'
  | 'teams.loadUnreads'
  
  // Users operations
  | 'users.loadUsers' 
  | 'users.loadUser'
  | 'users.updateUser'
  | 'users.updateStatus'
  
  // Channels operations
  | 'channels.loadChannels' 
  | 'channels.createChannel'
  
  // Posts operations
  | 'posts.loadPosts' 
  | 'posts.createPost'
  
  // Unread counts
  | 'unread.loadCounts'
  
  // Preferences
  | 'preferences.updateTheme'
  | 'preferences.updateNotifications';

// Simple loading state
export interface LoadingStateItem {
  isLoading: boolean;
  error: string | null;
}

export interface LoadingState {
  [key: string]: LoadingStateItem;
}