# PLAN DE REFACTORISATION MATTERMOST-CONNECT

## 🎯 **OBJECTIF PRINCIPAL**

Refactoriser **complètement** la librairie en gardant le **même scope fonctionnel** mais avec une architecture inspirée de **Mattermost officiel** :

- **Architecture Redux identique** à Mattermost (patterns, organisation, API)
- **Fidélité Mattermost exacte** (comportements, UX, endpoints API)
- **UI componentisée** (atoms/molecules, props minimales, customisation)
- **Performance optimisée** (pas de re-renders inutiles, cache intelligent)

---

## 🏗️ **ARCHITECTURE REDUX MATTERMOST**

### **Redux Toolkit (Migration de l'architecture legacy)**

**Choix technique** : Redux Toolkit au lieu du Redux classique Mattermost pour :
- ✅ **DevTools** : Debug et time-travel essentiels
- ✅ **RTK Query** : Cache API intelligent (remplacement actions/selectors custom)
- ✅ **Performance** : React-Redux optimisé
- ✅ **TypeScript** : Support natif excellent
- ✅ **Simplicité** : Moins de boilerplate que Redux classique

### **Structure Store Inspirée Mattermost**

```typescript
// store/index.ts - Configuration inspirée configureServiceStore()
const store = configureStore({
  reducer: {
    // Structure exacte Mattermost
    entities: entitiesSlice.reducer,    // users, channels, posts, teams
    views: viewsSlice.reducer,          // UI state, current selections
    errors: errorsSlice.reducer,        // Error handling
    requests: requestsSlice.reducer     // Loading states
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']  // WebSocket actions
      }
    }).concat(
      apiSlice.middleware,  // RTK Query
      websocketMiddleware   // Custom WebSocket
    )
});
```

### **Entities Structure (Pattern Mattermost)**

```typescript
// État identique à mattermost-redux
entities: {
  users: {
    currentUserId: string,
    profiles: { [userId]: User },
    profilesInChannel: { [channelId]: string[] },
    statuses: { [userId]: UserStatus }
  },
  teams: {
    currentTeamId: string,
    teams: { [teamId]: Team },
    myMembers: { [teamId]: TeamMember }
  },
  channels: {
    currentChannelId: string,
    channels: { [channelId]: Channel },
    myMembers: { [channelId]: ChannelMember },
    channelsInTeam: { [teamId]: string[] }
  },
  posts: {
    posts: { [postId]: Post },
    postsInChannel: { [channelId]: string[] },
    postsInThread: { [threadId]: string[] }
  }
}
```

---

## 🧱 **ARCHITECTURE COMPOSANTS**

### **Pattern Props Standard**

```typescript
// Interface pour tous les composants
interface BaseComponentProps {
  // Props fonctionnelles minimales
  variant?: string;
  size?: 'sm' | 'md' | 'lg';
  
  // Customisation développeur (Material-UI style)
  sx?: SxProps;           // Inline styles
  className?: string;     // CSS classes custom
  
  // Events uniquement si nécessaire
  onClick?: () => void;
  children?: ReactNode;
}
```

### **Hiérarchie Composants**

```
src/components/
├── atoms/              # Composants de base purs (display only)
│   ├── Button/
│   ├── TextInput/
│   ├── UserAvatar/
│   ├── StatusBadge/
│   ├── Icon/
│   ├── UnreadBadge/
│   └── ...
├── molecules/          # Groupes logiques d'atoms
│   ├── UserCard/
│   ├── ChannelItem/
│   ├── MessageHeader/
│   ├── MessageBody/
│   └── ...
├── organisms/          # Sections complètes connectées au store
│   ├── LoginForm/
│   ├── UserMenu/
│   ├── TeamList/
│   ├── ChannelList/
│   ├── MessageList/
│   ├── MessageThread/
│   └── ...
└── templates/          # Layouts et structures
    ├── AppLayout/
    ├── ChatLayout/
    └── ...
```

---

## 📊 **SCOPE FONCTIONNEL COMPLET**

### **Features à Implémenter (Même scope que src-old/)**

1. **Auth** : Login/Logout + UserMenu + UserProfile + Status management
2. **Teams** : TeamList + Team switching + Unread badges
3. **Channels** : ChannelList + ChannelHeader + Navigation + Search
4. **Messages** : MessageList + MessageInput + Pagination + Actions
5. **Threads** : MessageThread + Replies + Navigation + Real-time sync
6. **Real-time** : WebSocket + Typing indicators + Presence + Notifications
7. **UI Common** : UserAvatar + StatusIndicator + UnreadBadge + Loading states

### **API Endpoints Mattermost Exacts**

