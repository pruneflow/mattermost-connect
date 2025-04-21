// src/context/index.ts
/**
 * Exports all contexts and providers from the library
 * For easy imports and ensuring consistency
 */

// Main MattermostProvider (acts as the root provider)
export {
  MattermostProvider,
  useMattermost,
  MattermostContext,
  type MattermostContextType,
} from "./MattermostProvider";

// Specialized context providers
export {
  ConnectionProvider,
  useConnection,
  ConnectionContext,
  type ConnectionContextType,
  type ConnectionProviderProps,
} from "./ConnectionContext";

export {
  UserProvider,
  useUserContext,
  UserContext,
  type UserContextType,
  type UserProviderProps,
} from "./UserContext";

export {
  TeamProvider,
  useTeamContext,
  TeamContext,
  type TeamContextType,
  type TeamProviderProps,
} from "./TeamContext";

export {
  ChannelProvider,
  useChannelContext,
  ChannelContext,
  type ChannelContextType,
  type ChannelProviderProps,
  type GetMessagesOptions,
} from "./ChannelContext";

export {
  MessageProvider,
  useMessageContext,
  MessageContext,
  type MessageContextType,
  type MessageProviderProps,
} from "./MessageContext";

// Legacy context exports for backward compatibility
export { EmojiProvider, useEmoji, EmojiContext } from "./EmojiProvider";
