# Mattermost Connect

A modern React component library for seamless Mattermost integration. Built with TypeScript, Redux Toolkit, and Material-UI, following atomic design principles to replicate official Mattermost behavior patterns.

[![npm version](https://badge.fury.io/js/mattermost-connect.svg)](https://badge.fury.io/js/mattermost-connect)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🚀 Features

### Core Features
- **Complete Mattermost Integration**: Full-featured chat interface with authentic Mattermost behavior
- **Production Ready**: Built with TypeScript, Redux Toolkit, and Material-UI for enterprise applications
- **Atomic Design**: Modular component architecture (atoms, molecules, organisms, templates)
- **Real-time Communication**: WebSocket integration for live messages, typing indicators, and user presence

### User Interface
- **Responsive Design**: Mobile-first design with adaptive layouts for all screen sizes
- **Rich Message Formatting**: Full markdown support, code blocks, file attachments, emoji, and mentions
- **Thread Support**: Complete threaded conversations with expand/collapse functionality
- **Customizable Themes**: Built-in light/dark modes with Material-UI theme customization

### Performance & Scalability
- **Virtual Scrolling**: High-performance message rendering with @tanstack/react-virtual
- **Optimized State Management**: Redux Toolkit with normalized entities and memoized selectors
- **File Management**: Upload, preview, and download files with comprehensive format support
- **Progressive Loading**: Efficient data loading and caching strategies

## 📦 Installation

```bash
npm install mattermost-connect react react-dom
```

**Required peer dependencies**: React 17+ or 18+

## 🏁 Quick Start

```tsx
import { AppProvider, setDefaultClient, AppLayout } from 'mattermost-connect';

// Configure your Mattermost server
setDefaultClient({ 
  serverUrl: 'https://your-mattermost-server.com' 
});

function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
```

The `AppProvider` automatically includes Redux store, Material-UI theme, and app initialization.

## 🧩 Component Architecture

### Atomic Design Structure

**Atoms** - Basic UI elements
- `UserAvatar`, `Button`, `MessageFormatter`, `StatusBadge`, `FileIcon`

**Molecules** - Composite components  
- `Message`, `ChannelItem`, `MessageInput`, `UserCard`, `TeamItem`

**Organisms** - Complex sections
- `ChannelList`, `ChatContainer`, `ThreadModal`, `LoginForm`, `TeamList`

**Templates** - Layout components
- `AppLayout`, `MattermostLayout`, `CustomLayout`

### Core Components

#### Authentication
- `LoginForm` - Complete authentication interface
- Authentication state management with hooks

#### Team Management  
- `TeamList` - Team navigation sidebar
- `TeamItem` - Individual team display
- Team switching and management hooks

#### Channel Navigation
- `ChannelList` - Channel navigation with categories
- `ChannelItem` - Individual channel display with unread indicators
- Channel joining and management

#### Messaging
- `ChatContainer` - Complete chat interface with virtual scrolling
- `MessageInput` - Rich text input with formatting toolbar
- `Message` - Message display with reactions, threads, and file attachments
- `MessageFormatter` - Markdown rendering with emoji and mention support

#### Thread System
- `ThreadModal` - Expandable thread interface
- `ThreadHeader` - Thread navigation with expand/collapse
- `ThreadInput` - Reply interface for threaded conversations

#### File Handling
- `FilePreviewContainer` - File upload and preview
- `FileAttachmentList` - File display with download and preview
- `HorizontalFileContainer` - Responsive file layout

#### User Interface
- `UserAvatar` - User profile images with status indicators
- `UserMenu` - User settings and logout
- `StatusSelector` - User presence status management

## 🎨 Theming

### Built-in Themes
- **Light Theme** (default)
- **Dark Theme** 
- **System Theme** (follows OS preference)

### Custom Theme Support
Full Material-UI theme customization with extended palette for Mattermost-specific colors including user message bubbles, status indicators, and channel highlighting.

## 🔌 State Management

### Redux Architecture
- **Normalized Entities**: Users, teams, channels, posts stored in normalized structure
- **UI State**: Current selections, modal states, editing modes
- **Real-time Updates**: WebSocket integration with optimistic updates
- **Error Handling**: Centralized error management with user notifications

### Available Hooks
- Authentication: `useAppSelector`, `selectIsAuthenticated`, `selectCurrentUser`
- Teams: `useTeams`, team switching and management
- Channels: `useChannels`, channel navigation and management  
- Messages: Message loading, sending, and real-time updates
- WebSocket: `useWebSocket`, `useMessageWebSocket`, `useTypingWebSocket`
- Preferences: `useUserPreferences` for user settings

## 🚀 Performance Features

- **Virtual Scrolling**: Efficient rendering of large message lists
- **Memoized Selectors**: Optimized Redux selectors to prevent unnecessary re-renders
- **Lazy Loading**: Code splitting and progressive component loading
- **WebSocket Optimization**: Efficient real-time updates with minimal DOM manipulation
- **File Optimization**: Progressive loading and caching for attachments

## 📱 Mobile & Responsive

- Touch-friendly interface elements optimized for mobile
- Adaptive layouts that work on desktop, tablet, and mobile
- Progressive Web App (PWA) support
- Virtual keyboard handling and responsive input management

## 🔒 Security

- Secure authentication using Mattermost's official `@mattermost/client`
- XSS protection with DOMPurify for message content sanitization
- Input validation and sanitization across all user inputs
- Secure file upload handling with type validation
- CSRF protection through official Mattermost client

## 🏗️ Technical Architecture

### State Structure
```
store/
├── entities/     # Normalized data (users, teams, channels, posts)
├── views/        # UI state and current selections  
├── auth/         # Authentication state
├── errors/       # Centralized error handling
└── loading/      # Loading states for async operations
```

### Component Hierarchy
```
AppProvider
├── Redux Store Provider
├── Material-UI Theme Provider
├── WebSocket Connections
└── App Initialization
```

## 📚 Development

### Local Development
```bash
pnpm install       # Install dependencies
pnpm run dev       # Development mode
pnpm run demo      # Run demo application
pnpm run storybook # Component development
```

### Build & Deploy
```bash
pnpm run build     # Production build
pnpm run typecheck # Type checking
pnpm run lint      # Code linting
pnpm run test      # Run tests
```

## 📦 Package Information

- **Bundle Size**: Optimized for production with tree-shaking support
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Dependencies**: Minimal dependencies focusing on React ecosystem standards
- **Browser Support**: Modern browsers with ES2018+ support

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/mattermost-connect/issues)
- **Documentation**: [GitHub Wiki](https://github.com/yourusername/mattermost-connect/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mattermost-connect/discussions)

---

**Mattermost Connect** - Bringing the power of Mattermost to your React applications.