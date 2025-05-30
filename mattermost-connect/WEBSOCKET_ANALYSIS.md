# Analyse WebSocket Mattermost : Architecture Actuelle vs Patterns Officiels

## 📊 État Actuel de Notre Architecture

### 🔧 Notre Implémentation (src-old-backup/hooks/useWebSocket.tsx)

**Architecture Singleton Pattern** :
- WebSocketSingleton centralisé avec état global partagé
- Gestion d'événements par canal/utilisateur avec abonnements granulaires
- Reconnection automatique avec exponential backoff
- Support événements temps réel : typing, status, reactions, messages

**Points Forts** :
- ✅ Connexion unique partagée entre composants
- ✅ Event handling granulaire par canal/utilisateur
- ✅ Gestion robuste reconnexion avec verrous anti-concurrence
- ✅ Support complet événements Mattermost (posted, typing, status_change, reactions)
- ✅ Optimisation performances avec batching et throttling

**Problèmes Identifiés** :
- ❌ **Pas de middleware Redux** : Les événements sont gérés dans le hook, pas via un middleware centralisé
- ❌ **Dispatch manuel** : Chaque événement fait des setQueryData manuels au lieu d'utiliser Redux
- ❌ **Code dupliqué** : Logique WebSocket mélangée avec logique UI dans le hook
- ❌ **Pas de persistance** : État WebSocket non persisté dans le store Redux

### 🏪 Notre Store Redux Actuel (src/store/)

**Structure suivant mattermost-redux** :
- ✅ entitiesSlice inspiré de mattermost-redux (users, teams, channels, posts)
- ✅ Actions Redux pour unread counts (incrementChannelUnreadCount, resetChannelUnreadCount)
- ✅ Selectors centralisés dans selectors.ts
- ✅ Hooks typés (useAppDispatch, useAppSelector)

**Manque** :
- ❌ **Middleware WebSocket** pour dispatcher automatiquement les événements
- ❌ **Actions WebSocket** structurées pour chaque type d'événement
- ❌ **État WebSocket** dans le store (connection status, retry count, etc.)

## 🏛️ Patterns Officiels Mattermost

### 📡 WebSocket Client Pattern (webapp/platform/client/src/websocket.ts)

```typescript
// Pattern officiel : Configuration robuste
class WebSocketClient {
  maxWebSocketFails: number = 7;
  retryTime: number = 3000;
  jitter: boolean = true;
  
  // Listeners par type d'événement
  messageListeners: Map<string, Function[]>;
  firstConnectListeners: Function[];
  reconnectListeners: Function[];
  errorListeners: Function[];
  
  // Gestion séquence pour fiabilité
  responseSequence: number;
  serverSequence: number;
}
```

**Notre adaptation nécessaire** :
- Adopter la structure de listeners par type
- Implémenter le système de séquences pour la fiabilité
- Séparer configuration WebSocket de la logique business

### 🔄 Redux Integration Pattern (websocket_actions.jsx)

```javascript
// Pattern officiel : Event handling centralisé
export function handleEvent(msg) {
  switch (msg.event) {
    case 'posted':
      handleNewPostEvent(msg);
      break;
    case 'status_change': 
      handleStatusChangedEvent(msg);
      break;
    // ... autres événements
  }
}

function handleNewPostEvent(msg) {
  const post = JSON.parse(msg.data.post);
  
  // Dispatch multiple actions avec batchActions
  store.dispatch(batchActions([
    {type: PostTypes.RECEIVED_NEW_POST, data: post},
    {type: ChannelTypes.INCREMENT_UNREAD_MSG_COUNT, data: {...}}
  ]));
}
```

**Notre adaptation nécessaire** :
- Créer un middleware WebSocket qui intercepte tous les événements
- Chaque événement WebSocket doit dispatcher des actions Redux spécifiques
- Utiliser batchActions pour les mises à jour multiples

### 🏗️ Architecture Mattermost-Redux

```typescript
// Pattern officiel : Store configuration
export function configureServiceStore(preloadedState, appReducers) {
  const store = configureStore({
    reducer: {
      entities: entitiesReducer,
      views: viewsReducer,
      errors: errorsReducer,
      // WebSocket state management
      websocket: websocketReducer
    },
    middleware: [
      websocketMiddleware, // ← Pattern clé manquant
      thunk
    ]
  });
  
  return store;
}
```

## 🎯 Recommandations Spécifiques

### 1. **Créer un Middleware WebSocket Redux**

```typescript
// src/store/middleware/websocketMiddleware.ts
export const websocketMiddleware: Middleware = (store) => (next) => (action) => {
  switch (action.type) {
    case 'websocket/connect':
      // Initialiser WebSocket connection
      break;
    case 'websocket/event_received':
      // Dispatcher l'événement vers les bons reducers
      handleWebSocketEvent(action.payload, store.dispatch);
      break;
  }
  return next(action);
};
```

