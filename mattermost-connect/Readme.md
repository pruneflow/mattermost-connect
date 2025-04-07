# MattermostConnect

Une bibliothèque de composants React pour intégrer des fonctionnalités Mattermost dans n'importe quelle application web.

## Caractéristiques

- 🔄 **Deux modes d'intégration**: Direct (avec token utilisateur) ou Proxy (via notre service)
- 🧩 **Composants modulaires**: Utilisez uniquement ce dont vous avez besoin
- 💬 **Communication en temps réel**: Support WebSocket pour les mises à jour instantanées
- 🎨 **Personnalisable**: Thème facilement adaptable à votre application
- 🔒 **Sécurisé**: Gestion appropriée des jetons d'authentification

## Installation

```bash
npm install mattermost-connect
# ou
yarn add mattermost-connect
```

## Démarrage rapide

### Mode Direct - Connexion avec un token

```jsx
import React from 'react';
import { MattermostProvider, ChannelViewer } from 'mattermost-connect';

const App = () => {
  return (
    <MattermostProvider
      serverUrl="https://mattermost.example.com"
      token="votre_token_ici"
    >
      <div style={{ height: '500px' }}>
        <ChannelViewer channelId="ID_DU_CANAL" />
      </div>
    </MattermostProvider>
  );
};

export default App;
```

### Mode Proxy - Connexion via un service intermédiaire

```jsx
import React from 'react';
import { MattermostProvider, ChannelViewer } from 'mattermost-connect';

const App = () => {
  return (
    <MattermostProvider
      proxyUrl="https://votre-proxy.example.com"
      clientId="votre_client_id"
      userId="id_utilisateur_application"
    >
      <div style={{ height: '500px' }}>
        <ChannelViewer channelId="ID_DU_CANAL" />
      </div>
    </MattermostProvider>
  );
};

export default App;
```

## Utilitaires d'authentification (Mode Direct)

Pour faciliter l'authentification en mode direct, utilisez l'utilitaire `MattermostAPI` :

```jsx
import { MattermostAPI } from 'mattermost-connect';

// Obtenir un token à partir de l'email et du mot de passe
const getToken = async () => {
  try {
    const token = await MattermostAPI.createUserToken({
      serverUrl: 'https://mattermost.example.com',
      username: 'user@example.com',
      password: 'mot_de_passe'
    });
    
    console.log('Token obtenu :', token);
    return token;
  } catch (error) {
    console.error('Erreur d\'authentification :', error);
  }
};

// Vérifier si un token est valide
const checkToken = async (token) => {
  const isValid = await MattermostAPI.validateToken({
    serverUrl: 'https://mattermost.example.com',
    token
  });
  
  return isValid;
};
```

## Composants disponibles

### ChannelViewer

Affiche les messages d'un canal Mattermost.

```jsx
<ChannelViewer 
  channelId="ID_DU_CANAL"
  readOnly={false}
  showHeader={true}
  loadMessageCount={50}
  autoScrollToBottom={true}
/>
```

### MessageComposer

Permet aux utilisateurs d'envoyer des messages dans un canal.

```jsx
<MessageComposer 
  channelId="ID_DU_CANAL"
  placeholder="Écrivez un message..."
  allowAttachments={true}
  showSendButton={true}
  onMessageSent={(message) => console.log('Message envoyé', message)}
/>
```

### ChannelList

Affiche la liste des canaux disponibles pour une équipe.

```jsx
<ChannelList 
  teamId="ID_DE_L_EQUIPE"
  selectedChannelId="ID_CANAL_SELECTIONNE"
  onSelectChannel={(channel) => console.log('Canal sélectionné', channel)}
  showPrivateChannels={true}
  showDirectMessages={true}
  showSearch={true}
  groupByType={true}
/>
```

## Personnalisation

MattermostConnect utilise des variables CSS pour permettre une personnalisation facile :

```css
:root {
  /* Couleurs générales */
  --mattermost-border-color: #ccc;
  --mattermost-bg-color: #fff;
  --mattermost-text-color: #333;
  
  /* En-tête de canal */
  --mattermost-header-bg: #f5f5f5;
  --mattermost-header-color: #333;
  
  /* Messages */
  --mattermost-avatar-bg: #1c58d9;
  --mattermost-avatar-color: white;
  --mattermost-author-color: #333;
  --mattermost-message-color: #333;
  
  /* Éléments d'action */
  --mattermost-primary-bg: #1c58d9;
  --mattermost-primary-color: white;
  --mattermost-button-bg: #f5f5f5;
  --mattermost-button-color: #333;
  
  /* Autres éléments configurables... */
}
```

## Usage avancé

### Utilisation du hook useMattermost

Le hook `useMattermost` vous donne accès à toutes les fonctionnalités du service Mattermost :

```jsx
import { useMattermost } from 'mattermost-connect';

const MyComponent = () => {
  const { 
    isConnected, 
    currentUser, 
    service, 
    error, 
    mode 
  } = useMattermost();
  
  const sendCustomMessage = async () => {
    if (isConnected) {
      try {
        await service.postMessage('channel_id', 'Message personnalisé');
      } catch (err) {
        console.error('Erreur :', err);
      }
    }
  };
  
  return (
    <div>
      <p>Connecté: {isConnected ? 'Oui' : 'Non'}</p>
      <p>Utilisateur: {currentUser?.username}</p>
      <p>Mode: {mode}</p>
      <button onClick={sendCustomMessage}>Envoyer message personnalisé</button>
    </div>
  );
};
```

## Modes de fonctionnement

### Mode Direct

Le mode direct établit une connexion directe avec un serveur Mattermost en utilisant un token d'API utilisateur.

**Avantages :**
- Fonctionne avec n'importe quel serveur Mattermost existant
- Indépendance totale de notre infrastructure
- Implémentation immédiate sans configuration supplémentaire

**Configuration requise :**
- URL du serveur Mattermost
- Token d'API valide pour un utilisateur

### Mode Proxy

Le mode proxy utilise notre service intermédiaire pour gérer la communication avec Mattermost, en masquant les tokens et en simplifiant l'authentification.

**Avantages :**
- Pas de gestion de tokens côté client
- Sécurité améliorée (tokens jamais exposés au frontend)
- Intégration avec notre outil d'administration
- Fonctionnalités avancées (analytics, permissions granulaires)

**Configuration requise :**
- URL de notre service proxy
- ID client pour votre application
- ID utilisateur dans votre système

## Licence

MIT