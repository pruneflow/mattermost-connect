# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MattermostConnect is a modern React component library for integrating Mattermost features into any web application. It's built with Material-UI and TypeScript, providing a flexible way to embed Mattermost communication features in third-party applications.

The library offers two integration modes:
- **Direct Mode**: Connect directly with a Mattermost server using a user token
- **Proxy Mode**: Connect via an intermediary service

## Building and Development Commands

```bash
# Install dependencies
pnpm install

# Build the library
pnpm run build

# Development mode with watch
pnpm run dev

# Clean build artifacts
pnpm run clean

# Run linting
pnpm run lint

# Format code
pnpm run format

# Type checking
pnpm run typecheck

# Run tests
pnpm run test

# Run demo application
pnpm run demo
```

## Demo Application

The demo application shows example usage of the component library. To run it:

```bash
# First build the main library
pnpm run build

# Install demo dependencies
cd examples/demo
pnpm install

# Start the demo
pnpm start
```

For development, use two terminals:
1. In the root directory: `pnpm run dev`
2. In examples/demo: `pnpm start`

## Architecture

### Core Structure

- **src/**: Main source code
  - **components/**: React UI components for users, teams, channels, messages
  - **core/**: Core functionality 
    - **api/**: API client, queries, and utilities
    - **services/**: Service implementations for auth, channels, messages, etc.
    - **store/**: State management with various stores
  - **hooks/**: React hooks for different features (auth, channels, messages, teams, users, etc.)
  - **internal/**: Internal implementation details
    - **components/**: UI components implementations
    - **containers/**: Container components
    - **hooks/**: Internal hooks
    - **providers/**: Context providers
    - **theme/**: Theme configuration
  - **providers/**: Public provider components
  - **types/**: TypeScript type definitions
  - **utils/**: Utility functions

### Key Components

The library exposes components for:
- Authentication and user management
- Team selection and management
- Channel listing and viewing
- Messaging and attachments
- Notifications

### Data Flow

1. **MattermostProvider**: Top-level provider that manages connections and state
2. **Service Layer**: Handles communication with Mattermost servers
3. **Hooks Layer**: Exposes React hooks for components
4. **Component Layer**: UI components that use hooks and services

### State Management

State is managed through a combination of:
- React Query for server state
- Zustand for local state management
- Custom hooks for specific features

## Working with the Codebase

When making changes:

1. Consider which integration mode (Direct or Proxy) your changes affect
2. Check for existing patterns in similar components
3. Use the existing hook structure for data fetching and state management
4. Run typecheck and lint before submitting changes
5. Test changes in the demo application

For new components:
1. Create UI components in the appropriate subfolder of `src/internal/components/`
2. Create containers in `src/internal/containers/`
3. Export public components from `src/components/`
4. Update the exports in the feature's index.ts and the root index.ts