### 2. **Créer des Actions WebSocket Typées**

```typescript
// src/store/slices/websocketSlice.ts
export const websocketSlice = createSlice({
  name: 'websocket',
  initialState: {
    isConnected: false,
    isConnecting: false,
    retryCount: 0,
    lastEventSequence: 0
  },
  reducers: {
    connectionStarted: (state) => {
      state.isConnecting = true;
    },
    connectionEstablished: (state) => {
      state.isConnected = true;
      state.isConnecting = false;
      state.retryCount = 0;
    },
    eventReceived: (state, action) => {
      state.lastEventSequence = action.payload.seq;
    }
  }
});
```

### 3. **Refactorer useWebSocket vers un Service**

```typescript
// src/services/WebSocketService.ts
class WebSocketService {
  private ws: WebSocket | null = null;
  private dispatch: AppDispatch;
  
  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }
  
  connect(serverUrl: string, token: string) {
    // Connexion WebSocket
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.dispatch(websocketEventReceived(data));
    };
  }
}
```

### 4. **Event Handlers Centralisés**

```typescript
// src/store/middleware/websocketEventHandlers.ts
export const handleWebSocketEvent = (event: WebSocketEvent, dispatch: AppDispatch) => {
  switch (event.event) {
    case 'posted':
      const post = JSON.parse(event.data.post);
      dispatch(batchActions([
        setPost(post),
        incrementChannelUnreadCount({
          channelId: post.channel_id,
          msgCount: 1,
          fromCurrentUser: post.user_id === getCurrentUserId()
        })
      ]));
      break;
      
    case 'status_change':
      dispatch(setUserStatus({
        user_id: event.data.user_id,
        status: event.data.status
      }));
      break;
  }
};
```

### 5. **Hook Simplifié pour les Composants**

```typescript
// src/hooks/useWebSocketConnection.ts
export const useWebSocketConnection = () => {
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector(state => state.websocket.isConnected);
  
  const connect = useCallback(() => {
    dispatch(websocketConnect({ serverUrl, token }));
  }, [dispatch]);
  
  return { isConnected, connect };
};
```

## 🔧 Plan de Refactoring

### Phase 1: Infrastructure Redux WebSocket
1. **Créer websocketSlice** avec état connexion
2. **Créer websocketMiddleware** pour intercepter événements  
3. **Créer WebSocketService** séparé de la logique UI
4. **Migrer les event handlers** vers le middleware

### Phase 2: Actions & Selectors
1. **Créer actions typées** pour chaque événement WebSocket
2. **Utiliser batchActions** pour les mises à jour multiples
3. **Créer selectors WebSocket** (isConnected, connectionStatus)
4. **Intégrer avec entitiesSlice** existant

### Phase 3: Hooks & Components  
1. **Simplifier useWebSocket** → useWebSocketConnection
2. **Supprimer WebSocketSingleton** → utiliser Redux store
3. **Migrer les composants** vers les nouveaux hooks
4. **Tests d'intégration** complets

### Phase 4: Optimisations
1. **Persistence offline** des événements ratés
2. **Batching intelligent** des événements haute fréquence
3. **Retry strategy** sophistiquée comme Mattermost officiel
4. **Performance monitoring** des événements WebSocket

## 📈 Bénéfices Attendus

### Conformité Mattermost
- ✅ **Architecture identique** à mattermost-redux
- ✅ **Event handling patterns** officiels
- ✅ **Store structure** standardisée

### Maintenabilité
- ✅ **Séparation des préoccupations** : WebSocket ↔ Redux ↔ UI
- ✅ **Code réutilisable** entre différents composants
- ✅ **Tests facilités** avec store Redux prévisible

### Performance
- ✅ **Batching automatique** des mises à jour Redux
- ✅ **State management optimisé** via Redux DevTools
- ✅ **Memory leaks évités** avec cleanup automatique

## 🚨 Points d'Attention

### Migration Progressive
- **Garder l'ancien useWebSocket** en parallèle pendant la migration
- **Tests A/B** pour s'assurer que les fonctionnalités marchent
- **Feature flags** pour rollback rapide si problème

### Compatibilité
- **Vérifier que tous les événements** sont bien gérés
- **S'assurer de la fiabilité** des unread counts
- **Tester les edge cases** de reconnexion

---

**Conclusion** : Notre architecture actuelle fonctionne mais n'est pas conforme aux patterns officiels Mattermost. Le refactoring vers un middleware Redux permettra une meilleure maintenabilité et conformité, tout en conservant les fonctionnalités existantes.