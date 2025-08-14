# Mattermost Connect Demo

Interactive demonstration of the Mattermost Connect React component library featuring complete Mattermost integration with Redux Toolkit, Material-UI theming, and real-time WebSocket communication.

## 🚀 Features Demonstrated

### Phase 3 Implementation
- **Complete Authentication Flow**: Login form with Mattermost server integration
- **Team Management**: Team navigation sidebar with switching capabilities  
- **Channel Navigation**: Channel list with categories, unread indicators, and joining
- **Dual Layout Modes**: Toggle between Custom Layout and Mattermost Layout
- **Real-time Communication**: WebSocket integration for live updates
- **Responsive Design**: Mobile-first responsive interface

### Core Components Showcased
- `AppProvider` - Complete app setup with Redux store and Material-UI theme
- `LoginForm` - Authentication interface with server connection
- `AppLayout` - Switchable layout system (custom vs mattermost style)
- `TeamList` - Team navigation with current team highlighting
- `ChannelList` - Channel navigation with categories and unread counts
- `ChatContainer` - Complete messaging interface with virtual scrolling
- `UserMenu` - User profile management and logout functionality

## 🏁 Quick Start

### Prerequisites
- Node.js 16+ and pnpm
- Access to a Mattermost server

### Installation & Setup

1. **Build the library** (from root directory):
```bash
pnpm run build
```

2. **Install demo dependencies**:
```bash
cd examples/demo
pnpm install
```

3. **Configure your Mattermost server** in `src/main.jsx`:
```javascript
setDefaultClient({ 
  serverUrl: 'https://your-mattermost-server.com' 
});
```

4. **Start development server**:
```bash
pnpm run dev
```

5. **Open demo**: Navigate to [http://localhost:5173](http://localhost:5173)

## 🎮 Demo Usage

### Authentication
1. Enter your Mattermost server credentials in the login form
2. The demo will authenticate and load your teams and channels
3. Success message displays your user information

### Layout Toggle
- Use the toggle buttons at the top to switch between:
  - **🎨 Custom Layout**: Flexible custom interface design
  - **📋 Mattermost Layout**: Authentic Mattermost-style interface

### Navigation
- **Teams**: Click team icons in the left sidebar to switch teams
- **Channels**: Navigate channels in the channel list with unread indicators
- **Messages**: View and interact with messages in the main chat area

## 🏗️ Technical Implementation

### App Structure
```tsx
<AppProvider>  {/* Includes Redux store + Material-UI theme */}
  <Box sx={{ height: "100vh" }}>
    {/* Layout Mode Toggle */}
    <ToggleButtonGroup />
    
    {/* Conditional Layout Rendering */}
    <AppLayout layout={layoutMode} />
  </Box>
</AppProvider>
```

### Key Implementation Details
- **Single Provider**: `AppProvider` handles Redux store, theme, and initialization
- **No Manual Store Setup**: Redux store is automatically configured
- **Theme Integration**: Material-UI theme with Mattermost-specific colors
- **WebSocket Management**: Automatic connection and event handling
- **State Management**: Normalized entities with optimized selectors

## 📱 Responsive Features

- **Mobile-First Design**: Touch-friendly interface elements
- **Adaptive Layouts**: Responsive breakpoints for all screen sizes
- **Touch Interactions**: Optimized for mobile and tablet usage
- **Progressive Web App**: PWA-ready with offline capabilities

## 🔧 Development Workflow

For active development, use two terminals:

**Terminal 1 (Library - from root)**:
```bash
pnpm run dev  # Watch mode for library changes
```

**Terminal 2 (Demo)**:
```bash
cd examples/demo
pnpm run dev  # Demo development server
```

This setup automatically reloads the demo when library code changes.

### Available Scripts
```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production  
pnpm run preview  # Preview production build
```

## 🔧 Configuration

### Vite Configuration
The demo uses Vite with library path resolution:
```javascript
// vite.config.js
resolve: {
  alias: {
    'mattermost-connect': path.resolve(__dirname, '../../dist/index.esm.js'),
  },
}
```

### Dependencies
```json
{
  "dependencies": {
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0", 
    "@mui/icons-material": "^5.14.18",
    "@mui/material": "^5.14.18",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## 📚 Learning Resources

This demo demonstrates:
- **Authentication Flow**: How to integrate Mattermost login
- **State Management**: Redux Toolkit with normalized entities
- **Component Usage**: Proper usage of library components
- **WebSocket Integration**: Real-time communication setup
- **Theme System**: Material-UI theme customization
- **Layout Flexibility**: Building custom vs standard layouts

## 🔗 Related Documentation

- [Mattermost Connect Library](../../README.md)
- [Component Documentation](../../docs/components.md)
- [API Reference](../../docs/api.md)

---

**Built with Mattermost Connect** - Showcasing the power of React + Mattermost integration.