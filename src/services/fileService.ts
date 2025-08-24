import { store } from '../store';
import { 
  fetchFileInfosForPost,
  downloadFile,
  generatePublicLink
} from '../store/slices/filesSlice';
import {
  selectFileInfoById,
  selectIsFileDownloadingById,
  selectFilePublicLinkById
} from '../store/selectors/filesSelectors';

export const fetchAllFiles = async (postId: string, fileIds: string[], force = false): Promise<void> => {
  if (!postId || !fileIds || fileIds.length === 0) return;
  
  try {
    await store.dispatch(fetchFileInfosForPost({ postId, fileIds, force })).unwrap();
  } catch (error) {
  }
};

// File action functions
export const canDownload = (fileId: string): boolean => {
  const state = store.getState();
  const fileInfo = selectFileInfoById(state, fileId);
  return Boolean(fileInfo);
};

export const download = async (fileId: string, fileName?: string): Promise<boolean> => {
  
  const state = store.getState();
  const fileInfo = selectFileInfoById(state, fileId);
  
  if (!fileInfo) {
    console.warn('📥 fileService.download: No fileInfo found for fileId:', fileId);
    return false;
  }
  
  try {
    const finalFileName = fileName || fileInfo.name;
    
    const result = await store.dispatch(downloadFile({ 
      fileId, 
      fileName: finalFileName 
    })).unwrap();
    return true;
  } catch (error) {
    return false;
  }
};

export const isDownloading = (fileId: string): boolean => {
  const state = store.getState();
  return selectIsFileDownloadingById(state, fileId);
};

export const hasPublicLink = (fileId: string): boolean => {
  const state = store.getState();
  const publicLink = selectFilePublicLinkById(state, fileId);
  return Boolean(publicLink);
};

export const copyPublicLinkToClipboard = async (fileId: string): Promise<boolean> => {
  
  const state = store.getState();
  let publicLink = selectFilePublicLinkById(state, fileId);
  
  if (!publicLink) {
    try {
      
      const result = await store.dispatch(generatePublicLink({ fileId })).unwrap();
      publicLink = result.publicLink;
    } catch (error) {
      return false;
    }
  }
  
  try {
    
    await navigator.clipboard.writeText(publicLink);

    return true;
  } catch (error) {
    return false;
  }
};