```typescript
// Endpoints identiques à l'API officielle
Auth:
- POST /api/v4/users/login
- GET /api/v4/users/me
- POST /api/v4/users/logout

Teams:
- GET /api/v4/users/me/teams
- GET /api/v4/users/{user_id}/teams/unread

Channels:
- GET /api/v4/users/me/channels
- GET /api/v4/channels/{channel_id}/posts/unread?limit_before=30&limit_after=30
- GET /api/v4/users/{user_id}/channels/{channel_id}/unread

Messages:
- GET /api/v4/channels/{channel_id}/posts
- POST /api/v4/posts
- GET /api/v4/posts/{post_id}/thread

WebSocket:
- WSS /api/v4/websocket
- Events: posted, channel_viewed, user_updated, typing, etc.
```

---

## 🚀 **PLAN COMPLET PAR PHASES TESTABLES**

### **Phase 1 : Foundation + Auth**
**Objectif** : Store Redux + API Client + LoginForm fonctionnel  
**Durée estimée** : 1-2 jours

**Livrables** :
```typescript
src/
├── store/
│   ├── index.ts              # Store principal Redux Toolkit
│   ├── slices/
│   │   ├── authSlice.ts      # Auth state + actions
│   │   ├── entitiesSlice.ts  # Entities normalisées
│   │   └── viewsSlice.ts     # UI state
│   └── middleware/
│       └── api.ts            # RTK Query API slice
├── api/
│   ├── client.ts             # Client API (inspiré Client4)
│   ├── types.ts              # Types API officiels
│   └── endpoints.ts          # Endpoints configuration
├── components/
│   ├── atoms/
│   │   ├── Button.tsx
│   │   ├── TextInput.tsx
│   │   └── index.ts
│   └── organisms/
│       ├── LoginForm.tsx     # Form connecté au store
│       └── index.ts
├── hooks/
│   ├── useAppSelector.ts     # Typed selector
│   ├── useAppDispatch.ts     # Typed dispatch
│   └── useAuth.ts            # Auth logic hook
└── index.ts                  # Export principal
```

**Test** : Démo login/logout identique à l'actuel

---

### **Phase 2 : Teams + User Management**
**Objectif** : Navigation teams + UserMenu + UserProfile complets  
**Durée estimée** : 2-3 jours

**Livrables** :
```typescript
src/components/
├── atoms/
│   ├── UserAvatar.tsx        # Avatar utilisateur réutilisable
│   ├── StatusBadge.tsx       # Badge de statut
│   ├── Dropdown.tsx          # Dropdown générique
│   └── UnreadBadge.tsx       # Badge unread count
├── molecules/
│   ├── UserCard.tsx          # Avatar + Name + Status
│   ├── TeamItem.tsx          # Item team dans liste
│   └── StatusSelector.tsx    # Sélecteur de statut
├── organisms/
│   ├── TeamList.tsx          # Liste teams + navigation
│   ├── UserMenu.tsx          # Menu utilisateur complet
│   └── UserProfile.tsx       # Profil utilisateur éditable
└── hooks/
    ├── useTeams.ts           # Teams logic
    ├── useUsers.ts           # Users logic
    └── useUserStatus.ts      # User status logic
```

**Test** : Démo avec teams navigation + user management complet

---

### **Phase 3 : Channels + Navigation**
**Objectif** : ChannelList + ChannelHeader + Navigation complète  
**Durée estimée** : 2-3 jours

**Livrables** :
```typescript
src/components/
├── atoms/
│   ├── ChannelIcon.tsx       # Icônes channels (public/private/dm)
│   ├── SearchInput.tsx       # Input recherche
│   └── TypingDots.tsx        # Animation typing
├── molecules/
│   ├── ChannelItem.tsx       # Item channel avec unread
│   ├── ChannelHeader.tsx     # Header channel avec actions
│   ├── SearchBar.tsx         # Barre recherche avec filtres
│   └── TypingIndicator.tsx   # Indicateur utilisateurs qui tapent
├── organisms/
│   ├── ChannelList.tsx       # Liste channels + DMs + groupes
│   ├── Sidebar.tsx           # Sidebar avec teams + channels
│   └── AppLayout.tsx         # Layout principal application
└── hooks/
    ├── useChannels.ts        # Channels logic
    ├── useChannelSearch.ts   # Recherche channels
    └── useUnreadCounts.ts    # Compteurs unread
```

**Test** : Démo navigation teams/channels complète + unread counts

---

### **Phase 4 : Messages + Core Chat**
**Objectif** : Chat fonctionnel avec envoi/réception messages  
**Durée estimée** : 3-4 jours

