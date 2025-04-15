// src/index.ts
// Fichier d'entrée principal pour la bibliothèque

// Exporter le context et le provider
export {
  MattermostProvider,
  useMattermost,
  MattermostContext,
} from "./context/MattermostProvider";

// Exporter les composants
export { default as ChannelList } from "./components/channel/ChannelList/ChannelList";
export { default as ChannelItem } from "./components/channel/ChannelList/ChannelItem";
export { default as ChannelViewer } from "./components/channel/ChannelViewer/ChannelViewer";
export { default as ChannelHeader } from "./components/channel/ChannelViewer/components/ChannelHeader";
export { default as Message } from "./components/message/MessageViewer/Message";
export { default as MessageComposer } from "./components/message/MessageComposer/MessageComposer";

// Exporter les composants de sélection d'équipe
export { default as TeamSelector } from "./components/team/TeamSelector/TeamSelector";
export { default as TeamList } from "./components/team/TeamSelector/variants/TeamList";
export { default as TeamGrid } from "./components/team/TeamSelector/variants/TeamGrid";
export { default as TeamTabs } from "./components/team/TeamSelector/variants/TeamTabs";
export { default as TeamSidebar } from "./components/team/TeamSelector/variants/TeamSidebar";

export type {
  TeamSelectorVariant,
  TeamSelectorProps,
} from "./components/team/TeamSelector/TeamSelector";

// Exporter les composants d'emoji
export { default as EmojiProvider } from "./context/EmojiProvider";
export { useEmoji } from "./context/EmojiProvider";
export { default as EmojiPicker } from "./components/message/EmojiPicker/EmojiPicker";
export { PickerMode } from "./types/emoji.types";

// Exporter les composants de notification
export {
  NotificationSnackbar,
  NotificationCenter,
  TypingIndicator,
} from "./components/notification";
export {
  notificationService,
  WebSocketEventType,
} from "./services/notification.service";
export type {
  Notification,
  WebSocketEvent,
  UnreadState,
} from "./services/notification.service";

// Exporter le thème
export { createDefaultTheme, MattermostThemeProvider } from "./theme";

// Exporter les services
export { createMattermostService, createMockService } from "./services";

// Exporter les utilitaires
export {
  formatMessageText,
  formatTimestamp,
  truncateText,
  getInitials,
  generateColorFromString,
  getTeamInitials,
  formatTeamName,
} from "./utils/formatting";

// Exporter les types
export * from "./types";

export { default as AuthenticationSystem } from "./components/auth/AuthenticationSystem";

// Export par défaut est le provider pour plus de commodité
export { MattermostProvider as default } from "./context/MattermostProvider";
