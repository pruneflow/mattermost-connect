// src/index.ts
/**
 * MattermostConnect - Bibliothèque de composants Mattermost intégrables
 *
 * Cette bibliothèque permet d'intégrer facilement des composants Mattermost
 * dans n'importe quelle application React.
 *
 * Architecture hybride:
 * - En interne: organisation modulaire avec services spécialisés
 * - En externe: API unifiée via Provider et hooks
 */

// ---------- API Principale ----------

// Exporter le Provider principal et le hook
export {
  MattermostProvider,
  useMattermost,
  MattermostContext,
  useUserContext,
  useConnection,
  useTeamContext,
  useMessageContext,
  useChannelContext,
} from "./context";

// ---------- Hooks Spécialisés ----------

// Exporter les hooks pour interagir avec les canaux, équipes et utilisateurs
export { useAuth, useFile, useRealtime } from "./hooks";

// ---------- Composants UI ----------

// Exporter les composants de canal
export { default as ChannelList } from "./components/channel/ChannelList/ChannelList";
export { default as ChannelItem } from "./components/channel/ChannelList/ChannelItem";
export { default as ChannelViewer } from "./components/channel/ChannelViewer/ChannelViewer";
export { default as ChannelHeader } from "./components/channel/ChannelViewer/components/ChannelHeader";

// Exporter les composants de message (avec alias pour éviter la duplication)
export { default as MessageComponent } from "./components/message/MessageViewer/Message";
export { default as MessageComposer } from "./components/message/MessageComposer/MessageComposer";

// Exporter les composants de sélection d'équipe
export { default as TeamSelector } from "./components/team/TeamSelector/TeamSelector";
export { default as TeamList } from "./components/team/TeamSelector/variants/TeamList";
export { default as TeamGrid } from "./components/team/TeamSelector/variants/TeamGrid";
export { default as TeamTabs } from "./components/team/TeamSelector/variants/TeamTabs";
export { default as TeamSidebar } from "./components/team/TeamSelector/variants/TeamSidebar";

// Navigation between Teams and Channles
export { default as TeamChannelNavigator } from "./components/navigation/TeamChannelNavigator";

export type {
  TeamSelectorVariant,
  TeamSelectorProps,
} from "./components/team/TeamSelector/TeamSelector";

// Exporter les composants d'emoji
export { default as EmojiPicker } from "./components/message/EmojiPicker/EmojiPicker";
export { PickerMode } from "./types/emoji.types";

// Exporter les composants de notification
export {
  NotificationSnackbar,
  NotificationCenter,
  TypingIndicator,
} from "./components/notification";

// ---------- Services et Utilitaires ----------

// Exporter uniquement les factory et types publics des services
export { createServiceContainer } from "./services/factory";

// Exporter les types de notification et événements WebSocket
export {
  WebSocketEventType,
  type Notification,
  type WebSocketEvent,
  type UnreadState,
} from "./services/notification";

// Exporter le thème
export { createDefaultTheme, MattermostThemeProvider } from "./theme";

// Exporter les utilitaires de formatage
export {
  formatMessageText,
  formatTimestamp,
  truncateText,
  getInitials,
  generateColorFromString,
  getTeamInitials,
  formatTeamName,
  formatUserDisplayName,
} from "./utils/formatting";

// ---------- Types Publics ----------

// Exporter les types principaux
export type {
  // Types entité
  Channel,
  Team,
  User,
  Message,
  MessageAttachment,
  MessageReaction,

  // Types configuration
  ProviderConfig,
  DirectModeConfig,
  ProxyModeConfig,
  CustomModeConfig,
  ProviderOptions,
  // Types emoji/GIF
  GifData,

  // Types WebSocket
  WebSocketConnection,
  WebSocketSetupOptions,
} from "./types";

// Exporter le composant d'authentification
export { default as AuthenticationSystem } from "./components/auth/AuthenticationSystem";

// Exporter les types des hooks
export type { FileInfo, UploadingFile, AuthResult } from "./hooks";

// Export par défaut est le provider pour plus de commodité
export { MattermostProvider as default } from "./context";
