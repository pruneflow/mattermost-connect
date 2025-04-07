# MattermostConnect

A modern React component library for integrating Mattermost features into any web application, built with Material-UI and TypeScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9%2B-blue)
![React](https://img.shields.io/badge/React-17%2B-61dafb)
![Material-UI](https://img.shields.io/badge/Material--UI-5.14%2B-0081cb)

## Features

- 🔄 **Two integration modes**: Direct (with user token) or Proxy (via your service)
- 🧩 **Modular components**: Use only what you need
- 💬 **Real-time communication**: WebSocket support for instant updates
- 🎨 **Material-UI based**: Modern UI with full customization options
- 🔒 **Secure**: Proper token management
- 📱 **Responsive design**: Works on all devices
- 🌐 **TypeScript support**: Full type definitions included

# Guide d'installation et de développement

## Installation initiale

Pour installer les dépendances sans exécuter le build automatiquement (ce qui échouerait sans les dépendances) :

```bash
# Installer les dépendances
pnpm install

# Construire la bibliothèque manuellement
pnpm run build
```

## Structure du projet

Le projet est organisé comme suit :

- `src/` : Code source de la bibliothèque
    - `components/` : Composants UI React
    - `context/` : Context provider et hooks
    - `services/` : Services de communication avec Mattermost
    - `types/` : Définitions TypeScript
    - `utils/` : Utilitaires et helpers
    - `theme/` : Configuration du thème Material-UI
- `examples/` : Applications d'exemple
    - `demo/` : Application de démonstration

## Commandes disponibles

- `pnpm run build` : Construit la bibliothèque
- `pnpm run dev` : Lance le build en mode watch
- `pnpm run clean` : Nettoie le dossier de build
- `pnpm run lint` : Vérifie le code avec ESLint
- `pnpm run format` : Formate le code avec Prettier
- `pnpm run typecheck` : Vérifie les types TypeScript
- `pnpm run demo` : Lance l'application de démonstration
- `pnpm run test` : Exécute les tests

## Exécuter la démo

Pour lancer l'application de démonstration :

1. Construisez d'abord la bibliothèque :
   ```bash
   pnpm run build
   ```

2. Installez les dépendances de la démo :
   ```bash
   cd examples/demo
   pnpm install
   ```

3. Lancez l'application démo :
   ```bash
   pnpm start
   ```

## Développement

Pour travailler sur la bibliothèque en mode développement :

1. Lancez le build en mode watch dans un terminal :
   ```bash
   pnpm run dev
   ```

2. Dans un autre terminal, lancez l'application démo :
   ```bash
   cd examples/demo
   pnpm start
   ```

Les modifications au code source seront automatiquement recompilées et l'application démo se mettra à jour.

## Troubleshooting

### Erreurs de build lors de l'installation

Si vous rencontrez des erreurs lors de l'installation avec `pnpm install`, assurez-vous de suivre la procédure :
1. Installation des dépendances : `pnpm install`
2. Construction manuelle : `pnpm run build`

Le script `prepublishOnly` a été configuré pour ne s'exécuter que lors de la publication du package, pas lors de l'installation.

### Problèmes avec React comme dépendance

Cette bibliothèque utilise React comme "peer dependency", ce qui signifie que votre application doit fournir sa propre version de React. Si vous rencontrez des erreurs liées à des versions incompatibles de React, assurez-vous que votre application utilise React 17 ou supérieur.

## Quick Start

### Direct Mode - Connection with a user token

```tsx
import React from 'react';
import { 
  MattermostProvider, 
  ChannelList, 
  ChannelViewer, 
  MessageComposer, 
  MattermostThemeProvider 
} from 'mattermost-connect';

const App = () => {
  const [selectedChannelId, setSelectedChannelId] = React.useState('');
  
  return (
    <MattermostThemeProvider>
      <MattermostProvider
        serverUrl="https://mattermost.example.com"
        token="your_personal_access_token"
      >
        <div style={{ display: 'flex', height: '100vh' }}>
          {/* Channel List */}
          <div style={{ width: 280, borderRight: '1px solid #eee' }}>
            <ChannelList
              teamId="your_team_id"
              selectedChannelId={selectedChannelId}
              onSelectChannel={(channel) => setSelectedChannelId(channel.id)}
            />
          </div>
          
          {/* Channel Viewer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ChannelViewer
                channelId={selectedChannelId}
                showHeader={true}
              />
            </div>
            
            {/* Message Composer */}
            <MessageComposer
              channelId={selectedChannelId}
              placeholder="Type a message..."
              allowAttachments={true}
            />
          </div>
        </div>
      </MattermostProvider>
    </MattermostThemeProvider>
  );
};

export default App;
```

### Proxy Mode - Connection via an intermediary service

```tsx
import React from 'react';
import { MattermostProvider, ChannelViewer } from 'mattermost-connect';

const App = () => {
  return (
    <MattermostProvider
      proxyUrl="https://your-proxy-service.com"
      clientId="your_client_id"
      userId="user_id_in_your_system"
    >
      <ChannelViewer
        channelId="channel_id"
        showHeader={true}
      />
    </MattermostProvider>
  );
};

export default App;
```

## Authentication Utilities (Direct Mode)

For direct mode authentication, use the `MattermostAPI` utility:

```tsx
import { MattermostAPI } from 'mattermost-connect';

// Get a token from email and password
const getToken = async () => {
  try {
    const token = await MattermostAPI.createUserToken({
      serverUrl: 'https://mattermost.example.com',
      username: 'user@example.com',
      password: 'password'
    });
    
    console.log('Token obtained:', token);
    return token;
  } catch (error) {
    console.error('Authentication error:', error);
  }
};

// Check if a token is valid
const checkToken = async (token) => {
  const isValid = await MattermostAPI.validateToken({
    serverUrl: 'https://mattermost.example.com',
    token
  });
  
  return isValid;
};
```

## Components

### MattermostProvider

The core provider component that manages the connection and state.

```tsx
<MattermostProvider
  // Direct mode
  serverUrl="https://mattermost.example.com"
  token="your_token"
  
  // OR Proxy mode
  proxyUrl="https://proxy.example.com"
  clientId="client_id"
  userId="user_id"
  
  // Options
  enableWebsocket={true}
  refreshInterval={30000}
>
  {/* Your components */}
</MattermostProvider>
```

### ChannelList

Displays a list of channels from a Mattermost team.

```tsx
<ChannelList
  teamId="team_id"
  selectedChannelId="selected_channel_id"
  onSelectChannel={(channel) => console.log('Selected channel:', channel)}
  showPrivateChannels={true}
  showDirectMessages={true}
  showSearch={true}
  groupByType={true}
/>
```

### ChannelViewer

Displays messages from a channel.

```tsx
<ChannelViewer
  channelId="channel_id"
  showHeader={true}
  readOnly={false}
  autoScrollToBottom={true}
  loadMessageCount={50}
/>
```

### MessageComposer

Allows users to compose and send messages.

```tsx
<MessageComposer
  channelId="channel_id"
  placeholder="Type a message..."
  allowAttachments={true}
  showSendButton={true}
  maxHeight={150}
  onMessageSent={(message) => console.log('Message sent:', message)}
/>
```

## Customization

### Using the Theme Provider

MattermostConnect includes a theme provider based on Material-UI that you can customize:

```tsx
import { MattermostThemeProvider, createDefaultTheme } from 'mattermost-connect';
import { createTheme } from '@mui/material/styles';

// Create your custom theme by extending the default theme
const myTheme = createTheme({
  ...createDefaultTheme(),
  palette: {
    primary: {
      main: '#ff5722', // Your custom primary color
    },
    // Override other colors as needed
  }
});

// Use the custom theme
<MattermostThemeProvider theme={myTheme}>
  {/* Your components */}
</MattermostThemeProvider>
```

### Component-Level Styling

Each component accepts the following styling props:

- `className`: CSS class name for the root element
- `style`: Inline styles for the root element
- `sx`: Material-UI's [sx prop](https://mui.com/system/getting-started/the-sx-prop/) for advanced styling
- Component-specific styling props (check each component's prop types)

Example:

```tsx
<ChannelList
  sx={{
    borderRight: '1px solid',
    borderColor: 'divider',
    bgcolor: '#f7f9fa',
  }}
  selectedChannelSx={{
    bgcolor: 'rgba(25, 118, 210, 0.15)',
    fontWeight: 'bold',
  }}
/>
```

## Using the Hook

For advanced use cases, you can use the `useMattermost` hook to access all functionality:

```tsx
import { useMattermost } from 'mattermost-connect';

const MyComponent = () => {
  const { 
    isConnected, 
    currentUser, 
    getChannel, 
    postMessage,
    error,
    mode
  } = useMattermost();
  
  const sendMessage = async () => {
    if (isConnected) {
      try {
        await postMessage('channel_id', 'Hello from my custom component!');
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };
  
  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>User: {currentUser?.username}</p>
      <p>Mode: {mode}</p>
      <button onClick={sendMessage}>Send custom message</button>
    </div>
  );
};
```

## Operating Modes

### Direct Mode

Direct mode establishes a direct connection with a Mattermost server using a user API token.

**Advantages:**
- Works with any existing Mattermost server
- Independent of additional infrastructure
- Immediate implementation without extra configuration

**Required configuration:**
- Mattermost server URL
- Valid API token for a user

### Proxy Mode

Proxy mode uses your intermediary service to manage communication with Mattermost, hiding tokens and simplifying authentication.

**Advantages:**
- No token management on the client side
- Enhanced security (tokens never exposed to frontend)
- Integration with your administration tool
- Advanced features (analytics, granular permissions)

**Required configuration:**
- Your proxy service URL
- Client ID for your application
- User ID in your system (optional)

## License

MIT