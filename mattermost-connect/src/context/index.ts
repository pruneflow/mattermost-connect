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

export {
  AuthProvider,
  useAuth,
  AuthContext,
  type AuthContextType,
  useAuthenticatedContent,
  withAuthentication,
} from "./AuthContext";

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
  useTeamLoading,
  useTeamState,
  useTeamUnread,
} from "./TeamContext";

export {
  ChannelProvider,
  useChannelContext,
  useChannelState,
  useChannelUnread,
  useChannelLoading,
} from "./ChannelContext";

export {
  MessageProvider,
  useMessageContext,
  MessageContext,
  type MessageContextType,
  type MessageProviderProps,
  type GetMessagesOptions,
} from "./MessageContext";

// Legacy context exports for backward compatibility
export { EmojiProvider, useEmoji, EmojiContext } from "./EmojiProvider";
