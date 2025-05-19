# Simplified Mattermost Connect

This directory contains a simplified and modernized version of the Mattermost Connect library. The implementation focuses on reducing complexity, improving maintainability, and following modern React patterns.

## Key Features

- **React Query for Data Fetching**: Uses React Query for all API interactions, providing caching, background updates, and optimistic UI updates.
- **React Context for Global State**: Replaces Zustand stores with React Context for simpler global state management.
- **Custom Hooks for Logic**: Separates business logic into custom hooks, keeping components focused on presentation.
- **Functional Components**: Uses only functional components with React hooks for state and effects.
- **TypeScript**: Fully typed with simpler, more focused type definitions.
- **Material UI Components**: Uses MUI components for a modern, responsive UI.

## Architecture

The simplified architecture follows a clear separation of concerns:

1. **API Layer**: A lightweight API client for communication with the Mattermost server.
2. **Data Layer**: React Query hooks that handle data fetching, caching, and mutations.
3. **UI Layer**: React components that use hooks to access data and handle user interactions.

## Comparison with Original Implementation

| Feature | Original Implementation | Simplified Implementation |
|---------|------------------------|---------------------------|
| State Management | Zustand stores + React Query | React Query + React Context |
| Component Structure | 3-tier (Component → Container → UI) | 2-tier (Component → Hooks) |
| Code Organization | Multiple overlapping abstractions | Clear separation of concerns |
| Data Flow | Complex with multiple paths | Unidirectional and predictable |
| Performance | Manual optimizations required | Automatic with React Query |
| Bundle Size | Larger | Significantly smaller |
| Developer Experience | Complex learning curve | Intuitive and familiar |

## Usage Example

```tsx
import React from 'react';
import { MattermostProvider, ChatInterface, useAuth } from 'mattermost-connect';

function MyApp() {
  return (
    <MattermostProvider>
      <AuthenticatedContent />
    </MattermostProvider>
  );
}

function AuthenticatedContent() {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return (
    <div>
      <h1>Welcome, {user.username}</h1>
      <ChatInterface teamId="team1" />
    </div>
  );
}
```

## Components

### Main Components

- **ChatInterface**: Combines ChannelList, MessageList, and MessageInput for a complete chat experience.
- **ChannelList**: Displays a list of channels, with filtering by type (public, private, direct, group).
- **MessageList**: Displays messages for a selected channel, grouped by date.
- **MessageInput**: Allows composing and sending messages, with file upload support.
- **Message**: Displays a single message with user info, content, and actions.

### Context Providers

- **AuthProvider**: Handles authentication, token management, and user information.
- **MattermostProvider**: The root provider that combines all necessary providers.

### Hooks

- **useAuth**: Access authentication state and methods.
- **useChannels**: Query and mutate channels.
- **useMessages**: Query and mutate messages.
- **useUsers**: Query user information.
- **useTeams**: Query and mutate teams.

## Next Steps

- Implement WebSocket connection for real-time updates
- Add more specialized components (e.g., TeamList, UserProfile)
- Enhance the theme system with more customization options
- Create comprehensive demo applications
- Write unit and integration tests

## Getting Started

```bash
# Install dependencies
npm install

# Run the demo
cd examples/demo
npm start
```

## License

Same as the main project.