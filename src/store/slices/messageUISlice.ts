import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Post } from '../../api/types';

export interface MessageUIState {
  editingPostId: string | null;
  replyToPost: Post | null;
  threadPostId: string | null;
  threadExpanded: boolean;
}

const initialState: MessageUIState = {
  editingPostId: null,
  replyToPost: null,
  threadPostId: null,
  threadExpanded: false,
};

/**
 * Redux slice to manage message UI state
 * Ensures only one message can be edited/replied to at a time
 * Manages Thread modal opening
 */
const messageUISlice = createSlice({
  name: 'messageUI',
  initialState,
  reducers: {
    startEdit: (state, action: PayloadAction<string>) => {
      state.editingPostId = action.payload;
      state.replyToPost = null;
    },
    
    stopEdit: (state) => {
      state.editingPostId = null;
    },
    
    startReply: (state, action: PayloadAction<Post>) => {
      state.replyToPost = action.payload;
      state.editingPostId = null;
    },
    
    stopReply: (state) => {
      state.replyToPost = null;
    },
    
    openThread: (state, action: PayloadAction<string>) => {
      state.threadPostId = action.payload;
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