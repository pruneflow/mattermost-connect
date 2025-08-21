import { RootState } from '../index';

export const selectEditingPostId = (state: RootState) => state.messageUI.editingPostId;
export const selectReplyToPost = (state: RootState) => state.messageUI.replyToPost;
export const selectThreadPostId = (state: RootState) => state.messageUI.threadPostId;
export const selectIsThreadExpanded = (state: RootState) => state.messageUI.threadExpanded;
export const selectSelectedMessageId = (state: RootState) => state.messageUI.selectedMessageId;
export const selectIsEmojiPanelOpen = (state: RootState) => state.messageUI.emojiPanelOpen;
export const selectIsEmojiPanelExpanded = (state: RootState) => state.messageUI.emojiPanelExpanded;

export const selectIsPostEditing = (postId: string) => (state: RootState) => 
  state.messageUI.editingPostId === postId;

export const selectIsReplyingToPost = (postId: string) => (state: RootState) => 
  state.messageUI.replyToPost?.id === postId;

export const selectIsThreadOpen = (postId: string) => (state: RootState) => 
  state.messageUI.threadPostId === postId;

export const selectIsAnyPostEditing = (state: RootState) => 
  state.messageUI.editingPostId !== null;

export const selectIsAnyReplyActive = (state: RootState) => 
  state.messageUI.replyToPost !== null;

export const selectIsAnyThreadOpen = (state: RootState) => 
  state.messageUI.threadPostId !== null;

export const selectIsMessageSelected = (postId: string) => (state: RootState) => 
  state.messageUI.selectedMessageId === postId;