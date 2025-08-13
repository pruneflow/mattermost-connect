import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Post } from '../../api/types';

export interface MessageUIState {
  editingPostId: string | null;
  replyToPost: Post | null; // Post entier pour affichage dans MessageReply
  threadPostId: string | null; // ID du post root pour le modal Thread
  threadExpanded: boolean; // Si le thread modal est agrandi
}

const initialState: MessageUIState = {
  editingPostId: null,
  replyToPost: null,
  threadPostId: null,
  threadExpanded: false,
};

/**
 * Slice Redux pour gérer l'état UI des messages
 * S'assure qu'un seul message peut être édité/répondu à la fois
 * Gère l'ouverture du modal Thread
 */
const messageUISlice = createSlice({
  name: 'messageUI',
  initialState,
  reducers: {
    startEdit: (state, action: PayloadAction<string>) => {
      state.editingPostId = action.payload;
      state.replyToPost = null; // Auto-annule une réponse en cours
    },
    
    stopEdit: (state) => {
      state.editingPostId = null;
    },
    
    startReply: (state, action: PayloadAction<Post>) => {
      state.replyToPost = action.payload;
      state.editingPostId = null; // Auto-annule une édition en cours
    },
    
    stopReply: (state) => {
      state.replyToPost = null;
    },
    
    openThread: (state, action: PayloadAction<string>) => {
      state.threadPostId = action.payload;
      // Optionnel: fermer edit/reply quand on ouvre un thread
      // state.editingPostId = null;
      // state.replyToPost = null;
    },
    
    closeThread: (state) => {
      state.threadPostId = null;
      state.threadExpanded = false;
    },
    
    toggleThreadSize: (state) => {
      state.threadExpanded = !state.threadExpanded;
    },
    
    clearAll: (state) => {
      state.editingPostId = null;
      state.replyToPost = null;
      state.threadPostId = null;
      state.threadExpanded = false;
    },
  },
});

export const {
  startEdit,
  stopEdit,
  startReply,
  stopReply,
  openThread,
  closeThread,
  toggleThreadSize,
  clearAll,
} = messageUISlice.actions;

export default messageUISlice.reducer;