import { RootState } from '../index';

// Selectors optimisés pour éviter les re-renders inutiles
export const selectEditingPostId = (state: RootState) => state.messageUI.editingPostId;
export const selectReplyToPost = (state: RootState) => state.messageUI.replyToPost;
export const selectThreadPostId = (state: RootState) => state.messageUI.threadPostId;
export const selectIsThreadExpanded = (state: RootState) => state.messageUI.threadExpanded;

// Selectors avec paramètres pour vérifier l'état d'un post spécifique
export const selectIsPostEditing = (postId: string) => (state: RootState) => 
  state.messageUI.editingPostId === postId;

export const selectIsReplyingToPost = (postId: string) => (state: RootState) => 
  state.messageUI.replyToPost?.id === postId;

export const selectIsThreadOpen = (postId: string) => (state: RootState) => 
  state.messageUI.threadPostId === postId;

// Selectors pour vérifier si une action est en cours (peu importe laquelle)
export const selectIsAnyPostEditing = (state: RootState) => 
  state.messageUI.editingPostId !== null;

export const selectIsAnyReplyActive = (state: RootState) => 
  state.messageUI.replyToPost !== null;

export const selectIsAnyThreadOpen = (state: RootState) => 
  state.messageUI.threadPostId !== null;