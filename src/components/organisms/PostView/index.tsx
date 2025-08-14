/**
 * PostView module exports - virtualized message display and chat interface components
 * Provides complete chat functionality with virtual scrolling and message management
 */
export { ChatContainer } from './ChatContainer';
export { VirtualizedMessageList } from './MessageList/VirtualizedMessageList';
export { MessageItem } from './MessageList/MessageItem';
export { LoadMoreButton } from './MessageList/LoadMoreButton';
export { ScrollToBottomFab } from './MessageList/ScrollToBottomFab';
export { UnreadDivider } from './Dividers/UnreadDivider';
export { LoadingDivider } from './Dividers/LoadingDivider';

export type { ChatContainerProps } from './ChatContainer';
export type { MessageListProps } from './MessageList/VirtualizedMessageList';