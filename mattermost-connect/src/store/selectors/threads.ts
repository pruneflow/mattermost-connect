import { RootState } from '../index';

// Selectors for threads
export const selectThreads = (state: RootState) => state.threads.threads;

export const selectThread = (rootPostId: string) => (state: RootState) =>
  state.threads.threads[rootPostId];

export const selectThreadPosts = (rootPostId: string) => (state: RootState) =>
  state.threads.threads[rootPostId]?.posts || [];

export const selectIsThreadLoading = (rootPostId: string) => (state: RootState) =>
  state.threads.threads[rootPostId]?.loading || false;

export const selectThreadError = (rootPostId: string) => (state: RootState) =>
  state.threads.threads[rootPostId]?.error || null;

export const selectThreadHasNext = (rootPostId: string) => (state: RootState) =>
  state.threads.threads[rootPostId]?.hasNext || false;