**Livrables** :
```typescript
src/components/
├── atoms/
│   ├── MessageText.tsx       # Texte message avec markdown
│   ├── Timestamp.tsx         # Timestamp formaté
│   ├── EmojiButton.tsx       # Bouton emoji/réaction
│   └── FileIcon.tsx          # Icône fichier
├── molecules/
│   ├── MessageHeader.tsx     # Header message (user + time)
│   ├── MessageBody.tsx       # Corps message (texte + attachments)
│   ├── MessageActions.tsx    # Actions message (reply/react/more)
│   ├── MessageReactions.tsx  # Réactions sur message
│   └── MessageComposer.tsx   # Composer message avec actions
├── organisms/
│   ├── MessageList.tsx       # Liste messages avec pagination
│   ├── MessageInput.tsx      # Input envoi message
│   └── ChatArea.tsx          # Zone chat complète
└── hooks/
    ├── useMessages.ts        # Messages logic
    ├── useMessageActions.ts  # Actions sur messages
    └── usePagination.ts      # Pagination logic
```

**Test** : Démo chat fonctionnel avec envoi/réception + actions

---

### **Phase 5 : Threads + WebSocket Real-time**
**Objectif** : Threads complets + WebSocket manager + Temps réel  
**Durée estimée** : 3-4 jours

**Livrables** :
```typescript
src/
├── websocket/
│   ├── manager.ts            # WebSocket manager central
│   ├── eventHandlers.ts      # Handlers événements spécialisés
│   └── middleware.ts         # Redux middleware WebSocket
├── components/
│   ├── molecules/
│   │   ├── ThreadPreview.tsx # Preview thread dans message
│   │   ├── ThreadHeader.tsx  # Header thread avec parent
│   │   └── ThreadReply.tsx   # Reply dans thread
│   └── organisms/
│       ├── MessageThread.tsx # Interface thread complète
│       ├── ThreadSidebar.tsx # Sidebar thread desktop
│       └── ThreadOverlay.tsx # Overlay thread mobile
└── hooks/
    ├── useWebSocket.ts       # WebSocket connection
    ├── useThreads.ts         # Threads logic
    ├── useTyping.ts          # Typing indicators
    └── usePresence.ts        # User presence
```

**Test** : Démo complète avec threads + temps réel fonctionnel

---

### **Phase 6 : Polish + Performance + Mobile**
**Objectif** : Optimisations + Responsive + Edge cases  
**Durée estimée** : 2-3 jours

**Livrables** :
- Optimisations performance (memoization, virtualization)
- Responsive design et adaptation mobile
- Gestion des edge cases et erreurs
- Tests et documentation
- Build final optimisé

**Test** : Démo production-ready avec toutes les fonctionnalités

---

## ✅ **VALIDATION APRÈS CHAQUE PHASE**

### **Checklist Obligatoire**

Après chaque phase :
1. **Build** : `pnpm run build` sans erreurs TypeScript/Lint
2. **Demo** : `pnpm run demo` fonctionnel avec nouvelles features
3. **TypeScript** : `pnpm run typecheck` ✅ (strict mode)
4. **Lint** : `pnpm run lint` ✅ (ESLint + Prettier)
5. **Fonctionnel** : Feature complètement testable dans la démo
6. **Performance** : Pas de re-renders excessifs (React DevTools)

### **Tests d'Intégration**

- **Auth** : Login/logout + persistence token
- **Navigation** : Teams/channels switching fluide
- **Messages** : Envoi/réception + pagination
- **Threads** : Ouverture/fermeture + réponses
- **Real-time** : WebSocket events + typing indicators
- **Mobile** : Interface responsive fonctionnelle

---

## 📚 **RESSOURCES MATTERMOST OFFICIELLES**

### **Documentation de Référence**
- **Redux Architecture** : https://developers.mattermost.com/contribute/more-info/webapp/redux/
- **API Documentation** : https://api.mattermost.com/
- **WebSocket Events** : https://docs.mattermost.com/developer/websocket-api.html
- **mattermost-redux** : https://github.com/mattermost/mattermost-redux

### **Patterns à Suivre**
- **Actions/Selectors** : Inspirés de mattermost-redux patterns
- **API Endpoints** : Identiques à l'API officielle v4
- **WebSocket Events** : Même format et handling que Mattermost
- **State Normalization** : Structure entities identique
- **Error Handling** : Patterns Mattermost pour erreurs API

---

## 🎯 **CRITÈRES DE SUCCÈS**

### **Fonctionnel**
- ✅ Toutes les fonctionnalités de src-old/ reproduites
- ✅ Fidélité 100% aux comportements Mattermost
- ✅ Performance égale ou supérieure à l'existant
- ✅ API calls optimisés (pas de redondance)

### **Technique**
- ✅ Architecture Redux propre et maintenable
- ✅ Composants réutilisables et customisables
- ✅ TypeScript strict sans erreurs
- ✅ Code coverage des hooks/actions principales

### **UX**
- ✅ Interface responsive (mobile + desktop)
- ✅ Temps de réponse fluides
- ✅ Gestion d'erreurs utilisateur-friendly
- ✅ Accessibilité de base (a11y)

---

**Ce plan constitue la feuille de route complète pour la refactorisation. Chaque phase est indépendante et testable, permettant une validation continue et un développement itératif sûr.**