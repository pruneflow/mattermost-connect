import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Post } from '../../api/types';

export interface MessageUIState {
  editingPostId: string | null;
  replyToPost: Post | null;
  threadPostId: string | null;
  threadExpanded: boolean;
  selectedMessageIdForActions: string | null;
  selectedMessageIdForReactions: string | null;
  emojiPanelOpen: boolean;
  emojiPanelExpanded: boolean;
  emojiPanelInputId: string | null;
}

const initialState: MessageUIState = {
  editingPostId: null,
  replyToPost: null,
  threadPostId: null,
  threadExpanded: false,
  selectedMessageIdForActions: null,
  selectedMessageIdForReactions: null,
  emojiPanelOpen: false,
  emojiPanelExpanded: false,
  emojiPanelInputId: null,
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
    
    selectMessageForActions: (state, action: PayloadAction<string>) => {
      state.selectedMessageIdForActions = action.payload;
    },
    
    clearMessageActionSelection: (state) => {
      state.selectedMessageIdForActions = null;
    },
    
    selectMessageForReactions: (state, action: PayloadAction<string>) => {
      state.selectedMessageIdForReactions = action.payload;
    },
    
    clearMessageReactionSelection: (state) => {
      state.selectedMessageIdForReactions = null;
    },
    
    openEmojiPanel: (state, action: PayloadAction<string | undefined>) => {
      state.emojiPanelOpen = true;
      state.emojiPanelInputId = action.payload || null;
    },
    
    closeEmojiPanel: (state) => {
      state.emojiPanelOpen = false;
      state.selectedMessageIdForReactions = null;
      state.emojiPanelInputId = null;
    },
    
    toggleEmojiPanelSize: (state) => {
      state.emojiPanelExpanded = !state.emojiPanelExpanded;
    },
    
    clearAll: (state) => {
      state.editingPostId = null;
      state.replyToPost = null;
      state.threadPostId = null;
      state.threadExpanded = false;
      state.selectedMessageIdForActions = null;
      state.selectedMessageIdForReactions = null;
      state.emojiPanelOpen = false;
      state.emojiPanelExpanded = false;
      state.emojiPanelInputId = null;
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
  selectMessageForActions,
  clearMessageActionSelection,
  selectMessageForReactions,
  clearMessageReactionSelection,
  openEmojiPanel,
  closeEmojiPanel,
  toggleEmojiPanelSize,
  clearAll,
} = messageUISlice.actions;

export default messageUISlice.reducer;