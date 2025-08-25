import { RootState } from '../index';

export const selectEditingPostId = (state: RootState) => state.messageUI.editingPostId;
export const selectReplyToPost = (state: RootState) => state.messageUI.replyToPost;
export const selectThreadPostId = (state: RootState) => state.messageUI.threadPostId;
export const selectIsThreadExpanded = (state: RootState) => state.messageUI.threadExpanded;
export const selectSelectedMessageIdForActions = (state: RootState) => state.messageUI.selectedMessageIdForActions;
export const selectSelectedMessageIdForReactions = (state: RootState) => state.messageUI.selectedMessageIdForReactions;
export const selectIsEmojiPanelOpen = (state: RootState) => state.messageUI.emojiPanelOpen;
export const selectIsEmojiPanelExpanded = (state: RootState) => state.messageUI.emojiPanelExpanded;
export const selectEmojiPanelInputId = (state: RootState) => state.messageUI.emojiPanelInputId;

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

export const selectIsMessageSelectedForActions = (postId: string) => (state: RootState) => 
  state.messageUI.selectedMessageIdForActions === postId;

export const selectIsMessageSelectedForReactions = (postId: string) => (state: RootState) => 
  state.messageUI.selectedMessageIdForReactions === postId;