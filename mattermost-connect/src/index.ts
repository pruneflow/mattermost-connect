// src/index.ts
// Main entry point for the library

// Export context and provider
export {
  MattermostProvider,
  useMattermost,
  MattermostContext,
} from "./context/MattermostProvider";

// Export components
export { default as ChannelList } from "./components/ChannelList/ChannelList";
export { default as ChannelItem } from "./components/ChannelList/ChannelItem";
export { default as ChannelViewer } from "./components/ChannelViewer/ChannelViewer";
export { default as ChannelHeader } from "./components/ChannelViewer/ChannelHeader";
export { default as Message } from "./components/ChannelViewer/Message";
export { default as MessageAttachment } from "./components/ChannelViewer/MessageAttachment";
export { default as MessageComposer } from "./components/MessageComposer/MessageComposer";
export { default as AttachmentPreview } from "./components/MessageComposer/AttachmentPreview";

// Export Team Selection components
export { default as TeamSelector } from "./components/TeamSelector/TeamSelector";
export { default as TeamList } from "./components/TeamSelector/variants/TeamList";
export { default as TeamGrid } from "./components/TeamSelector/variants/TeamGrid";
export { default as TeamTabs } from "./components/TeamSelector/variants/TeamTabs";
export { default as TeamSidebar } from "./components/TeamSelector/variants/TeamSidebar";

export type {
  TeamSelectorVariant,
  TeamSelectorProps,
} from "./components/TeamSelector/TeamSelector";

// Export theme
export { createDefaultTheme, MattermostThemeProvider } from "./theme";

// Export services
export { createDirectService, createProxyService } from "./services";

// Export utilities
export {
  formatMessageText,
  formatTimestamp,
  truncateText,
  getInitials,
  generateColorFromString,
} from "./utils/formatting";

export { MattermostAPI } from "./utils/api-helpers";

// Export types
export * from "./types";

// Default export is the provider for convenience
export { MattermostProvider as default } from "./context/MattermostProvider";
